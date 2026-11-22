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

export const POOL_SIZE = { easy: 200, normal: 450, hard: 5000 };
// Hovuza düşmək üçün minimum cari dəyər (€) — ucuz veteranlar oyunu sönükləşdirməsin.
const MIN_VALUE = { easy: 20e6, normal: 8e6, hard: 1e6 };
// Ən bahalı oyunçular hər səviyyədə hovuzda olur.
const TOP_BY_VALUE = { easy: 250, normal: 400, hard: 800 };

export function buildPool(data, difficulty) {
  const size = POOL_SIZE[difficulty] ?? POOL_SIZE.normal;
  const min = MIN_VALUE[difficulty] ?? MIN_VALUE.normal;
  const valued = data.players.filter((p) => METRIC.get(p) > 0);
  const famous = valued
    .filter((p) => METRIC.get(p) >= min)
    .sort(byFame)
    .slice(0, size);
  const rich = [...valued]
    .sort((a, b) => METRIC.get(b) - METRIC.get(a))
    .slice(0, TOP_BY_VALUE[difficulty] ?? TOP_BY_VALUE.normal);
  const seen = new Set();
  const pool = [];
  for (const p of [...famous, ...rich]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    pool.push(p);
  }
  return pool.length >= 2 ? pool : valued.sort(byFame).slice(0, size);
}

// Bahalı oyunçular daha tez-tez çıxsın: çəki dəyərlə artır.
const weightOf = (p) => Math.pow(Math.max(1, METRIC.get(p) / 1e6), 0.7);

function weightedPick(list, random) {
  let total = 0;
  for (const p of list) total += weightOf(p);
  let r = random() * total;
  for (const p of list) {
    r -= weightOf(p);
    if (r <= 0) return p;
  }
  return list[list.length - 1] ?? null;
}

function band(streak) {
  if (streak < 4) return 4;
  if (streak < 10) return 2.5;
  if (streak < 18) return 1.8;
  return 1.4;
}

export function pickChallenger(pool, a, streak, recent, random) {
  const va = METRIC.get(a);
  // Ucuz oyunçudan sonra yuxarı "sıçrayış" üçün aralığı genişləndir.
  const k = va < 15e6 ? Math.max(band(streak), 8) : band(streak);
  const ok = (b) => {
    if (!b || b.id === a.id || recent.has(b.id)) return false;
    const vb = METRIC.get(b);
    if (vb === va) return false;
    return Math.max(va, vb) / Math.max(1, Math.min(va, vb)) <= k;
  };
  const candidates = pool.filter(ok);
  if (candidates.length) return weightedPick(candidates, random);
  const rest = pool.filter((b) => b && b.id !== a.id && !recent.has(b.id));
  return rest.length ? weightedPick(rest, random) : pool.find((p) => p.id !== a.id) ?? null;
}

export function firstRound(pool, random) {
  if (pool.length < 2) return null;
  const a = weightedPick(pool, random);
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

// "Rəqəm" rejimi: bir oyunçu və bir məbləğ — dəyəri bundan çoxdur, azdır, yoxsa bərabər?
// Məbləğ Transfermarkt-ın adətən istifadə etdiyi yuvarlaq pillələrdən seçilir.
const LADDER = [
  0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.5, 1.8, 2, 2.5, 3, 3.5,
  4, 4.5, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 45, 50, 55, 60,
  65, 70, 75, 80, 85, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 200, 220, 250,
].map((m) => m * 1e6);

export function pickLine(player, random) {
  const v = METRIC.get(player);
  // Təxminən hər 4 sualdan biri dəqiq dəyərin özüdür ("bərabər").
  if (random() < 0.25) return v;
  let i = LADDER.findIndex((x) => x >= v);
  if (i < 0) i = LADDER.length - 1;
  const step = 1 + Math.floor(random() * 3);
  const dir = random() < 0.5 ? -1 : 1;
  let j = Math.max(0, Math.min(LADDER.length - 1, i + dir * step));
  if (LADDER[j] === v) j = Math.max(0, Math.min(LADDER.length - 1, j + (dir > 0 ? 1 : -1)));
  return LADDER[j] === v ? v * (dir > 0 ? 1.2 : 0.8) : LADDER[j];
}

export function lineAnswer(player, line) {
  const v = METRIC.get(player);
  if (v === line) return "equal";
  return v > line ? "up" : "down";
}

export function pickLinePlayer(pool, recent, random) {
  const options = pool.filter((p) => !recent.has(p.id));
  return weightedPick(options.length ? options : pool, random);
}
