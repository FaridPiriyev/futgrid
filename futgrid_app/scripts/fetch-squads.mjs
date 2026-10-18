#!/usr/bin/env node
/**
 * API-Football-dan clubs.json-dakı bütün klubların indiki heyətlərini çəkir.
 * Node.js 18+ lazımdır. Heç bir npm paketi tələb olunmur.
 *
 * Quraşdırma:
 *   futgrid_app/.env faylına bir sətir yazın:
 *     API_FOOTBALL_KEY=sizin_acariniz
 *
 * İşə salma (futgrid_app qovluğundan):
 *   node scripts/fetch-squads.mjs          yalnız heyəti az olan klublar (public/data/players.json-a görə)
 *   node scripts/fetch-squads.mjs --all    bütün klublar
 *
 * Gündə bir dəfə işə salın. Gündəlik limit bitəndə skript özü dayanır,
 * növbəti gün qaldığı yerdən davam edir. Hər cavab diskdə saxlanılır,
 * ona görə heç bir sorğu iki dəfə xərclənmir.
 *
 * Nəticə (data-raw/api-football/ qovluğunda):
 *   team-map.json   bizim klub -> API-Football komandası (yoxlamaq üçün)
 *   squads/<slug>.json   hər klubun heyəti
 *   cache/               API cavabları (silməyin, sorğulara qənaət edir)
 */
import { readFile, writeFile, mkdir, access, rename } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const API = "https://v3.football.api-sports.io";
const OUT = "data-raw/api-football";
const SEASONS = [2026, 2025, 2024, 2023]; // pulsuz plan bəzi mövsümləri bağlaya bilər
const DELAY_MS = 7000; // pulsuz planda dəqiqəlik limit də var (~10/dəq)

// Bizim liqa adlarımız -> API-Football-dakı ehtimal olunan adlar
const LEAGUE_ALIASES = {
  "Premier League": ["Premier League"],
  Championship: ["Championship"],
  "Scottish Premiership": ["Premiership"],
  "La Liga": ["La Liga"],
  "Segunda División": ["Segunda División"],
  Bundesliga: ["Bundesliga"],
  "2. Bundesliga": ["2. Bundesliga"],
  "Serie A": ["Serie A"],
  "Serie B": ["Serie B"],
  "Ligue 1": ["Ligue 1"],
  "Ligue 2": ["Ligue 2"],
  Eredivisie: ["Eredivisie"],
  "Primeira Liga": ["Primeira Liga", "Liga Portugal"],
  "Belgian Pro League": ["Jupiler Pro League", "Pro League"],
  "Süper Lig": ["Süper Lig"],
  "Austrian Bundesliga": ["Bundesliga"],
  "Swiss Super League": ["Super League"],
  "Danish Superliga": ["Superliga"],
  Eliteserien: ["Eliteserien"],
  Allsvenskan: ["Allsvenskan"],
  Veikkausliiga: ["Veikkausliiga"],
  "Super League Greece": ["Super League 1", "Super League"],
  "Czech First League": ["Czech Liga", "1. Liga"],
  "Prva HNL": ["HNL", "1. HNL"],
  Ekstraklasa: ["Ekstraklasa"],
  "Liga I": ["Liga I"],
  "First Professional Football League": ["First League", "Parva Liga"],
  "Nemzeti Bajnokság I": ["NB I"],
  "Serbian SuperLiga": ["Super Liga"],
  "Ukrainian Premier League": ["Premier League"],
  "Russian Premier League": ["Premier League"],
  "Israeli Premier League": ["Ligat Ha'al", "Premier League"],
  "Moldovan Super Liga": ["Super Liga"],
  "Slovak First Football League": ["Super Liga", "Nike liga"],
  "Slovenian PrvaLiga": ["1. SNL", "PrvaLiga"],
  "Cypriot First Division": ["1. Division", "First Division"],
  "Kazakhstan Premier League": ["Premier League"],
  "Erovnuli Liga": ["Erovnuli Liga"],
  "League of Ireland Premier Division": ["Premier Division"],
  "Azerbaijan Premier League": ["Premyer Liqa", "Premier League"],
  MLS: ["Major League Soccer", "MLS"],
  "Liga MX": ["Liga MX"],
  "Brasileirão Série A": ["Serie A"],
  "Liga Profesional": ["Liga Profesional Argentina", "Liga Profesional"],
  "Primera División": ["Primera División", "Primera Division"],
  "Categoría Primera A": ["Primera A"],
  LigaPro: ["Liga Pro", "LigaPro"],
  "Liga 1": ["Liga 1", "Primera División"],
  "División Profesional": ["Primera División", "División Profesional"],
  "Saudi Pro League": ["Pro League"],
  "Qatar Stars League": ["Stars League"],
  "UAE Pro League": ["Pro League"],
  "Persian Gulf Pro League": ["Persian Gulf Pro League", "Pro League"],
  "Uzbekistan Super League": ["Super League"],
  "J1 League": ["J1 League"],
  "K League 1": ["K League 1"],
  "Chinese Super League": ["Super League"],
  "A-League": ["A-League"],
  "Indian Super League": ["Indian Super League"],
  "Egyptian Premier League": ["Premier League"],
  "Botola Pro": ["Botola Pro"],
  "Premier Soccer League": ["Premier Soccer League"],
  "Tunisian Ligue Professionnelle 1": ["Ligue 1"],
  "Ligue 1 (Algeria)": ["Ligue 1"],
  "Ligue 1 (Côte d'Ivoire)": ["Ligue 1"],
  "Nigeria Premier Football League": ["NPFL", "Premier League"],
  Linafoot: ["Ligue 1", "Linafoot"],
  "Tanzanian Premier League": ["Ligi kuu Bara", "Premier League"],
};

