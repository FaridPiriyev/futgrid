import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const TARGETS = ["public/data/players.json", "../packages/game-core/data/players.json"];
const IDS = "src/data/player-ids.json";
const MANUAL_DIR = "src/assets/players";
const OUT_DIR = "public/images/players";
const CREDITS = "data-raw/images/players-credits.json";
const SPARQL = "https://query.wikidata.org/sparql";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const UA = "FutgridImageFetcher/1.3 (https://futgrid.az; football quiz game image sync)";
const WIDTH = 330;
const DELAY = 800;
const MIN_AGE = 19;
const MAX_AGE = 33;

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const PICK = args.includes("--pick");
const opt = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};
const LIMIT = Number(opt("--limit", 1000));
const ONLY = opt("--only", "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

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
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

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
    if (res.status === 404 || res.status === 400) throw new Error(`HTTP ${res.status}`);
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.max((Number(res.headers.get("retry-after")) || 0) * 1000, 20000 * 2 ** attempt);
      console.log(`\n   ...Wikimedia gözlət dedi (HTTP ${res.status}), ${Math.round(wait / 1000)} san. gözləyirəm`);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
  throw new Error("çox cəhd alınmadı");
}

const TROPHY_WEIGHT = { ballon_dor: 3, world_cup: 1.5, ucl: 1, euro: 0.8, copa_america: 0.8 };
function fame(p) {
  const value = Math.max(p.market_value?.highest_eur ?? 0, 1e5);
  let t = 0;
  for (const tr of p.trophies ?? []) t += (TROPHY_WEIGHT[tr.id] ?? 0) * Math.min(tr.count ?? 1, 5);
  return Math.max(0, Math.log10(value / 1e6)) * 1.2 + Math.min(p.international?.caps ?? 0, 150) / 60 + Math.min(t, 6);
}

async function commonsCategories(tmIds) {
  const out = new Map();
  for (let i = 0; i < tmIds.length; i += 200) {
    const group = tmIds.slice(i, i + 200);
    const query = `SELECT ?tm ?cat WHERE { VALUES ?tm { ${group
      .map((id) => JSON.stringify(String(id)))
      .join(" ")} } ?p wdt:P2446 ?tm ; wdt:P373 ?cat . }`;
    const res = await politeFetch(SPARQL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/sparql-results+json" },
      body: new URLSearchParams({ query }).toString(),
    });
    const data = await res.json();
    for (const b of data.results?.bindings ?? []) if (b.tm?.value && b.cat?.value) out.set(b.tm.value, b.cat.value);
    await sleep(1000);
  }
  return out;
}

async function categoryByName(person) {
  const year = Number(person.birth_date?.slice(0, 4));
  if (!year) return null;
  const query = `SELECT ?cat WHERE { ?p wdt:P106 wd:Q937857 ; wdt:P569 ?b ; wdt:P373 ?cat .
    { ?p rdfs:label ${JSON.stringify(person.name)}@en } UNION { ?p skos:altLabel ${JSON.stringify(person.name)}@en }
    FILTER(YEAR(?b) = ${year}) } LIMIT 2`;
  const res = await politeFetch(SPARQL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/sparql-results+json" },
    body: new URLSearchParams({ query }).toString(),
  });
  const rows = (await res.json()).results?.bindings ?? [];
  const cats = [...new Set(rows.map((r) => r.cat?.value).filter(Boolean))];
  return cats.length === 1 ? cats[0] : null;
}

async function commonsQuery(params) {
  const res = await politeFetch(`${COMMONS}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`);
  return res.json();
}

async function categoryFiles(cat) {
  const files = [];
  const take = async (title) => {
    const data = await commonsQuery({
      action: "query",
      generator: "categorymembers",
      gcmtitle: `Category:${title}`,
      gcmtype: "file",
      gcmlimit: "100",
      prop: "imageinfo",
      iiprop: "url|size|extmetadata",
      iiurlwidth: String(WIDTH),
      iiextmetadatafilter: "DateTimeOriginal|DateTime",
    });
    for (const page of data.query?.pages ?? []) {
      const ii = page.imageinfo?.[0];
      if (!ii?.thumburl) continue;
      const raw = `${ii.extmetadata?.DateTimeOriginal?.value ?? ""} ${page.title}`;
      const year = Number(raw.match(/\b(19[3-9]\d|20[0-2]\d)\b/)?.[1]) || null;
      files.push({ title: page.title.replace(/^File:/, ""), url: ii.thumburl, w: ii.width, h: ii.height, year });
    }
  };
  await take(cat);
  await sleep(DELAY);
  const subs = await commonsQuery({ action: "query", list: "categorymembers", cmtitle: `Category:${cat}`, cmtype: "subcat", cmlimit: "50" });
  for (const s of (subs.query?.categorymembers ?? []).slice(0, 12)) {
    await sleep(DELAY);
    await take(s.title.replace(/^Category:/, "")).catch(() => {});
  }
  return files;
}

