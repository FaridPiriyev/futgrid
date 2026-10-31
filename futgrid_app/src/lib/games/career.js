export const ROUNDS = 10;
export const MAX_WRONG = 3;
import { byFame } from "./fame";

export const POOL = { easy: 150, normal: 900, hard: 5000 };

const popularity = (p) =>
  Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0);

const year = (d) => (d ? d.slice(0, 4) : null);

export function pathIds(data, p) {
  const out = [];
  for (const id of p.club_history ?? []) {
    if (!data.clubsById.has(id)) continue;
    if (out[out.length - 1] !== id) out.push(id);
  }
  return out;
}

export const pathKey = (data, p) => pathIds(data, p).join(">");

export function careerPath(data, p) {
  const stints = [...(p.club_stints ?? [])];
  return pathIds(data, p).map((id) => {
    const i = stints.findIndex((s) => s.club_id === id);
    const s = i >= 0 ? stints.splice(i, 1)[0] : null;
    const from = year(s?.from);
    const to = s ? year(s.to) ?? (p.is_active === false ? null : "indi") : null;
    return {
      club: data.clubsById.get(id),
      years: from ? `${from}${to && to !== from ? `–${to}` : ""}` : null,
    };
  });
}

export function careerPool(data, difficulty) {
  data._career ??= data.players
    .filter((p) => popularity(p) > 0 && pathIds(data, p).length >= 3)
    .sort(byFame);
  return data._career.slice(0, POOL[difficulty] ?? POOL.normal);
}

export function pickRounds(pool, random = Math.random, n = ROUNDS) {
  const picked = [];
  const used = new Set();
  let guard = 0;
  while (picked.length < Math.min(n, pool.length) && guard++ < 5000) {
    const p = pool[Math.floor(random() * pool.length)];
    if (used.has(p.id)) continue;
    used.add(p.id);
    picked.push(p);
  }
  return picked;
}

export const roundPoints = (hints) => Math.max(1, 3 - hints);
