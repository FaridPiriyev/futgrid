// Writes curated FIFA-like ratings (packages/game-core/data/player-ratings.json) into players.json
// as `rating`, for both the web app (public/data) and the backend (packages/game-core/data).
// Players not in the list get no `rating` field and fall back to the market-value formula.
//
// Usage (from futgrid_app/):  node scripts/apply-player-ratings.mjs
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Mutates players in place. Returns { set, unknown } for logging. */
export function applyPlayerRatings(players, ratingsFile) {
  const ratings = ratingsFile.ratings ?? {};
  const bySlug = new Map(players.map((p) => [p.slug, p]));
  for (const p of players) delete p.rating;
  const unknown = [];
  let set = 0;
  for (const [slug, value] of Object.entries(ratings)) {
    const p = bySlug.get(slug);
    if (!p) {
      unknown.push(slug);
      continue;
    }
    p.rating = Math.max(40, Math.min(99, Math.round(Number(value))));
    set++;
  }
  return { set, unknown };
}

const readJson = async (p) => JSON.parse((await readFile(p, "utf8")).replace(/^﻿/, ""));
const writeJson = (p, v) => writeFile(p, JSON.stringify(v, null, 2) + "\n", "utf8");

async function main() {
  const root = process.cwd();
  const ratings = await readJson(path.resolve(root, "../packages/game-core/data/player-ratings.json"));
  for (const dir of [path.resolve(root, "public/data"), path.resolve(root, "../packages/game-core/data")]) {
    const file = path.join(dir, "players.json");
    const players = await readJson(file);
    const result = applyPlayerRatings(players, ratings);
    await writeJson(file, players);
    console.log(`${file}: ${result.set} reytinq yazıldı${result.unknown.length ? ` · tapılmadı: ${result.unknown.join(", ")}` : ""}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
