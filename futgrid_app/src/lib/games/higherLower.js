import { euro } from "./playerInfo";
import { byFame } from "./fame";

import { tr } from "../../i18n";
export const METRIC = {
  get label() {
    return tr("Bazar dəyəri");
  },
  get question() {
    return tr("Kimin bazar dəyəri daha yüksəkdir?");
  },
  get: (p) => (p.is_active !== false ? p.market_value?.amount_eur : undefined),
  format: euro,
};

export const POOL_SIZE = { easy: 200, normal: 900, hard: 5000 };

export function buildPool(data, difficulty) {
  const size = POOL_SIZE[difficulty] ?? POOL_SIZE.normal;
  return data.players
    .filter((p) => METRIC.get(p) > 0)
    .sort(byFame)
    .slice(0, size);
}

function band(streak) {
  if (streak < 4) return 4;
  if (streak < 10) return 2.5;
  if (streak < 18) return 1.8;
  return 1.4;
}

export function pickChallenger(pool, a, streak, recent, random) {
  const va = METRIC.get(a);
  const k = band(streak);
  let fallback = null;
  for (let t = 0; t < 120; t++) {
    const b = pool[Math.floor(random() * pool.length)];
    if (!b || b.id === a.id || recent.has(b.id)) continue;
    const vb = METRIC.get(b);
    fallback ??= b;
    if (vb === va && t < 100) continue;
    const ratio = Math.max(va, vb) / Math.max(1, Math.min(va, vb));
    if (ratio <= k) return b;
  }
  return fallback ?? pool.find((p) => p.id !== a.id) ?? null;
}

export function firstRound(pool, random) {
  if (pool.length < 2) return null;
  const a = pool[Math.floor(random() * Math.min(pool.length, 400))];
  const b = pickChallenger(pool, a, 0, new Set(), random);
  return b ? { a, b } : null;
}

export function isCorrect(a, b, dir) {
  const va = METRIC.get(a);
  const vb = METRIC.get(b);
  if (va === vb) return true;
  return dir === "up" ? vb > va : vb < va;
}

const bestKey = (difficulty) => `futgrid:yuksek:best:${difficulty}`;

export function loadBest(difficulty) {
  try {
    return Number(localStorage.getItem(bestKey(difficulty))) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(difficulty, value) {
  try {
    localStorage.setItem(bestKey(difficulty), String(value));
  } catch {}
}
