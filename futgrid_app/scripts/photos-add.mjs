/*
 * Oyunçu şəkillərini avtomatik düzəldir və tamamlayır — bir-bir baxmağa ehtiyac yoxdur.
 *
 * Nə edir:
 *  1. Wikidata-da hər oyunçunu Transfermarkt id-si ilə tapır (adla yox — ona görə
 *     başqa adamın şəkli gəlmir) və oradakı şəkli götürür. Bu, səhv şəkilləri
 *     avtomatik düzgünü ilə əvəz edir, şəkli olmayanlara da şəkil qoyur.
 *  2. Wikidata-da şəkli olmayan, bizdə də şəkli olmayan oyunçular üçün
 *     API-Football (api-sports) şəklini götürür (--no-api ilə söndürmək olar).
 *  3. Wikidata ilə yoxlana bilməyən köhnə şəkilləri data-raw/unverified-photos.json-a
 *     yazır — istəsən yalnız onlara baxarsan: node scripts/photo-sheet.mjs --unverified
 *
 * futgrid_app qovluğunda:
 *   node scripts/photos-add.mjs --dry   → nə qədər şəkil dəyişəcəyini göstərir
 *   node scripts/photos-add.mjs         → endirir və players.json-u yeniləyir
 *
 * Seçimlər:
 *   --no-api       API-Football şəkillərindən istifadə etmə
 *   --no-replace   mövcud şəkillərə toxunma, yalnız şəkli olmayanlara əlavə et
 *   --limit N      yalnız ən tanınmış N oyunçu (sınaq üçün)
 *
 * Yarımçıq qalsa eyni əmri yenidən işlət — hazır olanlar təkrar endirilmir.
 * src/assets/players/ qovluğuna əl ilə qoyduğun şəkillərə toxunulmur.
 */
import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const TARGETS = ["public/data/players.json", "../packages/game-core/data/players.json"];
const IDS = "src/data/player-ids.json";
const BAD = "src/data/bad-photos.txt";
const MANUAL_DIR = "src/assets/players";
const OUT_DIR = "public/images/players";
const CREDITS = "data-raw/images/players-credits.json";
const UNVERIFIED = "data-raw/unverified-photos.json";
const SPARQL = "https://query.wikidata.org/sparql";
const API_SPORTS_IMG = (id) => `https://media.api-sports.io/football/players/${id}.png`;
const UA = "FutgridImageFetcher/1.3 (https://futgrid.az; football quiz game image sync)";
const WIDTH = 330;
const WIKI_DELAY = 700;
const API_DELAY = 350;

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const NO_API = args.includes("--no-api");
const NO_REPLACE = args.includes("--no-replace");
const li = args.indexOf("--limit");
const LIMIT = li >= 0 ? Number(args[li + 1]) || 0 : 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const readJson = async (p, fallback) =>
  (await exists(p)) ? JSON.parse((await readFile(p, "utf8")).replace(/^\uFEFF/, "")) : fallback;

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function readBad() {
  if (!(await exists(BAD))) return { lines: [], keys: new Set() };
  const lines = (await readFile(BAD, "utf8")).replace(/^\uFEFF/, "").split(/\r?\n/);
  const keys = new Set(
    lines
      .map((l) => l.replace(/#.*/, "").trim())
      .filter(Boolean)
      .map((l) => norm(l)),
  );
  return { lines, keys };
}

async function politeFetch(url, init = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    let res;
    try {
      res = await fetch(url, { ...init, headers: { "User-Agent": UA, ...init.headers } });
    } catch {
      await sleep(4000 * (attempt + 1));
      continue;
    }
    if (res.ok) return res;
    if (res.status === 404 || res.status === 400 || res.status === 403) throw new Error(`HTTP ${res.status}`);
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.max((Number(res.headers.get("retry-after")) || 0) * 1000, 20000 * 2 ** attempt);
      console.log(`\n   ...server gözlət dedi (HTTP ${res.status}), ${Math.round(wait / 1000)} san. gözləyirəm`);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
  throw new Error("çox cəhd alınmadı");
}

async function wikidataImages(tmIds) {
  const out = new Map();
  for (let i = 0; i < tmIds.length; i += 200) {
    const group = tmIds.slice(i, i + 200);
    const query = `SELECT ?tm ?img WHERE { VALUES ?tm { ${group
      .map((id) => JSON.stringify(String(id)))
      .join(" ")} } ?p wdt:P2446 ?tm ; wdt:P18 ?img . }`;
    const res = await politeFetch(SPARQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/sparql-results+json",
      },
      body: new URLSearchParams({ query }).toString(),
    });
    const data = await res.json();
    for (const b of data.results?.bindings ?? []) {
      const tm = b.tm?.value;
      const file = decodeURIComponent(b.img?.value?.split("Special:FilePath/")[1] ?? "");
      if (tm && file && !out.has(tm)) out.set(tm, file);
    }
    process.stdout.write(
      `\r   Wikidata: ${Math.min(i + 200, tmIds.length)}/${tmIds.length} yoxlandı, ${out.size} şəkil var`,
    );
    await sleep(1000);
  }
  process.stdout.write("\n");
  return out;
}

