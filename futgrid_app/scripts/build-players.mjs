#!/usr/bin/env node
/**
 * API-Football heyətlərini Transfermarkt datası ilə birləşdirib src/data/players.json yaradır.
 * Node.js 18+ lazımdır. Heç bir npm paketi tələb olunmur.
 *
 * Lazım olanlar (futgrid_app qovluğunda):
 *   src/data/clubs.json
 *   data-raw/api-football/squads/*.json      (fetch-squads.mjs yaradır)
 *   data-raw/transfermarkt/*.csv.gz          (Transfermarkt dataseti)
 *   src/data/players-manual.json             (istəyə görə: əl ilə yazılmış kuboklar)
 *
 * İşə salma:
 *   node scripts/build-players.mjs
 *
 * Nəticə:
 *   src/data/players.json                    oyunçular
 *   data-raw/player-photos.json              şəkil mənbələri (sonra yükləmək üçün)
 *   data-raw/build-report.json               uyğunlaşmayan oyunçular və klublar
 *
 * Heyətlər hələ tam çəkilməyibsə də işləyir: olan heyətləri emal edir.
 */
import { readFile, writeFile, readdir, access } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import path from "node:path";
import { pathToFileURL } from "node:url";

const exists = (p) => access(p).then(() => true, () => false);
const writeJson = (p, v) => writeFile(p, JSON.stringify(v, null, 2) + "\n", "utf8");

// ---------- CSV (gzip) oxuyucu: sətir-sətir, yaddaşa bütöv yükləmir ----------
export async function eachRow(file, onRow) {
  const stream = createReadStream(file).pipe(createGunzip());
  stream.setEncoding("utf8");
  let header = null, row = [], field = "", inQ = false, afterQuote = false, count = 0;
  const emit = () => {
    row.push(field); field = "";
    if (!header) header = row;
    else if (row.length > 1 || row[0] !== "") {
      const o = {};
      for (let i = 0; i < header.length; i++) o[header[i]] = row[i] ?? "";
      onRow(o); count++;
    }
    row = [];
  };
  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (inQ) {
        if (ch === '"') { inQ = false; afterQuote = true; } else field += ch;
        continue;
      }
      if (ch === '"') { if (afterQuote) field += '"'; inQ = true; afterQuote = false; continue; }
      afterQuote = false;
      if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") emit();
      else if (ch !== "\r") field += ch;
    }
  }
  if (field !== "" || row.length) emit();
  return count;
}

// ---------- adlar ----------
export const norm = (s) =>
  String(s ?? "").toLowerCase().replace(/ø/g, "o").replace(/ə/g, "e").replace(/ı/g, "i")
    .replace(/æ/g, "ae").replace(/ß/g, "ss").replace(/đ/g, "d").replace(/ł/g, "l")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const CLUB_STOP = new Set(["fc", "cf", "sc", "afc", "ac", "as", "fk", "sk", "pfk", "club", "cd", "ca", "sv", "vfl",
  "vfb", "tsg", "rcd", "ud", "sl", "ssc", "us", "ss", "bk", "if", "aif", "ff", "kv", "krc", "kaa", "rc", "ogc",
  "the", "de", "da", "do", "del", "of", "and", "sad", "spa", "s", "p", "a", "1", "04", "05", "07", "09", "1907",
  "1909", "1913", "1893", "calcio", "futbol", "football", "clube"]);
const RESERVE = /^(w|ii|iii|b|c|u\d{2}|reserves?|women|fem|feminino|femenino|youth|juvenil|primavera|atletic|castilla)$/;

const clubTokens = (s) => norm(s).split(" ").filter((t) => t && !CLUB_STOP.has(t));
function clubScore(a, b) {
  const na = norm(a), nb = norm(b);
  if (na && na === nb) return 1;
  const ta = new Set(clubTokens(a)), tb = new Set(clubTokens(b));
  if (!ta.size || !tb.size) return 0;
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const jac = inter / new Set([...ta, ...tb]).size;
  // bir ad o birinin içindədirsə: qısa adın uzun ada nisbəti nə qədər azdırsa, bal o qədər aşağı
  const contains = inter && ([...ta].every((t) => tb.has(t)) || [...tb].every((t) => ta.has(t)));
  const ratio = Math.min(ta.size, tb.size) / Math.max(ta.size, tb.size);
  return Math.max(jac, contains ? 0.6 + 0.3 * ratio : 0);
}
const isReserveName = (ourName, otherName) => {
  const ours = new Set(norm(ourName).split(" "));
  return norm(otherName).split(" ").some((t) => RESERVE.test(t) && !ours.has(t));
};

