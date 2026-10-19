import { mkdir, readFile, readdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildCountryCodes, eachRow } from "./build-players.mjs";

const exists = (p) => access(p).then(() => true, () => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const YOUTH = /\b(u-?\d{2}|olympic|women|woman|futsal|beach)\b/i;

export async function buildCountries({
  basePath = "src/data/countries.json",
  nationalTeamsPath = "data-raw/transfermarkt/national_teams.csv.gz",
  outPath = "public/data/countries.json",
  flagsDir = "public/flags",
  flags = true,
  fetchImpl = fetch,
} = {}) {
  const countries = JSON.parse((await readFile(basePath, "utf8")).replace(/^﻿/, ""));
  const byCode = new Map(countries.map((c) => [c.code, c]));

  if (await exists(nationalTeamsPath)) {
    const countryCode = buildCountryCodes();
    let ranked = 0;
    await eachRow(nationalTeamsPath, (r) => {
      if (YOUTH.test(r.name)) return;
      const code = countryCode(r.country_name) ?? countryCode(r.name);
      const c = code && byCode.get(code);
      const rank = Number(r.fifa_ranking);
      if (!c || !rank) return;
      if (!c.fifa_rank) ranked++;
      if (!c.fifa_rank || rank < c.fifa_rank) c.fifa_rank = rank;
    });
    console.log(`FIFA reytinqi: ${ranked} ölkə üçün tapıldı (Transfermarkt datasetindən)`);
  } else {
    console.log(`${nationalTeamsPath} tapılmadı, FIFA reytinqi əlavə olunmadı`);
  }

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(countries, null, 2) + "\n", "utf8");
  console.log(`Hazırdır: ${countries.length} ölkə -> ${outPath}`);

  if (!flags) return countries;
  await mkdir(flagsDir, { recursive: true });
  const have = new Set(await readdir(flagsDir));
  let ok = 0;
  const failed = [];
  for (const c of countries) {
    const file = `${c.code.toLowerCase()}.svg`;
    if (have.has(file)) {
      ok++;
      continue;
    }
    try {
      const res = await fetchImpl(`https://flagcdn.com/${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(path.join(flagsDir, file), Buffer.from(await res.arrayBuffer()));
      ok++;
    } catch (e) {
      failed.push(`${c.code} (${e.message})`);
    }
    await sleep(120);
  }
  console.log(`Bayraqlar: ${ok}/${countries.length} -> ${flagsDir}`);
  if (failed.length) console.log(`Yüklənməyənlər: ${failed.join(", ")}`);
  return countries;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildCountries({ flags: !process.argv.includes("--no-flags") }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