const extOf = (file) => {
  const e = path.extname(file).toLowerCase();
  if (e === ".jpeg") return ".jpg";
  return [".jpg", ".png", ".webp"].includes(e) ? e : ".jpg";
};
const md5 = (buf) => createHash("md5").update(buf).digest("hex");

async function main() {
  const players = await readJson(TARGETS[0], null);
  if (!players) throw new Error(`${TARGETS[0]} tapılmadı — futgrid_app qovluğunda işlət`);
  const ids = await readJson(IDS, {});
  const tmOf = new Map();
  const apiOf = new Map();
  for (const [key, ourId] of Object.entries(ids)) {
    if (key.startsWith("tm:")) tmOf.set(ourId, key.slice(3));
    if (key.startsWith("api:")) apiOf.set(ourId, key.slice(4));
  }

  const bad = await readBad();
  const manual = new Set();
  if (await exists(MANUAL_DIR))
    for (const f of await readdir(MANUAL_DIR)) manual.add(norm(f.replace(/\.[^.]+$/, "")));
  const isBad = (p) => bad.keys.has(norm(p.slug)) || bad.keys.has(norm(p.name));
  const hasManual = (p) => manual.has(norm(p.slug)) || manual.has(norm(p.name));
  const credits = await readJson(CREDITS, {});

  const value = (p) => Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0);
  let pool = players.filter((p) => !hasManual(p)).sort((a, b) => value(b) - value(a));
  if (LIMIT) pool = pool.slice(0, LIMIT);

  const wdTargets = pool.filter((p) => tmOf.has(p.id) && (!NO_REPLACE || !p.photo_url || isBad(p)));
  console.log(`1) Wikidata: ${wdTargets.length} oyunçu Transfermarkt id-si ilə yoxlanılır…`);
  const files = await wikidataImages(wdTargets.map((p) => tmOf.get(p.id)));

  const wdJobs = [];
  const apiJobs = [];
  const unverified = [];
  for (const p of pool) {
    // photos-prime.mjs-in seçdiyi "oynadığı illər" şəklinə toxunmuruq.
    if (credits[p.slug]?.source === "commons-prime" && p.photo_url && !isBad(p)) continue;
    const file = tmOf.has(p.id) ? files.get(tmOf.get(p.id)) : null;
    if (file && (!NO_REPLACE || !p.photo_url || isBad(p))) {
      const already = credits[p.slug]?.source === "wikidata" && credits[p.slug]?.file === file && p.photo_url;
      if (!already) wdJobs.push({ p, file });
      continue;
    }
    if (p.photo_url && !isBad(p)) {
      if (credits[p.slug]?.source !== "wikidata" && credits[p.slug]?.source !== "api-sports")
        unverified.push(p.slug);
      continue;
    }
    if (!NO_API && apiOf.has(p.id) && credits[p.slug]?.source !== "api-sports-none") apiJobs.push(p);
  }

  const newFromWd = wdJobs.filter((j) => !j.p.photo_url).length;
  console.log(`   → Wikidata ilə yeni şəkil: ${newFromWd}, köhnəni yoxlanmış şəkillə əvəz: ${wdJobs.length - newFromWd}`);
  if (!NO_API) console.log(`2) API-Football: hələ şəkli olmayan ${apiJobs.length} oyunçu yoxlanacaq`);
  console.log(`3) Yoxlana bilməyən köhnə şəkil: ${unverified.length} (saxlanılır)`);
  const left = pool.filter((p) => !p.photo_url && !files.has(tmOf.get(p.id)) && (NO_API || !apiOf.has(p.id))).length;
  console.log(`   Heç bir mənbədə olmayan: ${left} — saytda baş hərfləri görünəcək`);

  await mkdir(path.dirname(UNVERIFIED), { recursive: true });
  await writeFile(UNVERIFIED, JSON.stringify(unverified, null, 1) + "\n", "utf8");
  if (DRY) {
    console.log("\nWikidata nümunələri:");
    for (const j of wdJobs.slice(0, 15)) console.log(`  ${j.p.name.padEnd(28)} ${j.file}`);
    console.log("\n--dry: heç nə endirilmədi.");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(CREDITS), { recursive: true });
  const fixed = new Set();
  let stopped = false;
  process.on("SIGINT", () => {
    stopped = true;
    console.log("\nDayandırılır, endirilənlər saxlanılır…");
  });

  const save = async () => {
    const out = JSON.stringify(players, null, 2) + "\n";
    for (const t of TARGETS) if (await exists(t)) await writeFile(t, out, "utf8");
    await writeFile(CREDITS, JSON.stringify(credits, null, 2) + "\n", "utf8");
    if (fixed.size) {
      const keep = bad.lines.filter((l) => {
        const k = norm(l.replace(/#.*/, "").trim());
        return !k || !fixed.has(k);
      });
      await writeFile(BAD, keep.join("\n"), "utf8");
    }
  };

  const setPhoto = async (p, name, buf) => {
    const old = p.photo_url?.startsWith("/images/players/") ? path.join(OUT_DIR, path.basename(p.photo_url)) : null;
    await writeFile(path.join(OUT_DIR, name), buf);
    if (old && path.basename(old) !== name && (await exists(old))) await unlink(old).catch(() => {});
    p.photo_url = `/images/players/${name}`;
    if (isBad(p)) {
      fixed.add(norm(p.slug));
      fixed.add(norm(p.name));
    }
  };

  // 1) Wikidata
  let done = 0,
    failed = 0;
  for (const { p, file } of wdJobs) {
    if (stopped) break;
    try {
      const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=${WIDTH}`;
      const res = await politeFetch(url);
      const type = res.headers.get("content-type") ?? "";
      if (type && !type.startsWith("image/")) throw new Error(`şəkil deyil (${type})`);
      await setPhoto(p, `${p.slug}${extOf(file)}`, Buffer.from(await res.arrayBuffer()));
      credits[p.slug] = { file, source: "wikidata" };
      done++;
    } catch {
      failed++;
    }
    process.stdout.write(`\r   Wikidata: ${done + failed}/${wdJobs.length} · endirildi: ${done} · alınmadı: ${failed}   `);
    if ((done + failed) % 50 === 0) await save();
    await sleep(WIKI_DELAY);
  }
  await save();
  if (wdJobs.length) process.stdout.write("\n");

  // 2) API-Football
  if (!NO_API && apiJobs.length && !stopped) {
    // Şəkli olmayan oyunçu üçün api-sports boz siluet qaytarır — onu tanıyıb atırıq.
    let placeholder = null;
    try {
      placeholder = md5(Buffer.from(await (await politeFetch(API_SPORTS_IMG(999999999))).arrayBuffer()));
    } catch {
      /* 404 qaytarırsa siluet yoxdur */
    }
    let got = 0,
      none = 0,
      err = 0;
    for (const p of apiJobs) {
      if (stopped) break;
      try {
        const res = await politeFetch(API_SPORTS_IMG(apiOf.get(p.id)));
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1500 || md5(buf) === placeholder) {
          credits[p.slug] = { source: "api-sports-none" };
          none++;
        } else {
          await setPhoto(p, `${p.slug}.png`, buf);
          credits[p.slug] = { source: "api-sports", id: apiOf.get(p.id) };
          got++;
        }
      } catch (e) {
        if (/HTTP 404/.test(e.message)) {
          credits[p.slug] = { source: "api-sports-none" };
          none++;
        } else err++;
      }
      process.stdout.write(
        `\r   API-Football: ${got + none + err}/${apiJobs.length} · şəkil: ${got} · yoxdur: ${none} · xəta: ${err}   `,
      );
      if ((got + none + err) % 100 === 0) await save();
      await sleep(API_DELAY);
    }
    await save();
    process.stdout.write("\n");
  }

  const total = players.filter((p) => p.photo_url).length;
  console.log(`\nHazırdır. İndi ${total}/${players.length} oyunçunun şəkli var.`);
  if (fixed.size) console.log("Düzəldilən səhv şəkillər bad-photos.txt-dən silindi.");
}

main().catch((e) => {
  console.error(`Xəta: ${e.message}`);
  process.exit(1);
});
