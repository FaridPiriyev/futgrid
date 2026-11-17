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
 * Xanaların açılma sırası — idarə olunan qarışıq:
 * üzə ən yaxın bir neçə xana sona saxlanılır, qalanları isə növbə ilə
 * bir kənardan, bir ortadan açılır (hamısı kənardan gəlmir).
 */
export function revealOrder(size, random = Math.random) {
  const { cols, rows } = GRIDS[size] ?? GRIDS[16];
  const face = { x: 0.5, y: 0.42 };
  const tiles = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) / cols;
      const y = (r + 0.5) / rows;
      tiles.push({ i: r * cols + c, d: Math.hypot(x - face.x, (y - face.y) * 1.2) + random() * 0.04 });
    }
  tiles.sort((a, b) => a.d - b.d);

  const shuffle = (list) => {
    const out = [...list];
    for (let k = out.length - 1; k > 0; k--) {
      const j = Math.floor(random() * (k + 1));
      [out[k], out[j]] = [out[j], out[k]];
    }
    return out;
  };

  const keep = size >= 24 ? 4 : 3;
  const face3 = tiles.slice(0, keep);
  const rest = tiles.slice(keep);
  const half = Math.ceil(rest.length / 2);
  const middle = shuffle(rest.slice(0, half));
  const edge = shuffle(rest.slice(half));

  const order = [];
  let fromEdge = random() < 0.65;
  while (edge.length || middle.length) {
    const src = (fromEdge && edge.length) || !middle.length ? edge : middle;
    order.push(src.shift().i);
    fromEdge = !fromEdge;
  }
  // Üz xanaları ən sonda: ən mərkəzi olan lap axırda açılır.
  const tail = shuffle(face3.slice(1)).map((t) => t.i);
  return [...order, ...tail, face3[0].i];
}

/** Tapılanda qazanılan xal: bağlı qalan xanalar + 1. */
export const pointsFor = (size, opened) => Math.max(1, size - opened + 1);
