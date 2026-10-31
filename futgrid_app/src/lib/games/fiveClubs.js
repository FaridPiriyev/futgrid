export const TIME = { get 60() {
    return tr("1 dəq");
  }, get 120() {
    return tr("2 dəq");
  }, get 180() {
    return tr("3 dəq");
  } };
import { clubFameReady, clubFameTier, playerFame } from "./fame";

import { tr } from "../../i18n";
export const CLUB_POOL = { easy: 24, normal: 60, hard: 140 };
const MAX_TIER = { easy: 1, normal: 2, hard: 3 };

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
  if (difficulty === "hard" || !clubFameReady(data)) return ranked.slice(0, size);
  const max = MAX_TIER[difficulty] ?? 2;
  const curated = ranked.filter((c) => clubFameTier(c) <= max);
  return curated.length >= 10 ? curated : ranked.slice(0, size);
}

export function pickClubs(data, difficulty, random = Math.random) {
  const pool = poolFor(data, difficulty);
  let best = null;
  for (let t = 0; t < 300; t++) {
    const set = [];
    const used = new Set();
    while (set.length < 5 && used.size < pool.length) {
      const c = pool[Math.floor(random() * pool.length)];
      if (used.has(c.id)) continue;
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
