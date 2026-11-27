// Fills the gaps in coach ↔ player links that the match-based source leaves.
//
// 1. Before ~2012 the source knows no coaches, so e.g. Messi was not linked to Guardiola,
//    Rooney to Ferguson, Sneijder to Mourinho  → coach-history.json "stints".
// 2. The source's coach data stops at the end of 2025/26, while players are newer. Summer 2026
//    moves were missing, e.g. Mourinho → Real Madrid, so Arda Güler was not linked to him
//    → coach-history.json "recent" (current jobs, kept up to date by hand) and "close".
// 3. Spells that ended but were still open in the source (Xabi Alonso "still" at Real Madrid)
//    are closed when the coach or the club has a later spell.
//
// The coach is added to every player whose club spell overlaps one of the manual spells by at
// least `minOverlapDays`. Only adds links, never removes, and is safe to run repeatedly.
//
// Usage (from futgrid_app/):  node scripts/apply-coach-history.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DAY = 24 * 60 * 60 * 1000;
const far = "2099-12-31";

const overlapDays = (a1, a2, b1, b2) => {
  const start = Math.max(Date.parse(a1 ?? "1900-01-01"), Date.parse(b1 ?? "1900-01-01"));
  const end = Math.min(Date.parse(a2 ?? far), Date.parse(b2 ?? far));
  return (end - start) / DAY;
};

