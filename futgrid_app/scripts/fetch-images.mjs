import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const API = "https://en.wikipedia.org/w/api.php";
const SPARQL = "https://query.wikidata.org/sparql";
const UA =
  "FutgridImageFetcher/1.1 (https://futgrid.az; football quiz game image sync)";
const THUMB = 250;
const DOWNLOAD_DELAY = 1200;
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
const writeJson = (p, v) =>
  writeFile(p, JSON.stringify(v, null, 2) + "\n", "utf8");
const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) =>
    arr.slice(i * n, i * n + n),
  );

export const TROPHY_TITLES = {
  ballon_dor: "Ballon d'Or",
  the_best: "The Best FIFA Men's Player",
  golden_shoe: "European Golden Shoe",
  golden_boy: "Golden Boy (award)",
  kopa_trophy: "Kopa Trophy",
  yashin_trophy: "Yashin Trophy",
  world_cup: "FIFA World Cup",
  euro: "UEFA European Championship",
  copa_america: "Copa América",
  nations_league: "UEFA Nations League",
  finalissima: "CONMEBOL–UEFA Cup of Champions",
  olympic_gold: "Football at the Summer Olympics",
  ucl: "UEFA Champions League",
  europa_league: "UEFA Europa League",
  conference_league: "UEFA Conference League",
  uefa_super_cup: "UEFA Super Cup",
  club_world_cup: "FIFA Club World Cup",
  intercontinental_cup: "FIFA Intercontinental Cup",
  premier_league: "Premier League",
  la_liga: "La Liga",
  bundesliga: "Bundesliga",
  serie_a: "Serie A",
  ligue_1: "Ligue 1",
  eredivisie: "Eredivisie",
  primeira_liga: "Primeira Liga",
  super_lig: "Süper Lig",
  belgian_pro_league: "Belgian Pro League",
  scottish_premiership: "Scottish Premiership",
  austrian_bundesliga: "Austrian Football Bundesliga",
  swiss_super_league: "Swiss Super League",
  saudi_pro_league: "Saudi Pro League",
  ekstraklasa: "Ekstraklasa",
  fa_cup: "FA Cup",
  efl_cup: "EFL Cup",
  copa_del_rey: "Copa del Rey",
  dfb_pokal: "DFB-Pokal",
  coppa_italia: "Coppa Italia",
  coupe_de_france: "Coupe de France",
  scottish_league_cup: "Scottish League Cup",
  austrian_cup: "Austrian Cup",
  mls_cup: "MLS Cup",
  supporters_shield: "Supporters' Shield",
  leagues_cup: "Leagues Cup",
};

let fetchImpl = (...a) => fetch(...a);
export const setFetch = (fn) => {
  fetchImpl = fn;
};

class RateLimited extends Error {}

async function politeFetch(url, retries = 4, init = {}) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetchImpl(url, {
        ...init,
        headers: { "User-Agent": UA, ...init.headers },
      });
    } catch (e) {
      if (attempt >= retries) throw e;
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      const wait = Math.max(
        retryAfter * 1000,
        Math.min(15000 * 2 ** attempt, 300000),
      );
      console.log(
        `   ...Wikipedia gözlət dedi (HTTP ${res.status}), ${Math.round(wait / 1000)} san. gözləyirəm`,
      );
      await sleep(wait);
      continue;
    }
    if (res.status === 429) throw new RateLimited("HTTP 429");
    throw new Error(`HTTP ${res.status}`);
  }
}

