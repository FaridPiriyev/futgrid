#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { eachRow } from "./build-players.mjs";

const SPARQL = "https://query.wikidata.org/sparql";
const UA =
  "FutgridCareerFetcher/1.0 (https://futgrid.az; football quiz club history sync)";
const BATCH = 150;
const ACTIVE_RECHECK_DAYS = 14;
const MISSING_RECHECK_DAYS = 60;
const RETIRED_MIN_VALUE = 5_000_000;
const RETIRED_MIN_CAPS = 20;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const readJson = async (p, fallback) =>
  (await exists(p))
    ? JSON.parse((await readFile(p, "utf8")).replace(/^\uFEFF/, ""))
    : fallback;
const writeJson = (p, v) => writeFile(p, JSON.stringify(v) + "\n", "utf8");
const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) =>
    arr.slice(i * n, i * n + n),
  );
const num = (v) => (v === "" || v == null ? null : Number(v));
const daysSince = (d, today) => (Date.parse(today) - Date.parse(d)) / 864e5;
const day = (v) => (v ? v.slice(0, 10).replace(/^\+/, "") : null);

let fetchImpl = (...a) => fetch(...a);
export const setFetch = (fn) => {
  fetchImpl = fn;
};

async function sparql(query) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetchImpl(SPARQL, {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/sparql-results+json",
        },
        body: new URLSearchParams({ query }).toString(),
      });
    } catch (e) {
      if (attempt >= 5) throw e;
      await sleep(5000 * (attempt + 1));
      continue;
    }
    if (res.ok) return (await res.json()).results?.bindings ?? [];
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const wait = Math.max(
        (Number(res.headers.get("retry-after")) || 0) * 1000,
        20000 * (attempt + 1),
      );
      console.log(
        `\n   ...Wikidata gözlət dedi (HTTP ${res.status}), ${Math.round(wait / 1000)} san. gözləyirəm`,
      );
      await sleep(wait);
      continue;
    }
    throw new Error(`Wikidata HTTP ${res.status}`);
  }
}

const careerQuery = (
  ids,
) => `SELECT ?tm ?p ?club ?clubTm ?clubLabel ?start ?end WHERE {
  VALUES ?tm { ${ids.map((id) => JSON.stringify(String(id))).join(" ")} }
  ?p wdt:P2446 ?tm .
  OPTIONAL {
    ?p p:P54 ?st .
    ?st ps:P54 ?club ; wikibase:rank ?rank .
    FILTER(?rank != wikibase:DeprecatedRank)
    OPTIONAL { ?st pq:P580 ?start }
    OPTIONAL { ?st pq:P582 ?end }
    OPTIONAL { ?club wdt:P7223 ?clubTm }
    OPTIONAL { ?club rdfs:label ?clubLabel FILTER(LANG(?clubLabel) = "en") }
  }
}`;

export function parseBindings(rows) {
  const out = new Map();
  for (const b of rows) {
    const tm = b.tm?.value;
    if (!tm) continue;
    if (!out.has(tm))
      out.set(tm, { q: b.p?.value.split("/").pop() ?? null, s: [] });
    if (!b.club) continue;
    const entry = out.get(tm);
    const q = b.club.value.split("/").pop();
    const start = day(b.start?.value);
    const end = day(b.end?.value);
    const clubTm = b.clubTm?.value ?? null;
    const dup = entry.s.find(
      (x) => x[1] === q && x[3] === start && x[4] === end,
    );
    if (dup) {
      if (!dup[0] && clubTm) dup[0] = clubTm;
      continue;
    }
    entry.s.push([clubTm, q, b.clubLabel?.value ?? null, start, end]);
  }
  for (const e of out.values())
    e.s.sort((a, b) => (a[3] ?? a[4] ?? "").localeCompare(b[3] ?? b[4] ?? ""));
  return out;
}

export async function run({
  tmDir = "data-raw/transfermarkt",
  outPath = "data-raw/wikidata/careers.json",
  refresh = false,
  today = new Date().toISOString().slice(0, 10),
  delay = 1500,
} = {}) {
  const t0 = Date.now();
  const log = (m) =>
    console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
  await mkdir(path.dirname(outPath), { recursive: true });
  const cache = await readJson(outPath, { players: {} });
  cache.players ??= {};

  const tmPlayers = [];
  let maxSeason = 0;
  await eachRow(path.join(tmDir, "players.csv.gz"), (r) => {
    tmPlayers.push(r);
    maxSeason = Math.max(maxSeason, Number(r.last_season) || 0);
  });
  const isActive = (p) => Number(p.last_season) >= maxSeason - 1;
  const wanted = tmPlayers.filter(
    (p) =>
      isActive(p) ||
      (num(p.highest_market_value_in_eur) ?? 0) >= RETIRED_MIN_VALUE ||
      (num(p.international_caps) ?? 0) >= RETIRED_MIN_CAPS,
  );
  const todo = wanted.filter((p) => {
    const c = cache.players[p.player_id];
    if (refresh || !c) return true;
    if (!c.q) return daysSince(c.t, today) >= MISSING_RECHECK_DAYS;
    return isActive(p) && daysSince(c.t, today) >= ACTIVE_RECHECK_DAYS;
  });
  log(
    `${tmPlayers.length} Transfermarkt oyunçusundan ${wanted.length} nəfər lazımdır, ${todo.length} nəfər Wikidata-dan çəkiləcək`,
  );

  let done = 0,
    found = 0;
  for (const group of chunk(todo, BATCH)) {
    const ids = group.map((p) => p.player_id);
    const parsed = parseBindings(await sparql(careerQuery(ids)));
    for (const id of ids) {
      const e = parsed.get(String(id));
      cache.players[id] = e
        ? { q: e.q, s: e.s, t: today }
        : { q: null, t: today };
      if (e?.s.length) found++;
    }
    done += group.length;
    process.stdout.write(
      `\r   ${done}/${todo.length} yoxlandı · karyerası tapılan: ${found}`,
    );
    if (done % (BATCH * 10) === 0) await writeJson(outPath, cache);
    await sleep(delay);
  }
  if (todo.length) process.stdout.write("\n");
  cache.updated_at = today;
  await writeJson(outPath, cache);

  const total = Object.values(cache.players).filter((c) => c.s?.length).length;
  log(`Hazırdır: ${total} oyunçunun klub karyerası ${outPath} faylındadır`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  run({ refresh: process.argv.includes("--refresh") }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