// Transfermarkt-da başqa adla yazılan klublar (bizim slug -> TM adları / kodları)
const TM_ALIASES = {
  "bayern-munich": ["Bayern Munich", "fc-bayern-munchen"], "inter-milan": ["Inter", "inter-mailand"],
  "ac-milan": ["AC Milan", "ac-mailand"], "juventus": ["Juventus", "juventus-turin"],
  "paris-saint-germain": ["Paris Saint-Germain", "fc-paris-saint-germain", "Paris SG", "PSG"], "olympique-de-marseille": ["Marseille"],
  "olympique-lyonnais": ["Olympique Lyon", "olympique-lyon"], "stade-rennais": ["Stade Rennais FC", "Rennes"],
  "wolverhampton-wanderers": ["Wolves"], "tottenham-hotspur": ["Tottenham", "Spurs"],
  "manchester-united": ["Man Utd"], "manchester-city": ["Man City"], "newcastle-united": ["Newcastle"],
  "west-ham-united": ["West Ham"], "brighton-hove-albion": ["Brighton"], "nottingham-forest": ["Nottm Forest"],
  "sl-benfica": ["Benfica"], "sporting-cp": ["Sporting CP", "sporting-lissabon"], "fc-porto": ["FC Porto"],
  "red-star-belgrade": ["Crvena zvezda", "Red Star"], "slavia-prague": ["Slavia Praha"], "sparta-prague": ["Sparta Praha"],
  "legia-warsaw": ["Legia Warszawa"], "rapid-wien": ["Rapid Vienna", "SK Rapid Wien"],
  "ferencvaros": ["Ferencvárosi TC"], "olympiacos": ["Olympiacos Piraeus"], "atletico-madrid": ["Atlético de Madrid", "Atlético Madrid"],
  "real-betis": ["Real Betis Balompié"], "athletic-bilbao": ["Athletic Bilbao", "Athletic Club"],
  "borussia-monchengladbach": ["Borussia Mönchengladbach", "Bor. M'gladbach"], "union-sg": ["Union Saint-Gilloise"],
  "shakhtar-donetsk": ["Shakhtar Donetsk"], "zenit-saint-petersburg": ["Zenit St. Petersburg", "Zenit"],
  "la-galaxy": ["Los Angeles Galaxy"], "inter-miami-cf": ["Inter Miami"], "al-nassr": ["Al-Nassr"],
  "al-hilal": ["Al-Hilal"], "al-ittihad": ["Al-Ittihad"], "al-ahli": ["Al-Ahli"],
};

// ---------- ölkələr: ad -> ISO kod ----------
function buildCountryCodes() {
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  const map = new Map();
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of A) for (const b of A) {
    const code = a + b;
    try { const name = dn.of(code); if (name && name !== code) map.set(norm(name), code); } catch {}
  }
  const extra = {
    "England": "GB-ENG", "Scotland": "GB-SCT", "Wales": "GB-WLS", "Northern Ireland": "GB-NIR",
    "Korea, South": "KR", "South Korea": "KR", "Korea, North": "KP", "Cote d'Ivoire": "CI", "Ivory Coast": "CI",
    "Türkiye": "TR", "Turkey": "TR", "DR Congo": "CD", "Congo": "CG", "Bosnia-Herzegovina": "BA",
    "Czech Republic": "CZ", "Curacao": "CW", "Cape Verde": "CV", "Ireland": "IE", "Republic of Ireland": "IE",
    "United States": "US", "USA": "US", "Russia": "RU", "Iran": "IR", "Syria": "SY", "Kosovo": "XK",
    "The Gambia": "GM", "Gambia": "GM", "St. Kitts & Nevis": "KN", "St. Lucia": "LC", "Chinese Taipei": "TW",
    "Hongkong": "HK", "Palestine": "PS", "Macedonia": "MK", "North Macedonia": "MK", "Vietnam": "VN",
    "Tahiti": "PF", "Neukaledonien": "NC", "Netherlands Antilles": "CW", "Laos": "LA", "Brunei": "BN",
  };
  for (const [k, v] of Object.entries(extra)) map.set(norm(k), v);
  return (name) => map.get(norm(name)) ?? null;
}