async function queryTitles(titles, { thumb, extracts }) {
  const params = {
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    titles: titles.join("|"),
    prop: extracts
      ? "pageimages|description|extracts"
      : "pageimages|description",
    piprop: "thumbnail|name",
    pithumbsize: String(thumb),
    pilicense: "any",
  };
  if (extracts)
    Object.assign(params, {
      exintro: "1",
      explaintext: "1",
      exsentences: "2",
      exlimit: "max",
    });
  const res = await politeFetch(`${API}?${new URLSearchParams(params)}`);
  const data = await res.json();
  const q = data.query ?? {};
  const alias = new Map();
  for (const n of q.normalized ?? []) alias.set(n.from, n.to);
  for (const r of q.redirects ?? []) alias.set(r.from, r.to);
  const resolve = (t) => {
    let cur = t;
    for (let i = 0; i < 3 && alias.has(cur); i++) cur = alias.get(cur);
    return cur;
  };
  const pages = new Map((q.pages ?? []).map((p) => [p.title, p]));
  return new Map(titles.map((t) => [t, pages.get(resolve(t))]));
}

const extOf = (url) => {
  const e = path.extname(new URL(url).pathname).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(e)
    ? e === ".jpeg"
      ? ".jpg"
      : e
    : ".png";
};

async function download(url, dir, slug) {
  const file = `${slug}${extOf(url)}`;
  const res = await politeFetch(url);
  await writeFile(path.join(dir, file), Buffer.from(await res.arrayBuffer()));
  return file;
}

