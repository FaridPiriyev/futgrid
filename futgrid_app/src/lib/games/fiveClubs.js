export const TIME = { get 60() {
    return tr("1 dəq");
  }, get 120() {
    return tr("2 dəq");
  }, get 180() {
    return tr("3 dəq");
  } };
import { clubFameReady, clubFameTier, playerFame } from "./fame";

import { tr } from "../../i18n";
export const CLUB_POOL = { easy: 24, normal: 45, hard: 140 };
const MAX_TIER = { easy: 1, normal: 2, hard: 3 };
const CORE = { easy: 5, normal: 3, hard: 0 };

const popularity = (p) =>
  Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0);

function rankedClubs(data) {
  if (data._fiveClubs) return data._fiveClubs;
  const fame = new Map();
  for (const p of data.players) {
    const v = popularity(p);
    if (!v) continue;
    for (const id of new Set(p.club_history ?? []))
      fame.set(id, (fame.get(id) ?? 0) + v);
  }
  data._fiveClubs = data.clubs
    .filter((c) => (data.playersByClub.get(c.id)?.size ?? 0) >= 30)
    .sort((a, b) => (fame.get(b.id) ?? 0) - (fame.get(a.id) ?? 0));
  return data._fiveClubs;
}

export function answersFor(data, clubs) {
  const counts = new Map();
  for (const c of clubs)
    for (const id of data.playersByClub.get(c.id) ?? [])
      counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts]
    .filter(([, n]) => n >= 2)
    .map(([id, n]) => ({ player: data.playersById.get(id), count: n }))
    .filter((a) => a.player)
    .sort((a, b) => b.count - a.count || playerFame(b.player) - playerFame(a.player));
}

function poolFor(data, difficulty) {
  const ranked = rankedClubs(data);
  const size = CLUB_POOL[difficulty] ?? CLUB_POOL.normal;
  if (difficulty === "hard") return { core: [], wide: ranked.slice(0, size) };
  if (!clubFameReady(data)) {
    const wide = ranked.slice(0, size);
    return { core: ranked.slice(0, Math.min(size, 20)), wide };
  }
  const max = MAX_TIER[difficulty] ?? 2;
  const wide = ranked.filter((c) => clubFameTier(c) <= max);
  const core = ranked.filter((c) => clubFameTier(c) === 1);
  return wide.length >= 10 ? { core, wide } : { core: ranked.slice(0, 20), wide: ranked.slice(0, size) };
}

export function pickClubs(data, difficulty, random = Math.random) {
  const { core, wide } = poolFor(data, difficulty);
  const coreCount = core.length >= 5 ? CORE[difficulty] ?? 3 : 0;
  let best = null;
  for (let t = 0; t < 300; t++) {
    const set = [];
    const used = new Set();
    let guard = 0;
    while (set.length < 5 && guard++ < 400) {
      const list = set.length < coreCount ? core : wide;
      const c = list[Math.floor(random() * list.length)];
      if (!c || used.has(c.id)) continue;
      used.add(c.id);
      set.push(c);
    }
    const answers = answersFor(data, set);
    const triple = answers.some((a) => a.count >= 3);
    const linked = set.every((c) => answers.some((a) => data.playersByClub.get(c.id)?.has(a.player.id)));
    const score = answers.length + (triple ? 20 : 0) + (linked ? 20 : 0);
    if (!best || score > best.score) best = { clubs: set, answers, score };
    if (answers.length >= 12 && triple && linked) break;
  }
  return best;
}

export function clubsOf(clubs, player) {
  const ids = new Set(player.club_history ?? []);
  return clubs.filter((c) => ids.has(c.id));
}
