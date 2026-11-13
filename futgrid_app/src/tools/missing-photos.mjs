#!/usr/bin/env node
/**
 * Şəkli olmayan məşhur oyunçuların siyahısını çıxarır (istəyə görə istifadə et).
 * futgrid_app qovluğunda işə sal:
 *
 *   node src/tools/missing-photos.mjs
 *   node src/tools/missing-photos.mjs --top=500
 *
 * Hər oyunçunun yanında şəklin hansı adla saxlanmalı olduğu yazılır.
 * Şəkli src/assets/players/ qovluğuna həmin adla at, sayt onu özü tapır.
 * Tam siyahı data-raw/missing-photos.csv faylına da yazılır (Excel-də açılır).
 *
 * Bu fayl sayta daxil edilmir, yalnız sənin kompüterində işləyir.
 */
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PLAYERS = "public/data/players.json";
const PHOTO_DIR = "src/assets/players";
const CSV = "data-raw/missing-photos.csv";
const EXT = new Set([".webp", ".jpg", ".jpeg", ".png", ".avif"]);

const exists = (p) => access(p).then(() => true, () => false);

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const slugOf = (p) => p.slug || norm(p.name).replace(/ /g, "-");

const TROPHY_WEIGHT = {
  ballon_dor: 3, world_cup: 1.5, ucl: 1, euro: 0.8, copa_america: 0.8,
  premier_league: 0.3, la_liga: 0.3, serie_a: 0.3, bundesliga: 0.3, ligue_1: 0.2,
};

function fame(p) {
  const value = Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0, 1e5);
  const v = Math.max(0, Math.log10(value / 1e6));
  const caps = Math.min(p.international?.caps ?? 0, 150) / 60;
  let t = 0;
  for (const tr of p.trophies ?? []) t += (TROPHY_WEIGHT[tr.id] ?? 0) * Math.min(tr.count ?? 1, 5);
  return v * 1.2 + caps + Math.min(t, 6);
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

if (!(await exists(PLAYERS))) {
  console.error(`${PLAYERS} tapılmadı. Skripti futgrid_app qovluğunda işə sal.`);
  process.exit(1);
}
const players = JSON.parse((await readFile(PLAYERS, "utf8")).replace(/^﻿/, ""));
const have = new Set();
if (await exists(PHOTO_DIR))
  for (const f of await readdir(PHOTO_DIR))
    if (EXT.has(path.extname(f).toLowerCase())) have.add(norm(path.basename(f, path.extname(f))));

const arg = process.argv.find((a) => a.startsWith("--top="));
const top = Number(arg?.split("=")[1]) || 300;
const ranked = [...players].sort((a, b) => fame(b) - fame(a)).slice(0, top);
const missing = ranked.filter((p) => !p.photo_url && !have.has(norm(slugOf(p))) && !have.has(norm(p.name)));

await mkdir(path.dirname(CSV), { recursive: true });
const rows = [["rank", "name", "country", "position", "file"]];
for (const p of missing)
  rows.push([ranked.indexOf(p) + 1, p.name, p.nationality_code ?? "", p.position ?? "", `${PHOTO_DIR}/${slugOf(p)}.webp`]);
await writeFile(CSV, "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n", "utf8");

console.log(`Ən tanınmış ${top} oyunçudan ${missing.length} nəfərin şəkli yoxdur.\n`);
for (const p of missing.slice(0, 40))
  console.log(`  #${String(ranked.indexOf(p) + 1).padStart(3)}  ${p.name.padEnd(28)} -> ${PHOTO_DIR}/${slugOf(p)}.webp`);
if (missing.length > 40) console.log(`  ... və daha ${missing.length - 40} nəfər`);
console.log(`\nTam siyahı: ${CSV}`);