// ---------- köməkçilər ----------
const POS_API = { Goalkeeper: "GK", Defender: "DF", Midfielder: "MF", Attacker: "FW" };
const POS_TM = { Goalkeeper: "GK", Defender: "DF", Midfield: "MF", Attack: "FW" };
const ageOn = (dob, day) => {
  const b = new Date(dob), d = new Date(day);
  let a = d.getUTCFullYear() - b.getUTCFullYear();
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) a--;
  return a;
};
export const slugify = (s) => norm(s).replace(/ /g, "-");
const num = (v) => (v === "" || v == null ? null : Number(v));

// ---------- kuboklar ----------
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;
const endDate = (spec = "05-30", S) => {
  const y = Number(S.slice(0, 4));
  if (spec.startsWith("cal:")) return `${S}-${spec.slice(4)}`;
  if (spec.startsWith("start:")) return `${y}-${spec.slice(6)}`;
  return `${y + 1}-${spec}`;
};

async function computeTrophies({ winnersPath, tm, games, used, tmPlayers, transfersBy, tmToOur, clubs, compCodes, countryCode, today, log }) {
  const none = { trophiesOf: () => [], trophyReport: "trophy-winners.json tapılmadı" };
  if (!(await exists(winnersPath))) return none;
  const W = JSON.parse(await readFile(winnersPath, "utf8")).trophies;

  // kubok -> Transfermarkt yarış id-ləri
  const compOf = new Map(), trophyReport = {};
  for (const [tid, t] of Object.entries(W)) {
    if (t.type === "individual") continue;
    const ids = new Set((t.tm ?? []).filter((id) => compCodes.has(id)));
    for (const [id, code] of compCodes) if ((t.tm_codes ?? []).includes(code)) ids.add(id);
    t.resolved = [...ids];
    for (const id of ids) compOf.set(id, tid);
    trophyReport[tid] = t.resolved.length ? t.resolved : "Transfermarkt-da yoxdur (transferlərlə hesablanır)";
  }
  const isNat = (comp) => W[compOf.get(comp)]?.type === "national";
  const periodOf = (g) => (isNat(g.c) ? g.d.slice(0, 4) : g.s); // millilər: turnir ili, klublar: mövsüm

  // milli komandalar və klublarımızın TM id-ləri
  const natIdsOf = new Map();
  await eachRow(tm("national_teams.csv.gz"), (r) => {
    const c = countryCode(r.country_name);
    if (!c) return;
    if (!natIdsOf.has(c)) natIdsOf.set(c, []);
    natIdsOf.get(c).push(r.national_team_id);
  });
  const tmIdsOf = new Map();
  for (const [tmId, our] of tmToOur) {
    if (!tmIdsOf.has(our)) tmIdsOf.set(our, []);
    tmIdsOf.get(our).push(tmId);
  }
  const slugToId = new Map(clubs.map((c) => [c.slug, c.id]));

  // klubun yarışdakı son oyunu
  const clubLast = new Map();
  for (const g of games.values()) {
    if (!compOf.has(g.c)) continue;
    const per = periodOf(g);
    for (const club of [g.h, g.a]) {
      const k = `${club}|${g.c}|${per}`;
      if (!clubLast.has(k) || g.d > clubLast.get(k)) clubLast.set(k, g.d);
    }
  }
  // oyun heyətləri (əsas + ehtiyat oyunçular)
  const hasData = new Set(), playerLast = new Map();
  await eachRow(tm("game_lineups.csv.gz"), (r) => {
    const g = games.get(r.game_id);
    if (!g || !compOf.has(g.c)) return;
    const per = periodOf(g);
    hasData.add(`${r.club_id}|${g.c}|${per}`);
    if (!used.has(r.player_id)) return;
    const k = `${r.player_id}|${r.club_id}|${g.c}|${per}`;
    if (!playerLast.has(k) || g.d > playerLast.get(k)) playerLast.set(k, g.d);
  });
  log("oyun heyətləri oxundu");

  // müəyyən tarixdə oyunçu hansı klubumuzda idi (transferlərə görə)
  const clubOn = (pid, date) => {
    const tr = transfersBy.get(pid) ?? [];
    if (!tr.length) return tmToOur.get(tmPlayers.get(pid)?.current_club_id) ?? null;
    if (date < tr[0].transfer_date) return tmToOur.get(tr[0].from_club_id) ?? null;
    let cur = null;
    for (const t of tr) { if (t.transfer_date <= date) cur = tmToOur.get(t.to_club_id) ?? null; else break; }
    return cur;
  };
  for (const tr of transfersBy.values()) tr.sort((a, b) => a.transfer_date.localeCompare(b.transfer_date));

  const cache = new Map();
  const trophiesOf = (pid) => {
    if (cache.has(pid)) return cache.get(pid);
    const p = tmPlayers.get(pid), dob = p?.date_of_birth?.slice(0, 10) ?? "", pname = norm(p?.name);
    const out = [];
    for (const [tid, t] of Object.entries(W)) {
      let n = 0;
      for (const [S, v] of Object.entries(t.seasons)) {
        if (t.type === "individual") {
          if (v.some(([nm, by]) => norm(nm) === pname && Number(dob.slice(0, 4)) === by)) n++;
          continue;
        }
        if (t.type === "national") {
          const ok = (natIdsOf.get(v) ?? []).some((id) => t.resolved.some((c) => playerLast.has(`${pid}|${id}|${c}|${S}`)));
          if (ok) n++;
          continue;
        }
        // klub kuboku
        const slug = typeof v === "string" ? v : v.club;
        const our = slugToId.get(slug), tids = tmIdsOf.get(our) ?? [];
        const per = S.includes("-") ? S.slice(0, 4) : S;
        const covered = tids.some((id) => t.resolved.some((c) => hasData.has(`${id}|${c}|${per}`)));
        let ok;
        if (covered) {
          // o mövsüm həmin klubun heyətində olub və sona yaxın hələ orada idi
          ok = tids.some((id) => t.resolved.some((c) => {
            const L = playerLast.get(`${pid}|${id}|${c}|${per}`);
            if (!L) return false;
            const CL = clubLast.get(`${id}|${c}|${per}`) ?? L;
            return days(L, CL) <= 75;
          }));
        } else {
          // data yoxdur (məs. 2012-dən əvvəl): mövsümün sonunda o klubda idisə
          const date = (typeof v === "object" && v.date) || endDate(t.end, S);
          ok = date <= today && dob && ageOn(dob, date) >= 17 && clubOn(pid, date) === our;
        }
        if (ok) n++;
      }
      if (n) out.push([tid, n]);
    }
    cache.set(pid, out);
    return out;
  };
  return { trophiesOf, trophyReport };
}