export function commonsThumb(file, width = THUMB) {
  const name = file.trim().replace(/ /g, "_");
  const ext = path.extname(name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext))
    return null;
  const h = createHash("md5").update(name, "utf8").digest("hex");
  const enc = encodeURIComponent(name);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${h[0]}/${h.slice(0, 2)}/${enc}/${width}px-${enc}${ext === ".svg" ? ".png" : ""}`;
}

const fileFromCommonsUrl = (url) =>
  decodeURIComponent(url.split("Special:FilePath/")[1] ?? "");

async function wikidataImages(tmIds) {
  const out = new Map();
  for (const group of chunk(tmIds, 300)) {
    const query = `SELECT ?tm ?img WHERE { VALUES ?tm { ${group.map((id) => JSON.stringify(String(id))).join(" ")} } ?p wdt:P2446 ?tm ; wdt:P18 ?img . }`;
    const res = await politeFetch(SPARQL, 4, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/sparql-results+json",
      },
      body: new URLSearchParams({ query }).toString(),
    });
    const data = await res.json();
    for (const b of data.results?.bindings ?? []) {
      const tm = b.tm?.value,
        file = b.img?.value && fileFromCommonsUrl(b.img.value);
      if (tm && file && !out.has(tm)) out.set(tm, file);
    }
    process.stdout.write(`\r   Wikidata: ${out.size} şəkil tapıldı`);
    await sleep(1000);
  }
  if (tmIds.length) process.stdout.write("\n");
  return out;
}

const FOOTBALL = /football|soccer|futbol/i;

function personMatch(page, person) {
  if (!page || page.missing || !page.thumbnail?.source) return false;
  const text = `${page.description ?? ""} ${page.extract ?? ""}`;
  if (!FOOTBALL.test(text)) return false;
  if (/disambiguation|may refer to/i.test(text)) return false;
  const year = person.birth_date?.slice(0, 4);
  if (year) return text.includes(year);
  return person.uniqueName;
}

async function fetchPeople({
  kind,
  people,
  mapPath,
  missPath,
  creditsPath,
  limit,
  retry,
  suffixes,
  delay,
}) {
  await mkdir(path.dirname(mapPath), { recursive: true });
  const map = await readJson(mapPath, {});
  const misses = new Set(retry ? [] : await readJson(missPath, []));
  const credits = await readJson(creditsPath, {});
  const nameCount = new Map();
  for (const p of people)
    nameCount.set(p.name, (nameCount.get(p.name) ?? 0) + 1);

  let found = 0;
  const save = async () => {
    await writeJson(mapPath, map);
    await writeJson(missPath, [...misses]);
    await writeJson(creditsPath, credits);
  };

  const withTm = people.filter((p) => p.tm && !map[p.slug]);
  if (withTm.length) {
    console.log(
      `${kind}: Wikidata-da Transfermarkt ID ilə ${withTm.length} nəfər axtarılır...`,
    );
    try {
      const files = await wikidataImages(withTm.map((p) => p.tm));
      for (const p of withTm) {
        const file = files.get(String(p.tm));
        const url = file && commonsThumb(file);
        if (!url) continue;
        map[p.slug] = url;
        credits[p.slug] = { file, source: "wikidata" };
        misses.delete(p.slug);
        found++;
      }
      await save();
      console.log(`   Wikidata hazırdır: ${found} şəkil`);
    } catch (e) {
      console.log(
        `   Wikidata alınmadı (${e.message}), Wikipedia ilə davam edirəm`,
      );
    }
  }

  let todo = people.filter((p) => !map[p.slug] && !misses.has(p.slug));
  if (limit) todo = todo.slice(0, limit);
  console.log(
    `${kind}: ${people.length} nəfər, ${Object.keys(map).length} şəkil var, ${todo.length} ad ilə Wikipedia-da yoxlanacaq`,
  );

  let pending = todo.map((p) => ({
    ...p,
    uniqueName: nameCount.get(p.name) === 1,
  }));
  for (const suffix of suffixes) {
    if (!pending.length) break;
    const next = [];
    let done = 0;
    for (const group of chunk(pending, 20)) {
      const titleOf = (p) => suffix(p);
      const titles = [...new Set(group.map(titleOf).filter(Boolean))];
      let pages = new Map();
      try {
        if (titles.length)
          pages = await queryTitles(titles, { thumb: THUMB, extracts: true });
      } catch (e) {
        await save();
        if (e instanceof RateLimited) {
          throw new Error(
            `Wikipedia bu kompüterdən sorğuları müvəqqəti məhdudlaşdırdı. ${found} şəkil yadda saxlanıldı.\n` +
              "Təxminən 1 saatdan sonra eyni əmri yenidən işə salın, qaldığı yerdən davam edəcək.",
          );
        }
        throw e;
      }
      for (const p of group) {
        const t = titleOf(p);
        const page = t && pages.get(t);
        if (!personMatch(page, p)) {
          next.push(p);
          continue;
        }
        map[p.slug] = page.thumbnail.source;
        credits[p.slug] = { article: page.title, file: page.pageimage ?? null };
        found++;
      }
      done += group.length;
      process.stdout.write(
        `\r   ${done}/${pending.length} yoxlandı, indiyədək ${found} şəkil`,
      );
      await save();
      await sleep(delay);
    }
    process.stdout.write("\n");
    pending = next;
    console.log(
      `   addım bitdi: indiyədək ${found} şəkil tapıldı, ${pending.length} qaldı`,
    );
  }
  for (const p of pending) misses.add(p.slug);
  await save();
  console.log(
    `Hazırdır: ${found} yeni şəkil. Ümumi: ${Object.keys(map).length}. Tapılmayan: ${misses.size}`,
  );
  return map;
}

async function fetchLogos({
  kind,
  items,
  titleOf,
  outDir,
  jsonPath,
  field,
  thumb,
  delay,
  downloadDelay,
}) {
  await mkdir(outDir, { recursive: true });
  let found = 0;
  for (const group of chunk(items, 20)) {
    const titles = [...new Set(group.map(titleOf).filter(Boolean))];
    const pages = await queryTitles(titles, { thumb, extracts: false });
    for (const item of group) {
      const page = pages.get(titleOf(item));
      if (!page?.thumbnail?.source) continue;
      try {
        const file = await download(
          page.thumbnail.source,
          outDir,
          item.slug ?? item.id,
        );
        item[field] = `/images/${kind}/${file}`;
        found++;
      } catch {}
      await sleep(downloadDelay);
    }
  }
  await writeJson(jsonPath, items);
  console.log(
    `Hazırdır: ${found}/${items.length} şəkil -> ${outDir}, ${jsonPath}`,
  );
}

function parseArgs(argv) {
  const a = {
    kind: argv.find((x) => !x.startsWith("--")),
    retry: argv.includes("--retry"),
    limit: 0,
  };
  const i = argv.indexOf("--limit");
  if (i >= 0) a.limit = Number(argv[i + 1]) || 0;
  return a;
}

export async function run({
  kind,
  limit = 0,
  retry = false,
  root = ".",
  delay = 400,
  downloadDelay = DOWNLOAD_DELAY,
} = {}) {
  const P = (p) => path.join(root, p);
  const born = (p) =>
    p.birth_date ? ` (footballer, born ${p.birth_date.slice(0, 4)})` : null;

  if (kind === "trophies") {
    const jsonPath = P("public/data/trophies.json");
    const items = await readJson(jsonPath, null);
    if (!items) throw new Error(`${jsonPath} tapılmadı`);
    return fetchLogos({
      kind,
      items,
      titleOf: (t) => TROPHY_TITLES[t.id] ?? t.name,
      outDir: P("public/images/trophies"),
      jsonPath,
      field: "image_url",
      thumb: THUMB,
      delay,
      downloadDelay,
    });
  }
  if (kind === "leagues") {
    const items =
      (await readJson(P("public/data/leagues.json"), null)) ??
      (await readJson(P("src/data/leagues.json"), null));
    if (!items)
      throw new Error("leagues.json tapılmadı (src/data və ya public/data)");
    return fetchLogos({
      kind,
      items,
      titleOf: (l) => l.wikipedia ?? l.name,
      outDir: P("public/images/leagues"),
      jsonPath: P("public/data/leagues.json"),
      field: "logo_url",
      thumb: THUMB,
      delay,
      downloadDelay,
    });
  }
  if (kind === "coaches" || kind === "players") {
    const src = P(`public/data/${kind}.json`);
    const all = await readJson(src, null);
    if (!all)
      throw new Error(`${src} tapılmadı. Əvvəlcə build-players.mjs işə salın.`);
    let people = all;
    if (kind === "players")
      people = [...all].sort(
        (a, b) =>
          (b.market_value?.amount_eur ?? b.market_value?.highest_eur ?? 0) -
          (a.market_value?.amount_eur ?? a.market_value?.highest_eur ?? 0),
      );
    if (kind === "coaches")
      people = [...all].sort(
        (a, b) => (b.players_count ?? 0) - (a.players_count ?? 0),
      );
    const suffixes =
      kind === "players"
        ? [
            (p) => p.name,
            (p) => `${p.name} (footballer)`,
            (p) => (born(p) ? `${p.name}${born(p)}` : null),
          ]
        : [
            (p) => p.name,
            (p) => `${p.name} (football manager)`,
            (p) => `${p.name} (footballer)`,
          ];
    const tmOf = new Map();
    if (kind === "players") {
      const ids = await readJson(P("src/data/player-ids.json"), {});
      for (const [key, id] of Object.entries(ids))
        if (key.startsWith("tm:")) tmOf.set(id, key.slice(3));
    }
    const map = await fetchPeople({
      kind,
      people: people.map((p) => ({
        slug: p.slug,
        name: p.name,
        birth_date: p.birth_date,
        tm: tmOf.get(p.id),
      })),
      mapPath: P(`data-raw/images/${kind}.json`),
      missPath: P(`data-raw/images/${kind}-missing.json`),
      creditsPath: P(`data-raw/images/${kind}-credits.json`),
      limit,
      retry,
      suffixes,
      delay,
    });
    for (const p of all) {
      if (map[p.slug]) p.photo_url = map[p.slug];
      else delete p.photo_url;
    }
    await writeJson(src, all);
    console.log(`${src} yeniləndi (photo_url)`);
    return map;
  }
  throw new Error(
    "İstifadə: node scripts/fetch-images.mjs trophies|leagues|coaches|players [--limit N] [--retry]",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  run(parseArgs(process.argv.slice(2))).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