// API-Football-da başqa adla yazılan klublar (slug -> API adları)
const TEAM_ALIASES = {
  "inter-milan": ["Inter"],
  "bayern-munich": ["Bayern München", "Bayern Munchen"],
  "stade-rennais": ["Rennes"],
  "wolverhampton-wanderers": ["Wolves"],
  "olympique-lyonnais": ["Lyon"],
  "olympique-de-marseille": ["Marseille"],
  "paris-saint-germain": ["Paris Saint Germain"],
  "ogc-nice": ["Nice"],
  "slavia-prague": ["Slavia Praha"],
  "sparta-prague": ["Sparta Praha"],
  olympiacos: ["Olympiakos Piraeus", "Olympiacos Piraeus"],
  ferencvaros: ["Ferencvarosi TC"],
  "red-star-belgrade": ["FK Crvena Zvezda", "Crvena Zvezda"],
  "legia-warsaw": ["Legia Warszawa"],
  "rapid-wien": ["Rapid Vienna", "Rapid Wien"],
  "la-galaxy": ["Los Angeles Galaxy"],
  "raja-ca": ["Raja Casablanca"],
  "ulsan-hd": ["Ulsan Hyundai FC", "Ulsan Hyundai"],
  "leeds-united": ["Leeds"],
  "leicester-city": ["Leicester"],
  "ipswich-town": ["Ipswich"],
  "sheffield-united": ["Sheffield Utd"],
  "west-bromwich-albion": ["West Brom"],
  "real-oviedo": ["Oviedo"],
  "real-valladolid": ["Valladolid"],
  "union-sg": ["Union St. Gilloise"],
  "unam-pumas": ["U.N.A.M. - Pumas", "Pumas UNAM"],
  "afc-bournemouth": ["Bournemouth"],
  "brighton-hove-albion": ["Brighton"],
  "tottenham-hotspur": ["Tottenham"],
  "sl-benfica": ["Benfica"],
  "dynamo-kyiv": ["Dynamo Kyiv"],
  "dinamo-zagreb": ["Dinamo Zagreb"],
  "zire-fk": ["Zira", "Zira FK"],
  "qebele-fk": ["Gabala", "Qabala"],
  "neftci-pfk": ["Neftci Baku", "Neftchi Baku"],
  "hapoel-be-er-sheva": ["Hapoel Beer Sheva", "Hapoel Be'er Sheva"],
  "red-bull-bragantino": ["RB Bragantino", "Bragantino"],
  "athletico-paranaense": [
    "Atletico Paranaense",
    "Athletico-PR",
    "Atletico-PR",
  ],
  "estudiantes-de-la-plata": ["Estudiantes L.P.", "Estudiantes"],
  "argentinos-juniors": ["Argentinos JRS", "Argentinos Jrs"],
  "newell-s-old-boys": ["Newells Old Boys", "Newell's Old Boys"],
  "universidad-catolica": ["Universidad Catolica", "U. Catolica"],
  "club-libertad": ["Libertad"],
  "al-qadsiah": ["Al-Qadisiyah", "Al Qadisiyah", "Al-Qadsiah"],
  "al-taawoun": ["Al-Taawoun", "Al Taawon"],
  "shanghai-port": ["Shanghai Port", "Shanghai SIPG"],
  "shandong-taishan": ["Shandong Luneng", "Shandong Taishan"],
  "mohun-bagan-super-giant": [
    "Mohun Bagan",
    "ATK Mohun Bagan",
    "Mohun Bagan SG",
  ],
  "esperance-de-tunis": ["Esperance Tunis", "Esperance de Tunis", "ES Tunis"],
  "rs-berkane": ["RS Berkane", "Berkane"],
};
const namesOf = (c) => [c.name, ...(TEAM_ALIASES[c.slug] ?? [])];

