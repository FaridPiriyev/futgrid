import { datasetFor } from "../data";
import { byFame } from "./fame";

/*
 * "Kimdir bu?" oyunu: futbolçunun şəkli 16 və ya 24 xanaya bölünür, hər dəfə bir xana açılır.
 */

export const GRIDS = {
  16: { cols: 4, rows: 4 },
  24: { cols: 4, rows: 6 },
};

const POOLS = { easy: 100, normal: 400, hard: 1200 };

export function photoPool(data, { difficulty = "normal", era = "all" } = {}) {
  const key = `_pxpool_${difficulty}_${era}`;
  if (data[key]) return data[key];
  const set = datasetFor(data, era);
  const ranked = set.players.filter((p) => p.photo_url).sort(byFame);
  data[key] = ranked.slice(0, POOLS[difficulty] ?? POOLS.normal);
  return data[key];
}

export function pickPhoto(data, settings, avoid = new Set()) {
  const pool = photoPool(data, settings);
  const fresh = pool.filter((p) => !avoid.has(p.id));
  const list = fresh.length ? fresh : pool;
  return list[Math.floor(Math.random() * list.length)] ?? null;
}

/**
 * Xanaların açılma sırası. Şəkillər kvadratdır və üz adətən ortada, bir az yuxarıda olur,
 * ona görə üzə yaxın xanalar sona saxlanılır (təsadüfi qarışıqlıqla).
 */
export function revealOrder(size, random = Math.random) {
  const { cols, rows } = GRIDS[size] ?? GRIDS[16];
  const face = { x: 0.5, y: 0.42 };
  const tiles = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) / cols;
      const y = (r + 0.5) / rows;
      const d = Math.hypot(x - face.x, (y - face.y) * 1.2);
      tiles.push({ i: r * cols + c, key: d + random() * 0.35 });
    }
  return tiles.sort((a, b) => b.key - a.key).map((t) => t.i);
}

/** Tapılanda qazanılan xal: bağlı qalan xanalar + 1. */
export const pointsFor = (size, opened) => Math.max(1, size - opened + 1);