/** Mutates players and coaches in place; returns counts for logging. */
export function applyCoachHistory({ players, coaches, clubs, history }) {
  const clubId = new Map(clubs.map((c) => [c.name, c.id]));
  const coachById = new Map(coaches.map((c) => [c.id, c]));
  const min = history.minOverlapDays ?? 120;
  const unknown = [];
  let stintsAdded = 0;
  let links = 0;

  let closed = 0;
  const spells = [];
  const addSpells = (map, authoritative) => {
    for (const [coachId, list] of Object.entries(map ?? {})) {
      const coach = coachById.get(coachId);
      if (!coach) {
        unknown.push(`coach:${coachId}`);
        continue;
      }
      coach.stints ??= [];
      for (const [clubName, from, to = null] of list) {
        const id = clubId.get(clubName);
        if (!id) {
          unknown.push(`club:${clubName}`);
          continue;
        }
        spells.push({ coachId, club_id: id, from, to });
        const same = coach.stints.find(
          (s) => s.club_id === id && (s.from === from || (authoritative && overlapDays(s.from, s.to, from, to) > 0)),
        );
        if (!same) {
          coach.stints.push(to ? { club_id: id, from, to, source: "manual" } : { club_id: id, from, source: "manual" });
          stintsAdded++;
        } else if (authoritative) {
          // The hand-kept list wins over the source's end date (often just its last match).
          if (to) same.to = to;
          else delete same.to;
        }
      }
    }
  };
  addSpells(history.stints, false);
  addSpells(history.recent?.stints, true);

  for (const [coachId, list] of Object.entries(history.recent?.close ?? {})) {
    const coach = coachById.get(coachId);
    if (!coach) {
      unknown.push(`coach:${coachId}`);
      continue;
    }
    for (const [clubName, to] of list) {
      const id = clubId.get(clubName);
      if (!id) {
        unknown.push(`club:${clubName}`);
        continue;
      }
      for (const s of coach.stints ?? []) {
        if (s.club_id === id && s.from < to && (!s.to || s.to > to)) {
          s.to = to;
          closed++;
        }
      }
    }
  }

  // Open spells that clearly ended: the coach started somewhere later, or another coach took
  // over the same club later (ignoring 1–2 match caretakers).
  const laterAtClub = new Map();
  for (const c of coaches)
    for (const s of c.stints ?? []) {
      if (!s.from || (s.source !== "manual" && (s.games ?? 0) < 3)) continue;
      if (!laterAtClub.has(s.club_id)) laterAtClub.set(s.club_id, []);
      laterAtClub.get(s.club_id).push({ coachId: c.id, from: s.from });
    }
  for (const c of coaches) {
    for (const s of c.stints ?? []) {
      if (s.to || !s.from) continue;
      const ends = [
        ...(c.stints ?? []).filter((o) => o !== s && o.from > s.from).map((o) => o.from),
        ...(laterAtClub.get(s.club_id) ?? []).filter((o) => o.coachId !== c.id && o.from > s.from).map((o) => o.from),
      ];
      if (ends.length) {
        s.to = ends.sort()[0];
        closed++;
      }
    }
    c.stints?.sort((a, b) => (a.from ?? "").localeCompare(b.from ?? ""));
    const open = (c.stints ?? []).filter((s) => !s.to && s.from).at(-1);
    if (open) c.current_club_id = open.club_id;
    else delete c.current_club_id;
  }

  const spellsByClub = new Map();
  for (const s of spells) {
    if (!spellsByClub.has(s.club_id)) spellsByClub.set(s.club_id, []);
    spellsByClub.get(s.club_id).push(s);
  }

  // A player spell needs a real start date. A missing end date is only trusted for the
  // player's current club; otherwise it ends where the next spell starts (youth/undated
  // entries would otherwise "overlap" with every coach in the club's history).
  //
  // Transfers the source could not date carry the date of the data sync instead (thousands of
  // moves on one day, e.g. 2026-10-23). Such an end date is not trusted: the move happened in
  // that transfer window, so the spell is cut at the window's start. Otherwise a player sold in
  // August would "overlap" a coach who arrived in July.
  const fromCount = new Map();
  for (const p of players)
    for (const s of p.club_stints ?? []) if (s.from) fromCount.set(s.from, (fromCount.get(s.from) ?? 0) + 1);
  const syncDates = new Set(
    [...fromCount].filter(([d, n]) => n >= 1000 && !/-(06-30|07-01|01-01)$/.test(d)).map(([d]) => d),
  );
  const windowStart = (d) => (Number(d.slice(5, 7)) >= 6 ? `${d.slice(0, 4)}-06-01` : `${d.slice(0, 4)}-01-01`);
  const trustedEnd = (to) => (to && syncDates.has(to) ? windowStart(to) : to);

  const datedSpells = (p) => {
    const list = (p.club_stints ?? []).filter((s) => s.from);
    return list.map((s, i) => {
      if (s.to) return { ...s, to: trustedEnd(s.to) };
      const next = list.slice(i + 1).find((n) => n.from > s.from);
      if (next) return { ...s, to: trustedEnd(next.from) };
      return p.current_club_id === s.club_id && p.is_active !== false ? s : null;
    }).filter(Boolean);
  };

  const playersPerCoach = new Map();
  for (const p of players) {
    for (const stint of datedSpells(p)) {
      for (const spell of spellsByClub.get(stint.club_id) ?? []) {
        if (overlapDays(stint.from, stint.to, spell.from, spell.to) < min) continue;
        p.coach_ids ??= [];
        if (!p.coach_ids.includes(spell.coachId)) {
          p.coach_ids.push(spell.coachId);
          links++;
          playersPerCoach.set(spell.coachId, (playersPerCoach.get(spell.coachId) ?? 0) + 1);
        }
      }
    }
  }
  for (const [id, n] of playersPerCoach) {
    const coach = coachById.get(id);
    coach.players_count = (coach.players_count ?? 0) + n;
  }
  return { stintsAdded, closed, links, unknown: [...new Set(unknown)] };
}

const readJson = async (p) => JSON.parse((await readFile(p, "utf8")).replace(/^﻿/, ""));
const writeJson = (p, v) => writeFile(p, JSON.stringify(v, null, 2) + "\n", "utf8");

async function main() {
  const root = process.cwd();
  const historyPath = path.resolve(root, "../packages/game-core/data/coach-history.json");
  const history = await readJson(historyPath);
  const targets = [path.resolve(root, "public/data"), path.resolve(root, "../packages/game-core/data")];
  for (const dir of targets) {
    const [players, coaches, clubs] = await Promise.all([
      readJson(path.join(dir, "players.json")),
      readJson(path.join(dir, "coaches.json")),
      readJson(path.join(dir, "clubs.json")),
    ]);
    const result = applyCoachHistory({ players, coaches, clubs, history });
    await writeJson(path.join(dir, "players.json"), players);
    await writeJson(path.join(dir, "coaches.json"), coaches);
    console.log(
      `${dir}: +${result.links} oyunçu–məşqçi əlaqəsi, +${result.stintsAdded} məşqçi dövrü, ${result.closed} bitmiş dövr bağlandı` +
        (result.unknown.length ? ` · tapılmadı: ${result.unknown.join(", ")}` : ""),
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