const NOT_PHOTO =
  /\b(mural|mur|wall|graffiti|painting|drawing|caricature|cartoon|illustration|cover|magazine|revista|el ?grafi(co|to)|poster|stamp|sello|card|sticker|panini|figurine|wax|tussauds|statue|bust|banner|tifo|flag|jersey|shirt|boots|signature|autograph|grave|logo)\b/i;
const GROUP = /\b(team|squad|line-?up|players|vs\.?|versus|match|stadium|coach|manager|press|conference|award|ceremony|wedding|with|and|und|e|y|et)\b/i;

function pickPrime(files, person) {
  const born = Number(person.birth_date?.slice(0, 4));
  if (!born) return null;
  const nameWords = norm(person.name).split(" ").filter((w) => w.length > 2);
  const scored = files
    .filter((f) => f.year && /\.(jpe?g|png|webp)$/i.test(f.title) && !NOT_PHOTO.test(norm(f.title)))
    .map((f) => {
      const age = f.year - born;
      if (age < MIN_AGE || age > MAX_AGE) return null;
      const t = norm(f.title);
      if (!nameWords.some((w) => t.split(" ").includes(w))) return null;
      const paren = norm((f.title.match(/\(([^)]*)\)/g) ?? []).join(" ").replace(/crop(ped)?|\d+/gi, ""));
      if (paren && !nameWords.some((w) => paren.includes(w))) return null;
      let score = 10 - Math.abs(age - 27) * 0.5;
      if (f.h >= f.w) score += 3;
      if (/crop/i.test(f.title)) score += 2;
      if (GROUP.test(t)) score -= 5;
      if (f.w < 200) score -= 4;
      return { ...f, age, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored[0] ?? null;
}

function candidates(files, person) {
  const born = Number(person.birth_date?.slice(0, 4));
  if (!born) return [];
  const nameWords = norm(person.name).split(" ").filter((w) => w.length > 2);
  return files
    .filter((f) => f.year && /\.(jpe?g|png|webp)$/i.test(f.title) && !NOT_PHOTO.test(norm(f.title)))
    .map((f) => {
      const age = f.year - born;
      if (age < MIN_AGE - 2 || age > MAX_AGE + 2) return null;
      const t = norm(f.title);
      let score = 10 - Math.abs(age - 27) * 0.5;
      if (nameWords.some((w) => t.split(" ").includes(w))) score += 4;
      if (f.h >= f.w) score += 3;
      if (/crop/i.test(f.title)) score += 2;
      if (GROUP.test(t)) score -= 4;
      return { title: f.title, url: f.url, year: f.year, age, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 16);
}

function pickerHtml(items) {
  return `<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Əfsanələr — şəkil seç</title>
<style>
body{margin:0;font:14px system-ui,sans-serif;background:#0b0e14;color:#e5e7eb}
header{position:sticky;top:0;z-index:2;display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 16px;background:#111827;border-bottom:1px solid #1f2937}
button{padding:9px 16px;border-radius:8px;border:0;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}
section{padding:14px 16px;border-bottom:1px solid #1f2937}
h3{margin:0 0 8px;font-size:16px}h3 small{color:#9ca3af;font-weight:400}
.row{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px}
.c{flex:0 0 120px;cursor:pointer;border:3px solid transparent;border-radius:8px;overflow:hidden;background:#111827}
.c.on{border-color:#22c55e}.c.cur{cursor:default;opacity:.8;border-color:#374151}
.c img{width:120px;height:150px;object-fit:cover;object-position:top;display:block;background:#1f2937}
.c div{padding:4px 6px;font-size:11px;color:#9ca3af}
</style></head><body>
<header><strong>${items.length} əfsanə</strong><span id="cnt">0 seçilib</span>
<button id="save">Seçimləri yadda saxla</button>
<small style="color:#9ca3af">Hər oyunçu üçün bir şəklə klik et (yaşıl olur). Bəyənmədiyini keç — köhnə şəkli qalacaq.</small></header>
${items
  .map(
    (it) => `<section><h3>${it.name} <small>${it.born}</small></h3><div class="row">
<div class="c cur"><img src="${it.current}" onerror="this.style.visibility='hidden'"><div>indiki şəkil</div></div>
${it.cands
  .map(
    (c, i) =>
      `<div class="c" data-s="${it.slug}" data-i="${i}"><img loading="lazy" src="${c.url}"><div>${c.year} · ${c.age} yaş</div></div>`,
  )
  .join("")}</div></section>`,
  )
  .join("")}
<script>
const DATA=${JSON.stringify(Object.fromEntries(items.map((it) => [it.slug, it.cands])))};
const KEY="fg-prime-choices";
const pick=JSON.parse(localStorage.getItem(KEY)||"{}");
const cnt=document.getElementById("cnt");
function paint(){document.querySelectorAll(".c[data-s]").forEach(el=>el.classList.toggle("on",pick[el.dataset.s]===+el.dataset.i));cnt.textContent=Object.keys(pick).length+" seçilib";}
document.body.addEventListener("click",e=>{const el=e.target.closest(".c[data-s]");if(!el)return;const s=el.dataset.s,i=+el.dataset.i;if(pick[s]===i)delete pick[s];else pick[s]=i;localStorage.setItem(KEY,JSON.stringify(pick));paint();});
document.getElementById("save").onclick=()=>{const out={};for(const[s,i]of Object.entries(pick)){const c=DATA[s]?.[i];if(c)out[s]={title:c.title,url:c.url,year:c.year};}
const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"}));a.download="prime-choices.json";a.click();};
paint();
</script></body></html>`;
}

async function applyChoices(file) {
  const choices = await readJson(file, null);
  if (!choices) throw new Error(`${file} tapılmadı`);
  const players = await readJson(TARGETS[0], null);
  const credits = await readJson(CREDITS, {});
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(CREDITS), { recursive: true });
  const bySlug = new Map(players.map((p) => [p.slug, p]));
  let done = 0;
  for (const [slug, c] of Object.entries(choices)) {
    const p = bySlug.get(slug);
    if (!p || !c?.url) continue;
    try {
      const res = await politeFetch(c.url);
      const ext = (path.extname(new URL(c.url).pathname).toLowerCase() || ".jpg").replace(".jpeg", ".jpg");
      const name = `${slug}${ext}`;
      const old = p.photo_url?.startsWith("/images/players/") ? path.join(OUT_DIR, path.basename(p.photo_url)) : null;
      await writeFile(path.join(OUT_DIR, name), Buffer.from(await res.arrayBuffer()));
      if (old && path.basename(old) !== name && (await exists(old))) await unlink(old).catch(() => {});
      p.photo_url = `/images/players/${name}`;
      credits[slug] = { file: c.title, source: "commons-prime", year: c.year };
      done++;
      process.stdout.write(`\r   ${done} şəkil qoyuldu   `);
    } catch (e) {
      console.log(`\n${p.name}: ${e.message}`);
    }
    await sleep(DELAY);
  }
  const out = JSON.stringify(players, null, 2) + "\n";
  for (const t of TARGETS) if (await exists(t)) await writeFile(t, out, "utf8");
  await writeFile(CREDITS, JSON.stringify(credits, null, 2) + "\n", "utf8");
  console.log(`\nHazırdır: ${done} əfsanənin şəkli dəyişdi.`);
}

async function main() {
  const applyFile = opt("--apply", null);
  if (applyFile) return applyChoices(applyFile);

  const players = await readJson(TARGETS[0], null);
  if (!players) throw new Error(`${TARGETS[0]} tapılmadı — futgrid_app qovluğunda işlət`);
  const ids = await readJson(IDS, {});
  const tmOf = new Map();
  for (const [key, ourId] of Object.entries(ids)) if (key.startsWith("tm:")) tmOf.set(ourId, key.slice(3));
  const manual = new Set();
  if (await exists(MANUAL_DIR)) for (const f of await readdir(MANUAL_DIR)) manual.add(norm(f.replace(/\.[^.]+$/, "")));
  const credits = await readJson(CREDITS, {});

  let legends = players.filter(
    (p) =>
      p.is_active === false &&
      !manual.has(norm(p.slug)) &&
      !manual.has(norm(p.name)) &&
      credits[p.slug]?.source !== "commons-prime",
  );
  if (ONLY.length) legends = legends.filter((p) => ONLY.some((w) => p.name.toLowerCase().includes(w)));
  else
    legends = legends
      .sort((a, b) => fame(b) - fame(a))
      .slice(0, LIMIT);

  console.log(`${legends.length} əfsanə üçün Commons kateqoriyası axtarılır…`);
  const byTm = await commonsCategories(legends.filter((p) => tmOf.has(p.id)).map((p) => tmOf.get(p.id)));
  const cats = new Map();
  for (const p of legends) if (tmOf.has(p.id) && byTm.has(tmOf.get(p.id))) cats.set(p.id, byTm.get(tmOf.get(p.id)));
  const noTm = legends.filter((p) => !tmOf.has(p.id) && p.birth_date);
  for (let i = 0; i < noTm.length; i++) {
    try {
      const cat = await categoryByName(noTm[i]);
      if (cat) cats.set(noTm[i].id, cat);
    } catch {
    }
    process.stdout.write(`\r   Ad ilə axtarılan əfsanələr: ${i + 1}/${noTm.length}   `);
    await sleep(DELAY);
  }
  if (noTm.length) process.stdout.write("\n");
  const todo = legends.filter((p) => cats.has(p.id));
  console.log(`${todo.length}-nin Commons kateqoriyası var, onların şəkillərinə baxılır (~${Math.ceil((todo.length * 6 * DELAY) / 60000)} dəq).`);

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(CREDITS), { recursive: true });
  let stopped = false;
  process.on("SIGINT", () => {
    stopped = true;
    console.log("\nDayandırılır, hazır olanlar saxlanılır…");
  });
  const save = async () => {
    if (DRY) return;
    const out = JSON.stringify(players, null, 2) + "\n";
    for (const t of TARGETS) if (await exists(t)) await writeFile(t, out, "utf8");
    await writeFile(CREDITS, JSON.stringify(credits, null, 2) + "\n", "utf8");
  };

  if (PICK) {
    const items = [];
    for (let i = 0; i < todo.length && !stopped; i++) {
      const p = todo[i];
      try {
        const cands = candidates(await categoryFiles(cats.get(p.id)), p);
        if (cands.length)
          items.push({
            slug: p.slug,
            name: p.name,
            born: p.birth_date?.slice(0, 4) ?? "",
            current: p.photo_url?.startsWith("/") ? `../public${p.photo_url}` : (p.photo_url ?? ""),
            cands,
          });
      } catch {
      }
      process.stdout.write(`\r   ${i + 1}/${todo.length} · seçim üçün şəkli olan: ${items.length}   `);
      await sleep(DELAY);
    }
    await mkdir("data-raw", { recursive: true });
    await writeFile("data-raw/prime-picker.html", pickerHtml(items), "utf8");
    console.log(`\n\nHazırdır: data-raw/prime-picker.html (${items.length} əfsanə). Faylı brauzerdə aç.`);
    return;
  }

  let changed = 0,
    noPrime = 0,
    failed = 0;
  for (let i = 0; i < todo.length && !stopped; i++) {
    const p = todo[i];
    try {
      const best = pickPrime(await categoryFiles(cats.get(p.id)), p);
      if (!best) {
        noPrime++;
      } else if (DRY) {
        console.log(`\n  ${p.name.padEnd(26)} ${best.year} (${best.age} yaş)  ${best.title}`);
        changed++;
      } else {
        const res = await politeFetch(best.url);
        const ext = (path.extname(new URL(best.url).pathname).toLowerCase() || ".jpg").replace(".jpeg", ".jpg");
        const name = `${p.slug}${ext}`;
        const old = p.photo_url?.startsWith("/images/players/") ? path.join(OUT_DIR, path.basename(p.photo_url)) : null;
        await writeFile(path.join(OUT_DIR, name), Buffer.from(await res.arrayBuffer()));
        if (old && path.basename(old) !== name && (await exists(old))) await unlink(old).catch(() => {});
        p.photo_url = `/images/players/${name}`;
        credits[p.slug] = { file: best.title, source: "commons-prime", year: best.year };
        changed++;
      }
    } catch {
      failed++;
    }
    process.stdout.write(`\r   ${i + 1}/${todo.length} · yeni şəkil: ${changed} · oynadığı illərdən şəkil yoxdur: ${noPrime} · xəta: ${failed}   `);
    if ((i + 1) % 20 === 0) await save();
    await sleep(DELAY);
  }
  await save();
  console.log(DRY ? "\n\n--dry: heç nə endirilmədi." : `\n\nHazırdır: ${changed} əfsanənin şəkli oynadığı illərdən olanla əvəz edildi.`);
}

main().catch((e) => {
  console.error(`Xəta: ${e.message}`);
  process.exit(1);
});
