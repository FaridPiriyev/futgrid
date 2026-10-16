#!/usr/bin/env node
/**
 * clubs.json-dakı hər klub üçün loqo linkini Wikipedia API-dən tapıb yazır.
 * Node.js 18+ lazımdır (daxili fetch). Heç bir npm paketi tələb olunmur.
 *
 * İstifadə:
 *   node fetch-logos.mjs clubs.json
 *     -> clubs_with_logos.json + logo_report.csv
 *
 *   node fetch-logos.mjs clubs.json --download public/logos --base-url /logos
 *     -> loqoları public/logos/<slug>.png kimi yükləyir,
 *        logo_url-u "/logos/<slug>.png" edir (React/Vite/Next public qovluğu üçün)
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const API = "https://en.wikipedia.org/w/api.php";
const UA = "FutgridLogoFetcher/1.0 (futgrid.az; logo sync script)";
const THUMB = 200;

// Adı qısa/çoxmənalı olan klublar üçün dəqiq Wikipedia səhifə adları (slug -> title)
export const TITLES = {
  arsenal: "Arsenal F.C.", liverpool: "Liverpool F.C.", chelsea: "Chelsea F.C.",
  everton: "Everton F.C.", fulham: "Fulham F.C.", brentford: "Brentford F.C.",
  burnley: "Burnley F.C.", sunderland: "Sunderland A.F.C.", middlesbrough: "Middlesbrough F.C.",
  southampton: "Southampton F.C.", aberdeen: "Aberdeen F.C.", hibernian: "Hibernian F.C.",
  celtic: "Celtic F.C.", rangers: "Rangers F.C.",
  juventus: "Juventus FC", lazio: "SS Lazio", napoli: "SSC Napoli", genoa: "Genoa CFC",
  lecce: "US Lecce", empoli: "Empoli FC", udinese: "Udinese Calcio", atalanta: "Atalanta BC",
  bologna: "Bologna FC 1909", fiorentina: "ACF Fiorentina", cagliari: "Cagliari Calcio",
  parma: "Parma Calcio 1913", pisa: "Pisa SC", sassuolo: "US Sassuolo Calcio",
  venezia: "Venezia FC", sampdoria: "UC Sampdoria", palermo: "Palermo FC",
  ajax: "AFC Ajax", feyenoord: "Feyenoord", vitesse: "SBV Vitesse", telstar: "SC Telstar",
  excelsior: "Excelsior Rotterdam",
  reims: "Stade de Reims", nantes: "FC Nantes", montpellier: "Montpellier HSC",
  strasbourg: "RC Strasbourg Alsace",
  galatasaray: "Galatasaray S.K. (football)", fenerbahce: "Fenerbahçe S.K. (football)",
  besiktas: "Beşiktaş J.K.", trabzonspor: "Trabzonspor", basaksehir: "İstanbul Başakşehir F.K.",
  partizan: "FK Partizan", rosenborg: "Rosenborg BK", aik: "AIK Fotboll", lask: "LASK",
  flamengo: "CR Flamengo", palmeiras: "Sociedade Esportiva Palmeiras", "sao-paulo": "São Paulo FC",
  corinthians: "Sport Club Corinthians Paulista", gremio: "Grêmio Foot-Ball Porto Alegrense",
  fluminense: "Fluminense FC", cruzeiro: "Cruzeiro Esporte Clube", santos: "Santos FC",
  bahia: "Esporte Clube Bahia", fortaleza: "Fortaleza Esporte Clube",
  internacional: "Sport Club Internacional", botafogo: "Botafogo de Futebol e Regatas",
  independiente: "Club Atlético Independiente", "racing-club": "Racing Club de Avellaneda",
  nacional: "Club Nacional de Football", penarol: "Peñarol", "colo-colo": "Colo-Colo",
  monterrey: "C.F. Monterrey", sepahan: "Sepahan S.C.", persepolis: "Persepolis F.C.",
  esteghlal: "Esteghlal F.C.", millonarios: "Millonarios F.C.",
  "qarabag-fk": "Qarabağ FK", "neftci-pfk": "Neftçi PFK", "sabah-fk": "Sabah FK",
  "zire-fk": "Zira FK", "sumqayit-fk": "Sumgayit FK", "turan-tovuz": "Turan Tovuz PFK",
  "araz-naxcivan": "Araz-Naxçıvan PFK", "qebele-fk": "Gabala FC", "samaxi-fk": "Shamakhi FK",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export let api = async (params, retries = 3) => {
  const qs = new URLSearchParams({ ...params, format: "json", formatversion: "2" });
  const res = await politeFetch(`${API}?${qs}`);
  return await res.json();
};

// 429 (çox sorğu) və ya 5xx gələndə gözləyib yenidən cəhd edir
async function politeFetch(url, retries = 7) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA } });
    } catch (e) {
      if (attempt >= retries) throw e;
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(5000 * 2 ** attempt, 120000);
      console.log(`   ...Wikipedia gözlət dedi (HTTP ${res.status}), ${Math.round(wait / 1000)} san. gözləyirəm`);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${res.status}`);
  }
}
export const setApi = (fn) => { api = fn; };

const IMG = {
  prop: "pageimages|pageprops", piprop: "thumbnail", pithumbsize: String(THUMB),
  pilicense: "any", ppprop: "disambiguation",
};

function pick(pages = []) {
  for (const p of pages) {
    if (p.missing || (p.pageprops && "disambiguation" in p.pageprops)) continue;
    const thumb = p.thumbnail?.source;
    if (thumb) return [p.title, thumb];
  }
  return [null, null];
}

export async function lookup(club) {
  const title = TITLES[club.slug];
  if (title) {
    const data = await api({ action: "query", titles: title, redirects: "1", ...IMG });
    const [t, u] = pick(data?.query?.pages);
    if (u) return [t, u, "title"];
  }
  for (const q of [`${club.name} football club`, club.name]) {
    const data = await api({
      action: "query", generator: "search", gsrsearch: q,
      gsrlimit: "3", gsrnamespace: "0", ...IMG,
    });
    const pages = [...(data?.query?.pages ?? [])].sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
    const [t, u] = pick(pages);
    if (u) return [t, u, "search"];
  }
  return [null, null, "not_found"];
}

async function download(url, file) {
  const res = await politeFetch(url);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

function parseArgs(argv) {
  const a = { out: "clubs_with_logos.json", report: "logo_report.csv", delay: 1500 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--out") a.out = argv[++i];
    else if (k === "--report") a.report = argv[++i];
    else if (k === "--download") a.download = argv[++i];
    else if (k === "--base-url") a.baseUrl = argv[++i];
    else if (k === "--delay") a.delay = Number(argv[++i]);
    else a.clubs = k;
  }
  if (!a.clubs) throw new Error("İstifadə: node fetch-logos.mjs clubs.json [--download DIR --base-url URL]");
  if (a.baseUrl && !a.download) throw new Error("--base-url yalnız --download ilə birlikdə işləyir");
  return a;
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const clubs = JSON.parse(await readFile(a.clubs, "utf8"));
  if (a.download) await mkdir(a.download, { recursive: true });

  // Artıq yüklənmiş loqolar (yenidən işə salanda təkrar yüklənmir)
  const existing = new Map();
  if (a.download) {
    for (const f of await readdir(a.download)) {
      const ext = path.extname(f);
      if (ext) existing.set(f.slice(0, -ext.length), f);
    }
  }
  const base = a.baseUrl ? a.baseUrl.replace(/\/+$/, "") : null;

  const rows = [];
  const save = async () => {
    await writeFile(a.out, JSON.stringify(clubs, null, 2) + "\n", "utf8");
    const csv = [["id", "name", "wikipedia_title", "method", "logo_url"], ...rows]
      .map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
    await writeFile(a.report, csv, "utf8");
  };

  let found = 0;
  for (const [i, c] of clubs.entries()) {
    let title = "", url, how;
    const have = existing.get(c.slug);
    if (have) {
      url = base ? `${base}/${have}` : c.logo_url;
      how = "cached";
    } else {
      try {
        [title, url, how] = await lookup(c);
      } catch (e) {
        [title, url, how] = [null, null, `error: ${e.message}`];
      }
      if (url && a.download) {
        const ext = path.extname(new URL(url).pathname) || ".png";
        const fname = `${c.slug}${ext}`;
        try {
          await download(url, path.join(a.download, fname));
          if (base) url = `${base}/${fname}`;
        } catch (e) {
          how = `download_error: ${e.message}`;
          url = null;
        }
      }
      await sleep(a.delay);
    }
    if (url) found++;
    c.logo_url = url ?? null;
    rows.push([c.id, c.name, title ?? "", how, c.logo_url ?? ""]);
    console.log(`[${i + 1}/${clubs.length}] ${c.name.padEnd(32)} ${how.padEnd(10)} ${title || "-"}`);
    if ((i + 1) % 10 === 0) await save(); // hər 10 klubdan bir yadda saxla
  }

  await save();
  const missing = clubs.filter((c) => !c.logo_url).map((c) => c.name);
  console.log(`\nHazırdır: ${found}/${clubs.length} klubun loqosu tapıldı -> ${a.out}`);
  if (missing.length) {
    console.log(`Loqosu olmayanlar (${missing.length}): ${missing.join(", ")}`);
    console.log("Eyni əmri bir daha işə salın: yüklənmişlər ötürüləcək, qalanlar yenidən yoxlanacaq.");
  }
  console.log(`Yoxlama üçün hesabat: ${a.report} (method=search olanlara bir nəzər salın)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