// Ehtiyat, gənclər və qadın komandalarını ayırmaq üçün
const RESERVE =
  /^(w|ii|iii|b|u\d{2}|res|reserves?|women|fem|feminino|femenino|youth)$/;
const isReserveOf = (club, apiName) => {
  const ours = new Set(norm(club.name).split(" "));
  return norm(apiName)
    .split(" ")
    .some((t) => RESERVE.test(t) && !ours.has(t));
};

// ISO kod -> API-Football ölkə adı
const COUNTRY = {
  ES: "Spain",
  DE: "Germany",
  IT: "Italy",
  FR: "France",
  PT: "Portugal",
  NL: "Netherlands",
  BE: "Belgium",
  TR: "Turkey",
  AT: "Austria",
  CH: "Switzerland",
  DK: "Denmark",
  NO: "Norway",
  SE: "Sweden",
  FI: "Finland",
  GR: "Greece",
  CZ: "Czech-Republic",
  HR: "Croatia",
  PL: "Poland",
  RO: "Romania",
  BG: "Bulgaria",
  HU: "Hungary",
  RS: "Serbia",
  UA: "Ukraine",
  RU: "Russia",
  IL: "Israel",
  MD: "Moldova",
  SK: "Slovakia",
  SI: "Slovenia",
  CY: "Cyprus",
  KZ: "Kazakhstan",
  GE: "Georgia",
  IE: "Ireland",
  AZ: "Azerbaijan",
  US: "USA",
  CA: "USA",
  MX: "Mexico",
  BR: "Brazil",
  AR: "Argentina",
  UY: "Uruguay",
  CL: "Chile",
  CO: "Colombia",
  EC: "Ecuador",
  PY: "Paraguay",
  PE: "Peru",
  BO: "Bolivia",
  SA: "Saudi-Arabia",
  QA: "Qatar",
  AE: "United-Arab-Emirates",
  IR: "Iran",
  UZ: "Uzbekistan",
  JP: "Japan",
  KR: "South-Korea",
  CN: "China",
  AU: "Australia",
  IN: "India",
  EG: "Egypt",
  MA: "Morocco",
  ZA: "South-Africa",
  TN: "Tunisia",
  DZ: "Algeria",
  CI: "Ivory-Coast",
  NG: "Nigeria",
  CD: "Congo-DR",
  TZ: "Tanzania",
};
const countryOf = (c) =>
  c.country_id === "GB"
    ? c.league.startsWith("Scottish")
      ? "Scotland"
      : "England"
    : COUNTRY[c.country_id];

// ---------- köməkçilər ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const readJson = async (p, fallback) =>
  (await exists(p)) ? JSON.parse(await readFile(p, "utf8")) : fallback;
const writeJson = (p, v) =>
  writeFile(p, JSON.stringify(v, null, 2) + "\n", "utf8");

const STOP_WORDS = new Set([
  "fc",
  "cf",
  "sc",
  "afc",
  "ac",
  "as",
  "fk",
  "sk",
  "pfk",
  "club",
  "cd",
  "ca",
  "sv",
  "vfl",
  "vfb",
  "tsg",
  "rcd",
  "ud",
  "sl",
  "ssc",
  "us",
  "ss",
  "bk",
  "if",
  "aif",
  "ff",
  "kv",
  "krc",
  "kaa",
  "rc",
  "ogc",
  "the",
  "de",
  "da",
  "do",
  "del",
  "of",
  "and",
  "1",
  "04",
  "05",
  "07",
  "09",
  "1907",
  "1909",
]);
export const norm = (s) =>
  s
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/ø/g, "o")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const tokens = (s) =>
  norm(s)
    .split(" ")
    .filter((t) => t && !STOP_WORDS.has(t));

export function nameScore(a, b) {
  const na = norm(a),
    nb = norm(b);
  if (na === nb) return 1;
  const ta = new Set(tokens(a)),
    tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const jac = inter / new Set([...ta, ...tb]).size;
  const contains =
    [...ta].every((t) => tb.has(t)) || [...tb].every((t) => ta.has(t));
  return Math.max(jac, contains ? 0.8 : 0);
}