// ---------- əsas iş ----------
export async function build({
  clubsPath = "src/data/clubs.json",
  squadsDir = "data-raw/api-football/squads",
  tmDir = "data-raw/transfermarkt",
  manualPath = "src/data/players-manual.json",
  winnersPath = "src/data/trophy-winners.json",
  outPath = "src/data/players.json",
  photosPath = "data-raw/player-photos.json",
  reportPath = "data-raw/build-report.json",
  today = new Date().toISOString().slice(0, 10),
} = {}) {
  const t0 = Date.now();
  const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
  const tm = (f) => path.join(tmDir, f);
  const countryCode = buildCountryCodes();

  // 1) Bizim klublar və heyətlər
  const clubs = JSON.parse(await readFile(clubsPath, "utf8"));
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const squadFiles = (await exists(squadsDir)) ? (await readdir(squadsDir)).filter((f) => f.endsWith(".json")) : [];
  const squads = [];
  for (const f of squadFiles) squads.push(JSON.parse(await readFile(path.join(squadsDir, f), "utf8")));
  if (!squads.length) throw new Error(`Heyət faylı tapılmadı (${squadsDir}). Əvvəlcə fetch-squads.mjs işə salın.`);
  log(`${squads.length} klubun heyəti oxundu`);

  // 2) Transfermarkt: ölkələr, yarışlar, klublar
  const compCountry = new Map(), compCodes = new Map();
  await eachRow(tm("competitions.csv.gz"), (r) => {
    compCountry.set(r.competition_id, r.country_name);
    compCodes.set(r.competition_id, r.competition_code);
  });
  const tmClubs = new Map(); // tm id -> { names:Set, country }
  const addTmName = (id, name, country) => {
    if (!id || !name) return;
    let c = tmClubs.get(id);
    if (!c) tmClubs.set(id, (c = { names: new Set(), country: null }));
    c.names.add(name);
    const fix = { "Türkiye": "Turkey", "Czechia": "Czech Republic" };
    if (country && !c.country) c.country = fix[country] ?? country;
  };
  await eachRow(tm("clubs.csv.gz"), (r) => {
    const country = compCountry.get(r.domestic_competition_id) || null;
    addTmName(r.club_id, r.name, country);
    addTmName(r.club_id, r.club_code.replace(/-/g, " "), country);
  });

  // 3) Transfermarkt oyunçuları
  const tmPlayers = new Map();
  await eachRow(tm("players.csv.gz"), (r) => {
    tmPlayers.set(r.player_id, r);
    addTmName(r.current_club_id, r.current_club_name, compCountry.get(r.current_club_domestic_competition_id));
  });
  log(`${tmPlayers.size} Transfermarkt oyunçusu oxundu`);

  // 4) Transferlər (klub tarixçəsi üçün) + transferlərdəki klub adları
  const transfersBy = new Map();
  await eachRow(tm("transfers.csv.gz"), (r) => {
    if (!r.transfer_date || r.transfer_date > today) return; // gələcək tarixli (icarə sonu) qeydləri ötürürük
    if (!transfersBy.has(r.player_id)) transfersBy.set(r.player_id, []);
    transfersBy.get(r.player_id).push(r);
    addTmName(r.from_club_id, r.from_club_name);
    addTmName(r.to_club_id, r.to_club_name);
  });

  // 5) TM klubu -> bizim klub
  const COUNTRY_NAME = { GB: null, ES: "Spain", DE: "Germany", IT: "Italy", FR: "France", PT: "Portugal",
    NL: "Netherlands", BE: "Belgium", TR: "Turkey", AT: "Austria", CH: "Switzerland", DK: "Denmark",
    NO: "Norway", SE: "Sweden", GR: "Greece", CZ: "Czech Republic", HR: "Croatia", PL: "Poland",
    RO: "Romania", BG: "Bulgaria", HU: "Hungary", RS: "Serbia", UA: "Ukraine", RU: "Russia", IL: "Israel", CY: "Cyprus" };
  const ourNames = (c) => [c.name, ...(TM_ALIASES[c.slug] ?? [])];
  // indeks: ad tokeni -> bizim klublar (yalnız ortaq sözü olanları müqayisə edirik)
  const tokenIndex = new Map();
  for (const c of clubs) for (const on of ourNames(c)) for (const t of [...clubTokens(on), norm(on)]) {
    if (!tokenIndex.has(t)) tokenIndex.set(t, new Set());
    tokenIndex.get(t).add(c);
  }
  const tmToOur = new Map(), clubMapReport = [];
  for (const [tmId, info] of tmClubs) {
    const cands = new Set();
    for (const tn of info.names) for (const t of [...clubTokens(tn), norm(tn)]) for (const c of tokenIndex.get(t) ?? []) cands.add(c);
    let best = null, score = 0, second = 0;
    for (const c of cands) {
      if (info.country) { // ölkəsi bilinən TM klubu yalnız eyni ölkədəki klubumuza uyğun gələ bilər
        if (c.country_id === "GB") { if (!["England", "Scotland"].includes(info.country)) continue; }
        else if (COUNTRY_NAME[c.country_id] !== info.country) continue;
      }
      let s = 0;
      for (const tn of info.names) {
        if (ourNames(c).some((on) => isReserveName(on, tn))) { s = 0; break; }
        for (const on of ourNames(c)) s = Math.max(s, clubScore(on, tn));
      }
      if (s > score) { second = score; score = s; best = c; } else if (s > second) second = s;
    }
    const need = info.country ? 0.6 : 0.8; // ölkəsi bilinməyən klub üçün daha sərt
    if (best && score >= need && score - second >= 0.1) {
      const prev = tmToOur.get(tmId);
      tmToOur.set(tmId, best.id);
      if (!prev) clubMapReport.push({ tm_id: tmId, tm_names: [...info.names].slice(0, 3), our: best.name, score: +score.toFixed(2) });
    }
  }
  // Bir bizim klub bir neçə TM klubuna uyğunlaşa bilər (məs. adların variantları) — bu normaldır.
  log(`${new Set(tmToOur.values()).size}/${clubs.length} klub Transfermarkt-da tapıldı`);

  // 6) Heyət oyunçusu -> TM oyunçusu
  const byFull = new Map(), bySurname = new Map();
  for (const p of tmPlayers.values()) {
    const full = norm(p.name);
    if (!byFull.has(full)) byFull.set(full, []);
    byFull.get(full).push(p);
    const last = norm(p.last_name || p.name.split(" ").at(-1));
    for (const key of new Set([last, full.split(" ").at(-1)])) {
      if (!key) continue;
      if (!bySurname.has(key)) bySurname.set(key, []);
      bySurname.get(key).push(p);
    }
  }
  const matchPlayer = (ap, clubId, day) => {
    const ageOk = (p) => !ap.age || !p.date_of_birth || Math.abs(ageOn(p.date_of_birth, day) - ap.age) <= 1;
    const sameClub = (p) => tmToOur.get(p.current_club_id) === clubId;
    const pick = (list) => {
      list = list.filter(ageOk);
      if (list.length === 1) return list[0];
      const here = list.filter(sameClub);
      if (here.length === 1) return here[0];
      const recent = list.filter((p) => Number(p.last_season) >= 2025);
      return recent.length === 1 ? recent[0] : null;
    };
    const n = norm(ap.name);
    let m = pick(byFull.get(n) ?? []);
    if (m) return m;
    const toks = String(ap.name).trim().split(/\s+/);
    const initial = /^[A-Za-zÀ-ž]\.$/.test(toks[0]) ? norm(toks[0])[0] : null;
    const rest = norm(initial ? toks.slice(1).join(" ") : ap.name);
    const surname = rest.split(" ").at(-1);
    const cands = (bySurname.get(surname) ?? []).filter((p) => {
      const full = norm(p.name);
      if (!(full.endsWith(" " + rest) || full === rest)) return false;
      if (initial) return norm(p.first_name || p.name)[0] === initial;
      return true;
    });
    return pick(cands);
  };

  const used = new Set(), entries = [], unmatched = [];
  for (const sq of squads) {
    const day = sq.fetched_at || today;
    for (const ap of sq.players ?? []) {
      let p = matchPlayer(ap, sq.club_id, day);
      if (p && used.has(p.player_id)) p = null; // eyni TM oyunçusu iki dəfə olmasın
      if (p) used.add(p.player_id);
      else unmatched.push({ club: clubById.get(sq.club_id)?.name, name: ap.name, age: ap.age, api_id: ap.id });
      entries.push({ ap, tm: p, clubId: sq.club_id });
    }
  }
  log(`${entries.length} heyət oyunçusu, ${used.size} Transfermarkt ilə uyğunlaşdı`);

  // 7) Statistika: oyunların mövsümü + çıxışlar
  const games = new Map(); // game_id -> { c: yarış, s: mövsüm, d: tarix, h, a }
  await eachRow(tm("games.csv.gz"), (r) => games.set(r.game_id,
    { c: r.competition_id, s: r.season, d: r.date, h: r.home_club_id, a: r.away_club_id }));
  let lastSeason = 0;
  for (const g of games.values()) if (Number(g.s) > lastSeason) lastSeason = Number(g.s);
  const blank = () => ({ appearances: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 });
  const career = new Map(), season = new Map();
  await eachRow(tm("appearances.csv.gz"), (r) => {
    if (!used.has(r.player_id)) return;
    const add = (map) => {
      let s = map.get(r.player_id);
      if (!s) map.set(r.player_id, (s = blank()));
      s.appearances++; s.goals += +r.goals || 0; s.assists += +r.assists || 0;
      s.yellow_cards += +r.yellow_cards || 0; s.red_cards += +r.red_cards || 0;
    };
    add(career);
    if (Number(games.get(r.game_id)?.s) === lastSeason) add(season);
  });
  log("statistika hesablandı");

  // 8) Bazar dəyərinin tarixi
  const valDate = new Map();
  await eachRow(tm("player_valuations.csv.gz"), (r) => {
    if (!used.has(r.player_id)) return;
    if (!valDate.has(r.player_id) || r.date > valDate.get(r.player_id)) valDate.set(r.player_id, r.date);
  });

  // 8b) Kuboklar
  const { trophiesOf, trophyReport } = await computeTrophies({
    winnersPath, tm, games, used, tmPlayers, transfersBy, tmToOur, clubs, compCodes, countryCode, today, log,
  });

  // 9) Əl ilə yazılmış kuboklar
  const manual = new Map();
  if (await exists(manualPath)) {
    for (const p of JSON.parse(await readFile(manualPath, "utf8"))) manual.set(norm(p.name), p);
  }

  // 10) Nəticə
  const players = [], photos = {}, slugs = new Set();
  for (const { ap, tm: p, clubId } of entries) {
    const name = p?.name || ap.name;
    let slug = slugify(name);
    if (slugs.has(slug)) slug = `${slug}-${(p?.date_of_birth || "").slice(0, 4) || ap.id}`;
    if (slugs.has(slug)) slug = `${slug}-${ap.id}`;
    slugs.add(slug);

    const o = {
      id: p ? Number(p.player_id) : 900000000 + Number(ap.id),
      name, slug,
      photo_url: `/images/players/${slug}.png`,
    };
    const nat = p && countryCode(p.country_of_citizenship);
    if (nat) o.nationality_code = nat;
    const pos = POS_API[ap.position] || (p && POS_TM[p.position]);
    if (pos) o.position = pos;
    o.is_active = true;
    if (p?.date_of_birth) o.birth_date = p.date_of_birth.slice(0, 10);
    if (num(p?.height_in_cm)) o.height_cm = num(p.height_in_cm);
    if (p && ["left", "right", "both"].includes(p.foot)) o.preferred_foot = p.foot;
    o.current_club_id = clubId;

    // klub tarixçəsi: transferlər xronoloji, yalnız bizim siyahıdakı klublar
    const hist = [];
    const push = (id) => { if (id && hist.at(-1) !== id) hist.push(id); };
    const tr = (p && transfersBy.get(p.player_id)) || [];
    tr.sort((a, b) => a.transfer_date.localeCompare(b.transfer_date));
    if (tr.length) push(tmToOur.get(tr[0].from_club_id));
    for (const t of tr) push(tmToOur.get(t.to_club_id));
    push(clubId);
    o.club_history = hist;

    if (num(p?.market_value_in_eur)) {
      o.market_value = { amount_eur: num(p.market_value_in_eur) };
      if (valDate.has(p.player_id)) o.market_value.updated_at = valDate.get(p.player_id);
    }
    const c = p && career.get(p.player_id), s = p && season.get(p.player_id);
    if (c || s) {
      o.stats = {};
      if (c) o.stats.career = c;
      if (s) o.stats.season = { season: `${lastSeason}-${String(lastSeason + 1).slice(2)}`, ...s };
    }
    // kuboklar: hesablanan + əl ilə yazılan (hər kubok üçün böyük olan say)
    const tro = new Map(p ? trophiesOf(p.player_id) : []);
    for (const t of manual.get(norm(name))?.trophies ?? []) tro.set(t.id, Math.max(tro.get(t.id) ?? 0, t.count));
    if (tro.size) o.trophies = [...tro].map(([id, count]) => ({ id, count }));
    o.data_as_of = today.slice(0, 7);

    players.push(o);
    const src = p?.image_url || ap.photo;
    if (src) photos[slug] = src;
  }

  await writeJson(outPath, players);
  await writeJson(photosPath, photos);
  await writeJson(reportPath, {
    built_at: today, squads: squads.length, players: players.length, matched: used.size,
    unmatched_players: unmatched, tm_club_map: clubMapReport, trophy_competitions: trophyReport,
    clubs_without_squad: clubs.filter((c) => !squads.some((s) => s.club_id === c.id)).map((c) => c.name),
  });
  const pct = players.length ? Math.round((used.size / players.length) * 100) : 0;
  log(`Hazırdır: ${players.length} oyunçu -> ${outPath}`);
  console.log(`   Transfermarkt ilə uyğunlaşan: ${used.size} (${pct}%)`);
  console.log(`   Uyğunlaşmayanların siyahısı: ${reportPath}`);
  return { players, unmatched };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  build().catch((e) => { console.error(e.message); process.exit(1); });
}
