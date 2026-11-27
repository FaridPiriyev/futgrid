// Fills the gap in coach ↔ player links before ~2012.
//
// The match-based source only knows coaches from roughly 2012 onwards, so e.g. Messi was not
// linked to Guardiola, Rooney to Ferguson, Sneijder to Mourinho. coach-history.json lists the
// famous head-coach spells that are missing; this script adds them to coaches.json and adds the
// coach to every player whose club spell overlaps one of them by at least `minOverlapDays`.
// Only adds links, never removes, and is safe to run repeatedly.
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

  const spells = [];
  for (const [coachId, list] of Object.entries(history.stints ?? {})) {
    const coach = coachById.get(coachId);
    if (!coach) {
      unknown.push(`coach:${coachId}`);
      continue;
    }
    coach.stints ??= [];
    for (const [clubName, from, to] of list) {
      const id = clubId.get(clubName);
      if (!id) {
        unknown.push(`club:${clubName}`);
        continue;
      }
      spells.push({ coachId, club_id: id, from, to });
      const dup = coach.stints.some((s) => s.club_id === id && s.from === from);
      if (!dup) {
        coach.stints.push({ club_id: id, from, to, source: "manual" });
        stintsAdded++;
      }
    }
    coach.stints.sort((a, b) => (a.from ?? "").localeCompare(b.from ?? ""));
  }

  const spellsByClub = new Map();
  for (const s of spells) {
    if (!spellsByClub.has(s.club_id)) spellsByClub.set(s.club_id, []);
    spellsByClub.get(s.club_id).push(s);
  }

  // A player spell needs a real start date. A missing end date is only trusted for the
  // player's current club; otherwise it ends where the next spell starts (youth/undated
  // entries would otherwise "overlap" with every coach in the club's history).
  const datedSpells = (p) => {
    const list = (p.club_stints ?? []).filter((s) => s.from);
    return list.map((s, i) => {
      if (s.to) return s;
      const next = list.slice(i + 1).find((n) => n.from > s.from);
      if (next) return { ...s, to: next.from };
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
  return { stintsAdded, links, unknown: [...new Set(unknown)] };
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
      `${dir}: +${result.links} oyunçu–məşqçi əlaqəsi, +${result.stintsAdded} məşqçi dövrü` +
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