export function bestTeam(club, teams) {
  let best = null,
    score = 0,
    second = 0;
  for (const t of teams) {
    if (t.team.national || isReserveOf(club, t.team.name)) continue;
    let s = Math.max(...namesOf(club).map((n) => nameScore(n, t.team.name)));
    if (t.team.code && t.team.code === club.short_name) s += 0.05;
    if (s > score) {
      second = score;
      score = s;
      best = t;
    } else if (s > second) second = s;
  }
  // zəif və ya ikimənalı uyğunluğu qəbul etmirik
  return score >= 0.5 && score - second >= 0.1
    ? { team: best.team, score }
    : null;
}

// ---------- API ----------
class DailyLimit extends Error {}

export function makeApi(key, cacheDir, fetchImpl = fetch, delay = DELAY_MS) {
  let used = 0;
  async function get(endpoint, params = {}, { fresh = false } = {}) {
    const qs = new URLSearchParams(params).toString();
    const file = path.join(
      cacheDir,
      (endpoint + "_" + qs).replace(/[^a-z0-9_=-]+/gi, "_") + ".json",
    );
    if (!fresh && (await exists(file)))
      return JSON.parse(await readFile(file, "utf8"));

    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(`${API}/${endpoint}${qs ? "?" + qs : ""}`, {
        headers: { "x-apisports-key": key },
      });
      used++;
      if (res.status === 429 || res.status >= 500) {
        if (attempt >= 4) throw new Error(`HTTP ${res.status}`);
        await sleep(15000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const errs =
        body.errors && !Array.isArray(body.errors) ? body.errors : {};
      const errText = Object.values(errs).join(" ");
      if (/request limit for the day|requests limit/i.test(errText))
        throw new DailyLimit(errText);
      if (errs.rateLimit) {
        await sleep(65000);
        continue;
      } // dəqiqəlik limit
      if (
        errs.token ||
        /api key|not subscribed|application key/i.test(errText)
      ) {
        throw new Error(`API açarı problemi: ${errText}`);
      }
      const h = res.headers.get("x-ratelimit-requests-remaining");
      const remaining = h === null || h === "" ? NaN : Number(h); // başlıq yoxdursa, 0 saymırıq
      // xətalı cavabı (məs. mövsüm bağlıdır) da yadda saxlayırıq ki, təkrar xərclənməsin
      await writeJson(file, body);
      await sleep(delay);
      if (remaining === 0)
        throw new DailyLimit("qalan sorğu sayı 0 göstərildi");
      return body;
    }
  }
  // Hesabın vəziyyəti: /status gündəlik limitdən sayılmır
  async function status() {
    try {
      const res = await fetchImpl(`${API}/status`, {
        headers: { "x-apisports-key": key },
      });
      const body = await res.json();
      const errText =
        body.errors && !Array.isArray(body.errors)
          ? Object.values(body.errors).join(" ")
          : "";
      if (errText) return { error: errText };
      const r = body.response ?? {};
      return {
        plan: r.subscription?.plan,
        active: r.subscription?.active,
        current: r.requests?.current,
        limit: r.requests?.limit_day,
      };
    } catch (e) {
      return { error: e.message };
    }
  }
  return { get, status, used: () => used };
}

async function loadEnvKey() {
  if (process.env.API_FOOTBALL_KEY) return process.env.API_FOOTBALL_KEY.trim();
  if (await exists(".env")) {
    const line = (await readFile(".env", "utf8"))
      .split(/\r?\n/)
      .find((l) => /^\s*API_FOOTBALL_KEY\s*=/.test(l));
    if (line)
      return line
        .split("=")
        .slice(1)
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
  }
  throw new Error(
    "API açarı tapılmadı. futgrid_app/.env faylına yazın: API_FOOTBALL_KEY=acariniz",
  );
}

// ---------- əsas iş ----------
const MIN_SQUAD = 15;

async function squadCounts(playersPath) {
  if (!(await exists(playersPath))) return null;
  const counts = new Map();
  for (const p of JSON.parse(await readFile(playersPath, "utf8"))) {
    counts.set(p.current_club_id, (counts.get(p.current_club_id) ?? 0) + 1);
  }
  return counts;
}

export async function run({
  clubsPath = "public/data/clubs.json",
  playersPath = "public/data/players.json",
  all = false,
  key,
  fetchImpl,
  delay,
} = {}) {
  key ??= await loadEnvKey();
  const cacheDir = path.join(OUT, "cache"),
    squadDir = path.join(OUT, "squads");
  await mkdir(cacheDir, { recursive: true });
  await mkdir(squadDir, { recursive: true });
  const api = makeApi(key, cacheDir, fetchImpl, delay);

  const allClubs = JSON.parse(await readFile(clubsPath, "utf8"));
  const counts = all ? null : await squadCounts(playersPath);
  const clubs = counts
    ? allClubs
        .filter((c) => (counts.get(c.id) ?? 0) < MIN_SQUAD)
        .sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0))
    : allClubs;
  if (counts)
    console.log(
      `Heyəti ${MIN_SQUAD} oyunçudan az olan ${clubs.length} klub çəkiləcək (hamısı üçün: --all)`,
    );
  const mapPath = path.join(OUT, "team-map.json");
  const map = await readJson(mapPath, {}); // slug -> { api_team_id, api_name, how }
  const saveMap = () => writeJson(mapPath, map);

  const st = await api.status();
  if (st.error && /limit|reached/i.test(st.error)) {
    console.log(
      "Bugünkü sorğu limiti artıq bitib. Sabah yenidən işə salın, qaldığı yerdən davam edəcək.",
    );
    return;
  }
  if (st.error) {
    console.log(`API hesabı yoxlanarkən xəta: ${st.error}`);
    console.log(
      "API açarını .env faylında yoxlayın (boşluq, dırnaq və ya səhv simvol olmasın).",
    );
    return;
  }
  console.log(
    `Plan: ${st.plan ?? "?"} · bu gün istifadə olunub: ${st.current ?? "?"}/${st.limit ?? "?"} sorğu`,
  );
  if (st.limit && st.current >= st.limit) {
    console.log("Bugünkü limit artıq bitib. Sabah yenidən işə salın.");
    return;
  }

  // Köhnə səhv uyğunlaşmaları təmizləyirik (ehtiyat/gənclər komandaları, tapılmayanlar)
  let cleaned = 0;
  for (const c of allClubs) {
    const m = map[c.slug];
    if (!m) continue;
    const reserve = m.api_name && isReserveOf(c, m.api_name);
    if (reserve || (m.how === "not_found" && clubs.includes(c))) {
      delete map[c.slug];
      cleaned++;
      if (!clubs.includes(c)) clubs.push(c);
      const f = path.join(squadDir, `${c.slug}.json`);
      if (reserve && (await exists(f))) await rename(f, f + ".wrong"); // səhv heyət build-players-ə düşməsin
    }
  }
  if (cleaned) {
    await saveMap();
    console.log(`${cleaned} köhnə/səhv uyğunlaşma yenidən yoxlanacaq`);
  }

  let done = 0;
  const fetchSquads = async () => {
    for (const c of clubs) {
      const file = path.join(squadDir, `${c.slug}.json`);
      const id = map[c.slug]?.api_team_id;
      if (!id) continue;
      let retryEmpty = false;
      if (await exists(file)) {
        const old = JSON.parse(await readFile(file, "utf8"));
        if (old.api_team_id === id) {
          if (
            old.players?.length ||
            old.fetched_at === new Date().toISOString().slice(0, 10)
          )
            continue;
          retryEmpty = true;
        }
      }
      const body = await api.get(
        "players/squads",
        { team: id },
        { fresh: retryEmpty },
      );
      const players = body.response?.[0]?.players ?? [];
      if (!players.length)
        console.log(
          `   ${c.name}: API boş heyət qaytardı, sabah yenidən yoxlanacaq`,
        );
      await writeJson(file, {
        club_id: c.id,
        club_slug: c.slug,
        api_team_id: id,
        api_name: map[c.slug].api_name,
        fetched_at: new Date().toISOString().slice(0, 10),
        players,
      });
      done++;
      console.log(`[heyət] ${c.name}: ${players.length} oyunçu`);
      if (c.slug === "fc-barcelona") {
        const rodri = players.some((p) => /rodri\b/i.test(p.name));
        const lewa = players.some((p) => /lewandowski/i.test(p.name));
        console.log(
          `   Yoxlama: Rodri ${rodri ? "var" : "yoxdur"}, Lewandowski ${lewa ? "var" : "yoxdur"} -> ` +
            (rodri && !lewa
              ? "heyətlər 2026-27 mövsümünə aiddir ✓"
              : "heyətlər KÖHNƏ ola bilər, bunu Claude-a göstərin"),
        );
      }
    }
  };

  try {
    // 1) Bütün liqalar: 1 sorğu (artıq yaddaşdadırsa, 0)
    const leagues = (await api.get("leagues")).response ?? [];

    // 2) Hər liqa üçün komandalar, sonra klubları uyğunlaşdırmaq
    const groups = new Map();
    for (const c of clubs) {
      if (map[c.slug]) continue;
      const k = `${countryOf(c)}|${c.league}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
    for (const [k, list] of groups) {
      const [country, ourLeague] = k.split("|");
      const aliases = (LEAGUE_ALIASES[ourLeague] ?? [ourLeague]).map(norm);
      const candidates = leagues.filter(
        (l) => l.country?.name === country && l.league?.type === "League",
      );
      const league = aliases
        .map((a) => candidates.find((l) => norm(l.league.name) === a))
        .find(Boolean);
      if (!league) continue;
      let teams = [];
      for (const season of SEASONS) {
        const body = await api.get("teams", {
          league: league.league.id,
          season,
        });
        if (body.response?.length) {
          teams = body.response;
          break;
        }
      }
      let n = 0;
      for (const c of list) {
        const m = bestTeam(c, teams);
        if (m) {
          map[c.slug] = {
            api_team_id: m.team.id,
            api_name: m.team.name,
            how: `league:${league.league.name}`,
          };
          n++;
        }
      }
      if (n) {
        await saveMap();
        console.log(`✓ ${ourLeague} (${country}): +${n} klub uyğunlaşdı`);
      }
    }

    // 3) Uyğunlaşmış klubların heyətləri (klub başına 1 sorğu)
    await fetchSquads();

    // 4) Uyğunlaşmayanlar üçün ad axtarışı (hər ad variantı üçün 1 sorğu)
    for (const c of clubs) {
      if (map[c.slug]) continue;
      const country = countryOf(c);
      let m = null;
      const queries = [];
      for (const name of namesOf(c)) {
        const words = norm(name)
          .split(" ")
          .filter((t) => !STOP_WORDS.has(t));
        queries.push(words.join(" ") || norm(name));
      }
      const longest = queries
        .flatMap((q) => q.split(" "))
        .sort((a, b) => b.length - a.length)[0];
      if (longest && longest.length >= 5) queries.push(longest);
      for (const q of [...new Set(queries)]) {
        if (q.length < 3) continue;
        const body = await api.get("teams", { search: q.slice(0, 40) });
        const pool = (body.response ?? []).filter(
          (t) => !country || t.team.country === country,
        );
        m = bestTeam(c, pool);
        if (m) break;
      }
      map[c.slug] = m
        ? { api_team_id: m.team.id, api_name: m.team.name, how: "search" }
        : { api_team_id: null, api_name: null, how: "not_found" };
      await saveMap();
      console.log(
        `${m ? "✓" : "✗"} axtarış: ${c.name} -> ${m ? m.team.name : "tapılmadı"}`,
      );
    }

    // 5) Axtarışla tapılanların heyətləri
    await fetchSquads();
    done = clubs.filter((c) => map[c.slug]?.api_team_id).length;
    report(clubs, map, done, api.used(), true);
  } catch (e) {
    if (!(e instanceof DailyLimit)) throw e;
    await saveMap();
    const done = clubs.filter((c) => map[c.slug]?.api_team_id).length;
    console.log(
      `\nDayandı (${api.used()} sorğudan sonra). API-nin cavabı: ${e.message}`,
    );
    console.log(
      "Sabah eyni əmri yenidən işə salın, qaldığı yerdən davam edəcək.",
    );
    report(clubs, map, null, api.used(), false);
  }
}

function report(clubs, map, done, used, finished) {
  const notFound = clubs
    .filter((c) => map[c.slug]?.how === "not_found")
    .map((c) => c.name);
  console.log(`\nBu dəfə istifadə olunan sorğu: ${used}`);
  if (finished)
    console.log(`Hazırdır: ${done} klubun heyəti ${OUT}/squads qovluğundadır.`);
  if (notFound.length) {
    console.log(
      `API-Football-da tapılmayan klublar (${notFound.length}): ${notFound.join(", ")}`,
    );
    console.log(
      `Bunları ${OUT}/team-map.json faylında əl ilə düzəldə bilərsiniz (api_team_id yazın).`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  const clubsPath = args.find((a) => !a.startsWith("--"));
  run({
    ...(clubsPath ? { clubsPath } : {}),
    all: args.includes("--all"),
  }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
