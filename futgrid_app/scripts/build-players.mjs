import { readFile, writeFile, readdir, access } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import path from "node:path";
import { pathToFileURL } from "node:url";

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const writeJson = (p, v) =>
  writeFile(p, JSON.stringify(v, null, 2) + "\n", "utf8");
async function readJson(p, emptyValue) {
  const text = (await readFile(p, "utf8")).replace(/^\uFEFF/, "");
  if (!text.trim()) {
    if (emptyValue !== undefined) {
      console.log(`   (${p} boşdur, ötürülür)`);
      return emptyValue;
    }
    throw new Error(`${p} boşdur`);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${p} faylında JSON xətası: ${e.message}`);
  }
}

export async function eachRow(file, onRow) {
  const stream = createReadStream(file).pipe(createGunzip());
  stream.setEncoding("utf8");
  let header = null,
    row = [],
    field = "",
    inQ = false,
    afterQuote = false,
    count = 0;
  const emit = () => {
    row.push(field);
    field = "";
    if (!header) header = row;
    else if (row.length > 1 || row[0] !== "") {
      const o = {};
      for (let i = 0; i < header.length; i++) o[header[i]] = row[i] ?? "";
      onRow(o);
      count++;
    }
    row = [];
  };
  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      const ch = chunk[i];
      if (inQ) {
        if (ch === '"') {
          inQ = false;
          afterQuote = true;
        } else field += ch;
        continue;
      }
      if (ch === '"') {
        if (afterQuote) field += '"';
        inQ = true;
        afterQuote = false;
        continue;
      }
      afterQuote = false;
      if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") emit();
      else if (ch !== "\r") field += ch;
    }
  }
  if (field !== "" || row.length) emit();
  return count;
}

export const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/đ/g, "d")
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const CLUB_STOP = new Set([
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
  "sad",
  "spa",
  "s",
  "p",
  "a",
  "1",
  "04",
  "05",
  "07",
  "09",
  "1907",
  "1909",
  "1913",
  "1893",
  "calcio",
  "futbol",
  "football",
  "clube",
]);
const RESERVE =
  /^(w|ii|iii|b|c|u\d{2}|reserves?|women|fem|feminino|femenino|youth|juvenil|primavera|atletic|castilla)$/;

const clubTokens = (s) =>
  norm(s)
    .split(" ")
    .filter((t) => t && !CLUB_STOP.has(t));
function clubScore(a, b) {
  const na = norm(a),
    nb = norm(b);
  if (na && na === nb) return 1;
  const ta = new Set(clubTokens(a)),
    tb = new Set(clubTokens(b));
  if (!ta.size || !tb.size) return 0;
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const jac = inter / new Set([...ta, ...tb]).size;
  const contains =
    inter &&
    ([...ta].every((t) => tb.has(t)) || [...tb].every((t) => ta.has(t)));
  const ratio = Math.min(ta.size, tb.size) / Math.max(ta.size, tb.size);
  return Math.max(jac, contains ? 0.6 + 0.3 * ratio : 0);
}
const isReserveName = (ourName, otherName) => {
  const ours = new Set(norm(ourName).split(" "));
  return norm(otherName)
    .split(" ")
    .some((t) => RESERVE.test(t) && !ours.has(t));
};

const TM_ALIASES = {
  "bayern-munich": ["Bayern Munich", "fc-bayern-munchen"],
  "inter-milan": ["Inter", "inter-mailand"],
  "ac-milan": ["AC Milan", "ac-mailand"],
  juventus: ["Juventus", "juventus-turin"],
  "paris-saint-germain": [
    "Paris Saint-Germain",
    "fc-paris-saint-germain",
    "Paris SG",
    "PSG",
  ],
  "olympique-de-marseille": ["Marseille"],
  "olympique-lyonnais": ["Olympique Lyon", "olympique-lyon"],
  "stade-rennais": ["Stade Rennais FC", "Rennes"],
  "wolverhampton-wanderers": ["Wolves"],
  "tottenham-hotspur": ["Tottenham", "Spurs"],
  "manchester-united": ["Man Utd"],
  "manchester-city": ["Man City"],
  "newcastle-united": ["Newcastle"],
  "west-ham-united": ["West Ham"],
  "brighton-hove-albion": ["Brighton"],
  "nottingham-forest": ["Nottm Forest"],
  "sl-benfica": ["Benfica"],
  "sporting-cp": ["Sporting CP", "sporting-lissabon"],
  "fc-porto": ["FC Porto"],
  "red-star-belgrade": ["Crvena zvezda", "Red Star"],
  "slavia-prague": ["Slavia Praha"],
  "sparta-prague": ["Sparta Praha"],
  "legia-warsaw": ["Legia Warszawa"],
  "rapid-wien": ["Rapid Vienna", "SK Rapid Wien"],
  ferencvaros: ["Ferencvárosi TC"],
  olympiacos: ["Olympiacos Piraeus"],
  "atletico-madrid": ["Atlético de Madrid", "Atlético Madrid"],
  "real-betis": ["Real Betis Balompié"],
  "athletic-bilbao": ["Athletic Bilbao", "Athletic Club"],
  "borussia-monchengladbach": ["Borussia Mönchengladbach", "Bor. M'gladbach"],
  "union-sg": ["Union Saint-Gilloise"],
  "shakhtar-donetsk": ["Shakhtar Donetsk"],
  "zenit-saint-petersburg": ["Zenit St. Petersburg", "Zenit"],
  "la-galaxy": ["Los Angeles Galaxy"],
  "inter-miami-cf": ["Inter Miami"],
  "al-nassr": ["Al-Nassr"],
  "al-hilal": ["Al-Hilal"],
  "al-ittihad": ["Al-Ittihad"],
  "al-ahli": ["Al-Ahli"],
};

export function buildCountryCodes() {
  const dn = new Intl.DisplayNames(["en"], { type: "region" });
  const map = new Map();
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const OLD = new Set([
    "AN",
    "BU",
    "CS",
    "DD",
    "DY",
    "FX",
    "HV",
    "NH",
    "RH",
    "SU",
    "TP",
    "UK",
    "VD",
    "YD",
    "YU",
    "ZR",
  ]);
  for (const a of A)
    for (const b of A) {
      const code = a + b;
      if (OLD.has(code)) continue;
      try {
        const name = dn.of(code);
        if (name && name !== code) map.set(norm(name), code);
      } catch {}
    }
  const extra = {
    England: "GB-ENG",
    Scotland: "GB-SCT",
    Wales: "GB-WLS",
    "Northern Ireland": "GB-NIR",
    "Korea, South": "KR",
    "South Korea": "KR",
    "Korea, North": "KP",
    "Cote d'Ivoire": "CI",
    "Ivory Coast": "CI",
    Türkiye: "TR",
    Turkey: "TR",
    "DR Congo": "CD",
    Congo: "CG",
    "Bosnia-Herzegovina": "BA",
    "Czech Republic": "CZ",
    Curacao: "CW",
    "Cape Verde": "CV",
    Ireland: "IE",
    "Republic of Ireland": "IE",
    "United States": "US",
    USA: "US",
    Russia: "RU",
    Iran: "IR",
    Syria: "SY",
    Kosovo: "XK",
    "The Gambia": "GM",
    Gambia: "GM",
    "St. Kitts & Nevis": "KN",
    "St. Lucia": "LC",
    "Chinese Taipei": "TW",
    Hongkong: "HK",
    Palestine: "PS",
    Macedonia: "MK",
    "North Macedonia": "MK",
    Vietnam: "VN",
    Tahiti: "PF",
    Neukaledonien: "NC",
    "Netherlands Antilles": "CW",
    Laos: "LA",
    Brunei: "BN",
  };
  for (const [k, v] of Object.entries(extra)) map.set(norm(k), v);
  return (name) => map.get(norm(name)) ?? null;
}

const POS_API = {
  Goalkeeper: "GK",
  Defender: "DF",
  Midfielder: "MF",
  Attacker: "FW",
};
const POS_TM = {
  Goalkeeper: "GK",
  Defender: "DF",
  Midfield: "MF",
  Attack: "FW",
};
const ageOn = (dob, day) => {
  const b = new Date(dob),
    d = new Date(day);
  let a = d.getUTCFullYear() - b.getUTCFullYear();
  if (
    d.getUTCMonth() < b.getUTCMonth() ||
    (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())
  )
    a--;
  return a;
};
export const slugify = (s) => norm(s).replace(/ /g, "-");
const num = (v) => (v === "" || v == null ? null : Number(v));

const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;
const endDate = (spec = "05-30", S) => {
  const y = Number(S.slice(0, 4));
  if (spec.startsWith("cal:")) return `${S}-${spec.slice(4)}`;
  if (spec.startsWith("start:")) return `${y}-${spec.slice(6)}`;
  return `${y + 1}-${spec}`;
};

async function computeTrophies({
  winnersPath,
  tm,
  games,
  used,
  tmPlayers,
  transfersBy,
  tmToOur,
  clubs,
  compCodes,
  countryCode,
  today,
  log,
  careerEnd = new Map(),
  careerClubOn = () => undefined,
}) {
  const none = {
    trophiesOf: () => [],
    trophyReport: "trophy-winners.json tapılmadı",
  };
  if (!(await exists(winnersPath))) return none;
  const W = (await readJson(winnersPath, { trophies: {} })).trophies ?? {};

  const compOf = new Map(),
    trophyReport = {};
  for (const [tid, t] of Object.entries(W)) {
    if (t.type === "individual") continue;
    const ids = new Set((t.tm ?? []).filter((id) => compCodes.has(id)));
    for (const [id, code] of compCodes)
      if ((t.tm_codes ?? []).includes(code)) ids.add(id);
    t.resolved = [...ids];
    for (const id of ids) compOf.set(id, tid);
    trophyReport[tid] = t.resolved.length
      ? t.resolved
      : "Transfermarkt-da yoxdur (transferlərlə hesablanır)";
  }
  const isNat = (comp) => W[compOf.get(comp)]?.type === "national";
  const periodOf = (g) => (isNat(g.c) ? g.d.slice(0, 4) : g.s);

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

  const clubLast = new Map();
  for (const g of games.values()) {
    if (!compOf.has(g.c)) continue;
    const per = periodOf(g);
    for (const club of [g.h, g.a]) {
      const k = `${club}|${g.c}|${per}`;
      if (!clubLast.has(k) || g.d > clubLast.get(k)) clubLast.set(k, g.d);
    }
  }
  const hasData = new Set(),
    playerLast = new Map();
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

  const clubOn = (pid, date) => {
    const tr = transfersBy.get(pid) ?? [];
    if (!tr.length || date < tr[0].transfer_date) {
      const wd = careerClubOn(pid, date);
      if (wd !== undefined) return wd;
    }
    if (!tr.length)
      return tmToOur.get(tmPlayers.get(pid)?.current_club_id) ?? null;
    if (date < tr[0].transfer_date)
      return tmToOur.get(tr[0].from_club_id) ?? null;
    let cur = null;
    for (const t of tr) {
      if (t.transfer_date <= date) cur = tmToOur.get(t.to_club_id) ?? null;
      else break;
    }
    return cur;
  };
  for (const tr of transfersBy.values())
    tr.sort((a, b) => a.transfer_date.localeCompare(b.transfer_date));

  const cache = new Map();
  const trophiesOf = (pid) => {
    if (cache.has(pid)) return cache.get(pid);
    const p = tmPlayers.get(pid),
      dob = p?.date_of_birth?.slice(0, 10) ?? "",
      pname = norm(p?.name);
    const out = [];
    for (const [tid, t] of Object.entries(W)) {
      let n = 0;
      for (const [S, v] of Object.entries(t.seasons)) {
        if (t.type === "individual") {
          if (
            v.some(
              ([nm, by]) =>
                norm(nm) === pname && Number(dob.slice(0, 4)) === by,
            )
          )
            n++;
          continue;
        }
        if (t.type === "national") {
          const ok = (natIdsOf.get(v) ?? []).some((id) =>
            t.resolved.some((c) => playerLast.has(`${pid}|${id}|${c}|${S}`)),
          );
          if (ok) n++;
          continue;
        }
        const slug = typeof v === "string" ? v : v.club;
        const our = slugToId.get(slug),
          tids = tmIdsOf.get(our) ?? [];
        const per = S.includes("-") ? S.slice(0, 4) : S;
        const covered = tids.some((id) =>
          t.resolved.some((c) => hasData.has(`${id}|${c}|${per}`)),
        );
        let ok;
        if (covered) {
          ok = tids.some((id) =>
            t.resolved.some((c) => {
              const L = playerLast.get(`${pid}|${id}|${c}|${per}`);
              if (!L) return false;
              const CL = clubLast.get(`${id}|${c}|${per}`) ?? L;
              return days(L, CL) <= 75;
            }),
          );
        } else {
          const date = (typeof v === "object" && v.date) || endDate(t.end, S);
          const end = careerEnd.get(pid);
          ok =
            date <= today &&
            (!end || date <= end) &&
            dob &&
            ageOn(dob, date) >= 17 &&
            clubOn(pid, date) === our;
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

const COACH_GAP_DAYS = 200;

async function buildCoaches({
  tm,
  games,
  tmToOur,
  tmClubCoach,
  countryCode,
  playedUnder,
  coachesManualPath,
  coachPhotos = {},
  today,
  log,
}) {
  const natCodeOf = new Map(),
    natCoach = new Map();
  await eachRow(tm("national_teams.csv.gz"), (r) => {
    if (/\b(u-?\d{2}|olympic|women|woman|futsal|beach)\b/i.test(r.name)) return;
    const code = countryCode(r.country_name) ?? countryCode(r.name);
    if (!code) return;
    natCodeOf.set(r.national_team_id, code);
    if (r.coach_name) natCoach.set(code, r.coach_name);
  });
  const targetOf = (tmId) => {
    const club = tmToOur.get(tmId);
    if (club) return `club:${club}`;
    const code = natCodeOf.get(tmId);
    return code ? `country:${code}` : null;
  };

  const names = new Map(),
    dates = new Map(),
    lastGameOf = new Map();
  const addName = (n) => {
    const k = norm(n);
    if (k && !names.has(k)) names.set(k, n.trim());
    return k;
  };
  for (const g of games.values()) {
    for (const [team, mgr] of [
      [g.h, g.hm],
      [g.a, g.am],
    ]) {
      const target = targetOf(team);
      if (!target) continue;
      if (!lastGameOf.has(target) || g.d > lastGameOf.get(target).d)
        lastGameOf.set(target, { d: g.d, m: norm(mgr) });
      if (!mgr) continue;
      const key = `${addName(mgr)}|${target}`;
      if (!dates.has(key)) dates.set(key, []);
      dates.get(key).push(g.d);
    }
  }

  const current = new Map();
  for (const [tmId, n] of tmClubCoach) {
    const t = targetOf(tmId);
    if (t) current.set(t, addName(n));
  }
  for (const [code, n] of natCoach) current.set(`country:${code}`, addName(n));
  for (const [t, last] of lastGameOf)
    if (!current.has(t) && last.m) current.set(t, last.m);

  const stintsOf = new Map();
  for (const [key, ds] of dates) {
    const [coach, target] = key.split("|");
    ds.sort();
    const runs = [];
    for (const d of ds) {
      const run = runs.at(-1);
      if (run && days(run.to, d) <= COACH_GAP_DAYS) {
        run.to = d;
        run.games++;
      } else runs.push({ from: d, to: d, games: 1 });
    }
    const [kind, id] = target.split(":");
    const isCurrent = current.get(target) === coach;
    runs.forEach((run, i) => {
      const s =
        kind === "club" ? { club_id: Number(id) } : { country_code: id };
      s.from = run.from.slice(0, 10);
      if (!(isCurrent && i === runs.length - 1)) s.to = run.to.slice(0, 10);
      s.games = run.games;
      if (!stintsOf.has(coach)) stintsOf.set(coach, []);
      stintsOf.get(coach).push(s);
    });
  }

  const playersOf = new Map();
  for (const m of playedUnder.values())
    for (const k of m.keys()) playersOf.set(k, (playersOf.get(k) ?? 0) + 1);

  const manual = new Map();
  if (await exists(coachesManualPath)) {
    for (const c of await readJson(coachesManualPath, []))
      manual.set(norm(c.name), c);
  }

  const keep = new Set([
    ...stintsOf.keys(),
    ...[...playersOf].filter(([, n]) => n >= 3).map(([k]) => k),
    ...manual.keys(),
  ]);
  const ids = new Map(),
    taken = new Set(),
    coaches = [];
  for (const k of keep) {
    const m = manual.get(k);
    const name = m?.name ?? names.get(k);
    if (!name) continue;
    const id = slugify(name);
    if (taken.has(id)) continue;
    taken.add(id);
    ids.set(k, id);
    const c = { id, name, slug: id };
    if (m?.nationality_code) c.nationality_code = m.nationality_code;
    const photo = m?.photo_url ?? coachPhotos[id];
    if (photo) c.photo_url = photo;
    const stints = (stintsOf.get(k) ?? []).sort((a, b) =>
      a.from.localeCompare(b.from),
    );
    const open = stints.find((s) => !s.to);
    if (m?.current_club_id) c.current_club_id = m.current_club_id;
    else if (m?.current_country_code)
      c.current_country_code = m.current_country_code;
    else if (open?.club_id) c.current_club_id = open.club_id;
    else if (open?.country_code) c.current_country_code = open.country_code;
    if (stints.length) c.stints = stints;
    if (playersOf.get(k)) c.players_count = playersOf.get(k);
    coaches.push(c);
  }
  coaches.sort(
    (a, b) =>
      (b.players_count ?? 0) - (a.players_count ?? 0) ||
      a.name.localeCompare(b.name),
  );
  log(`${coaches.length} məşqçi tapıldı`);

  const coachIdsOf = (pid) =>
    [...(playedUnder.get(pid) ?? new Map())]
      .filter(([k]) => ids.has(k))
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => ids.get(k));

  return { coaches, coachIdsOf, natCodeOf };
}

export async function build({
  clubsPath = "public/data/clubs.json",
  squadsDir = "data-raw/api-football/squads",
  squadsManualPath = "src/data/squads-manual.json",
  tmDir = "data-raw/transfermarkt",
  manualPath = "src/data/players-manual.json",
  winnersPath = "src/data/trophy-winners.json",
  coachesManualPath = "src/data/coaches-manual.json",
  outPath = "public/data/players.json",
  coachesPath = "public/data/coaches.json",
  legendsPath = "src/data/legends.json",
  careersPath = "data-raw/wikidata/careers.json",
  idsPath = "src/data/player-ids.json",
  imagesDir = "data-raw/images",
  photosPath = "data-raw/player-photos.json",
  reportPath = "data-raw/build-report.json",
  today = new Date().toISOString().slice(0, 10),
} = {}) {
  const t0 = Date.now();
  const log = (m) =>
    console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);
  const tm = (f) => path.join(tmDir, f);
  const countryCode = buildCountryCodes();

  const clubs = await readJson(clubsPath);
  const clubById = new Map(clubs.map((c) => [c.id, c]));
  const squadFiles = (await exists(squadsDir))
    ? (await readdir(squadsDir)).filter((f) => f.endsWith(".json"))
    : [];
  const squads = [];
  for (const f of squadFiles)
    squads.push(await readJson(path.join(squadsDir, f)));
  const POS_NAME = {
    GK: "Goalkeeper",
    DF: "Defender",
    MF: "Midfielder",
    FW: "Attacker",
  };
  const slugToClub = new Map(clubs.map((c) => [c.slug, c.id]));
  const manualSquads = (await exists(squadsManualPath))
    ? await readJson(squadsManualPath, [])
    : [];
  for (const ms of manualSquads) {
    const clubId = slugToClub.get(ms.club);
    if (!clubId) {
      log(`Əl ilə heyət: "${ms.club}" klubu clubs.json-da tapılmadı`);
      continue;
    }
    for (let i = squads.length - 1; i >= 0; i--)
      if (squads[i].club_id === clubId) squads.splice(i, 1);
    squads.push({
      club_id: clubId,
      club_slug: ms.club,
      fetched_at: ms.as_of || today,
      manual: true,
      players: ms.players.map((pl) => ({
        id: `m-${ms.club}-${slugify(pl.name)}`,
        name: pl.name,
        number: pl.number ?? null,
        position: POS_NAME[pl.position] ?? pl.position,
        nationality: pl.nationality ?? null,
      })),
    });
    log(
      `Əl ilə heyət: ${clubById.get(clubId).name} (${ms.players.length} oyunçu)`,
    );
  }
  log(
    squads.length
      ? `${squads.length} klubun API-Football heyəti oxundu`
      : "API-Football heyəti yoxdur, heyətlər Transfermarkt-dan qurulacaq",
  );

  const compCountry = new Map(),
    compCodes = new Map();
  await eachRow(tm("competitions.csv.gz"), (r) => {
    compCountry.set(r.competition_id, r.country_name);
    compCodes.set(r.competition_id, r.competition_code);
  });
  const tmClubs = new Map();
  const addTmName = (id, name, country) => {
    if (!id || !name) return;
    let c = tmClubs.get(id);
    if (!c) tmClubs.set(id, (c = { names: new Set(), country: null }));
    c.names.add(name);
    const fix = { Türkiye: "Turkey", Czechia: "Czech Republic" };
    if (country && !c.country) c.country = fix[country] ?? country;
  };
  const tmClubCoach = new Map();
  await eachRow(tm("clubs.csv.gz"), (r) => {
    if (r.coach_name) tmClubCoach.set(r.club_id, r.coach_name);
    const country = compCountry.get(r.domestic_competition_id) || null;
    addTmName(r.club_id, r.name, country);
    addTmName(r.club_id, r.club_code.replace(/-/g, " "), country);
  });

  const tmPlayers = new Map();
  await eachRow(tm("players.csv.gz"), (r) => {
    tmPlayers.set(r.player_id, r);
    addTmName(
      r.current_club_id,
      r.current_club_name,
      compCountry.get(r.current_club_domestic_competition_id),
    );
  });
  log(`${tmPlayers.size} Transfermarkt oyunçusu oxundu`);

  const transfersBy = new Map();
  await eachRow(tm("transfers.csv.gz"), (r) => {
    if (!r.transfer_date || r.transfer_date > today) return;
    if (!transfersBy.has(r.player_id)) transfersBy.set(r.player_id, []);
    transfersBy.get(r.player_id).push(r);
    addTmName(r.from_club_id, r.from_club_name);
    addTmName(r.to_club_id, r.to_club_name);
  });

  const COUNTRY_NAME = {
    GB: null,
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
    GR: "Greece",
    CZ: "Czech Republic",
    HR: "Croatia",
    PL: "Poland",
    RO: "Romania",
    BG: "Bulgaria",
    HU: "Hungary",
    RS: "Serbia",
    UA: "Ukraine",
    RU: "Russia",
    IL: "Israel",
    CY: "Cyprus",
  };
  const ourNames = (c) => [c.name, ...(TM_ALIASES[c.slug] ?? [])];
  const tokenIndex = new Map();
  for (const c of clubs)
    for (const on of ourNames(c))
      for (const t of [...clubTokens(on), norm(on)]) {
        if (!tokenIndex.has(t)) tokenIndex.set(t, new Set());
        tokenIndex.get(t).add(c);
      }
  const tmToOur = new Map(),
    clubMapReport = [];
  for (const [tmId, info] of tmClubs) {
    const cands = new Set();
    for (const tn of info.names)
      for (const t of [...clubTokens(tn), norm(tn)])
        for (const c of tokenIndex.get(t) ?? []) cands.add(c);
    let best = null,
      score = 0,
      second = 0;
    for (const c of cands) {
      if (info.country) {
        if (c.country_id === "GB") {
          if (!["England", "Scotland"].includes(info.country)) continue;
        } else if (COUNTRY_NAME[c.country_id] !== info.country) continue;
      }
      let s = 0;
      for (const tn of info.names) {
        if (ourNames(c).some((on) => isReserveName(on, tn))) {
          s = 0;
          break;
        }
        for (const on of ourNames(c)) s = Math.max(s, clubScore(on, tn));
      }
      if (s > score) {
        second = score;
        score = s;
        best = c;
      } else if (s > second) second = s;
    }
    const need = info.country ? 0.6 : 0.8;
    if (best && score >= need && score - second >= 0.1) {
      const prev = tmToOur.get(tmId);
      tmToOur.set(tmId, best.id);
      if (!prev)
        clubMapReport.push({
          tm_id: tmId,
          tm_names: [...info.names].slice(0, 3),
          our: best.name,
          score: +score.toFixed(2),
        });
    }
  }
  log(
    `${new Set(tmToOur.values()).size}/${clubs.length} klub Transfermarkt-da tapıldı`,
  );

  const careers = (await exists(careersPath))
    ? ((await readJson(careersPath, {})).players ?? {})
    : {};
  const labelKey = (x) =>
    clubTokens(x)
      .filter((t) => t.length > 1)
      .sort()
      .join(" ");
  const byLabel = new Map();
  for (const c of clubs)
    for (const on of ourNames(c)) {
      const k = labelKey(on);
      if (k.split(" ").length < 2) continue;
      const prev = byLabel.get(k);
      byLabel.set(k, prev === undefined || prev === c.id ? c.id : null);
    }
  const GENERIC = new Set([
    "regatas",
    "esporte",
    "esportiva",
    "sociedade",
    "futebol",
    "associacao",
    "clube",
    "club",
    "sport",
    "sports",
    "deportivo",
    "football",
    "soccer",
  ]);
  const cleanLabel = (x) =>
    String(x ?? "").replace(/\b(?:[A-Za-z]\.\s?){2,}/g, " ");
  const isReserveLabel = (x) =>
    norm(cleanLabel(x))
      .split(" ")
      .some((t) => RESERVE.test(t) || t === "2" || t === "3");
  const tokSet = (x) =>
    new Set(clubTokens(cleanLabel(x)).filter((t) => t.length > 1));
  const byCountry = new Map();
  for (const c of clubs)
    for (const on of ourNames(c)) {
      const toks = tokSet(on);
      if (!toks.size) continue;
      if (!byCountry.has(c.country_id)) byCountry.set(c.country_id, []);
      byCountry.get(c.country_id).push({ id: c.id, toks });
    }
  const labelCountryMatch = (label, cc) => {
    if (!label || !cc || isReserveLabel(label)) return null;
    const lt = tokSet(label);
    if (!lt.size) return null;
    const cands = new Set();
    for (const { id, toks } of byCountry.get(cc) ?? []) {
      const inside = [...toks].every((t) => lt.has(t));
      const rest = [...lt].every((t) => toks.has(t) || GENERIC.has(t));
      if (inside && rest) cands.add(id);
    }
    return cands.size === 1 ? [...cands][0] : null;
  };
  const wdUnmapped = new Map();
  const careerCache = new Map();
  const careerOf = (pid) => {
    if (!pid) return [];
    if (careerCache.has(pid)) return careerCache.get(pid);
    const out = (careers[pid]?.s ?? []).map(
      ([clubTm, , label, from, to, cc]) => {
        const id =
          (clubTm && tmToOur.get(String(clubTm))) ||
          labelCountryMatch(label, cc) ||
          (label && !isReserveLabel(label) && byLabel.get(labelKey(label))) ||
          null;
        if (!id && label)
          wdUnmapped.set(label, (wdUnmapped.get(label) ?? 0) + 1);
        return { id, label, from, to };
      },
    );
    careerCache.set(pid, out);
    return out;
  };
  const currentOf = (pid) =>
    careerOf(pid)
      .filter((s) => s.from && !s.to)
      .sort((a, b) => a.from.localeCompare(b.from))
      .at(-1) ?? null;
  const careerClubOn = (pid, date) => {
    const list = careerOf(pid).filter((s) => s.from);
    if (!list.length) return undefined;
    const d = date.slice(0, 10);
    const here = list
      .filter((s) => s.from <= d && (!s.to || d <= s.to))
      .sort((a, b) => a.from.localeCompare(b.from));
    return here.at(-1)?.id ?? null;
  };
  const careerCount = Object.values(careers).filter((c) => c.s?.length).length;
  log(
    careerCount
      ? `${careerCount} oyunçunun Wikidata klub karyerası oxundu`
      : "Wikidata klub karyerası yoxdur (əvvəlcə: node scripts/fetch-careers.mjs)",
  );

  const wdClubs = new Map();
  for (const c of Object.values(careers))
    for (const [clubTm, , label, , , cc] of c.s ?? []) {
      if (!clubTm || !cc || !label) continue;
      const k = String(clubTm);
      if (!wdClubs.has(k)) wdClubs.set(k, { cc: new Map(), labels: new Set() });
      const w = wdClubs.get(k);
      w.cc.set(cc, (w.cc.get(cc) ?? 0) + 1);
      w.labels.add(label);
    }
  let wdFixed = 0,
    wdAdded = 0;
  for (const [tmId, w] of wdClubs) {
    const [cc] = [...w.cc].sort((a, b) => b[1] - a[1])[0];
    const cur = tmToOur.get(tmId);
    if (cur && clubById.get(cur)?.country_id === cc) continue;
    const hits = new Set(
      [...w.labels].map((l) => labelCountryMatch(l, cc)).filter(Boolean),
    );
    if (hits.size !== 1) continue;
    const [fix] = hits;
    if (fix === cur) continue;
    tmToOur.set(tmId, fix);
    clubMapReport.push({
      tm_id: tmId,
      tm_names: [...w.labels].slice(0, 3),
      our: clubById.get(fix).name,
      score: cur
        ? `Wikidata düzəlişi (əvvəl: ${clubById.get(cur).name})`
        : `Wikidata adı + ölkə (${cc})`,
    });
    if (cur) wdFixed++;
    else wdAdded++;
  }
  if (wdFixed || wdAdded)
    log(
      `Wikidata ilə: ${wdAdded} klub əlavə tanındı, ${wdFixed} səhv bağlantı düzəldildi`,
    );

  const byFull = new Map(),
    bySurname = new Map();
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
    const ageOk = (p) =>
      !ap.age ||
      !p.date_of_birth ||
      Math.abs(ageOn(p.date_of_birth, day) - ap.age) <= 1;
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

  const used = new Set(),
    entries = [],
    unmatched = [];
  const newest = new Map();
  for (const sq of squads)
    for (const ap of sq.players ?? []) {
      if (ap.id == null) continue;
      const prev = newest.get(ap.id);
      if (!prev || (sq.fetched_at || "") > (prev.fetched_at || ""))
        newest.set(ap.id, sq);
    }
  const twice = [],
    claims = new Map();
  for (const sq of squads) {
    const day = sq.fetched_at || today;
    for (const ap of sq.players ?? []) {
      if (ap.id != null && newest.get(ap.id) !== sq) {
        twice.push(
          `${ap.name}: ${clubById.get(sq.club_id)?.name} -> ${clubById.get(newest.get(ap.id).club_id)?.name}`,
        );
        continue;
      }
      const e = { ap, tm: null, clubId: sq.club_id, day };
      entries.push(e);
      const p = matchPlayer(ap, sq.club_id, day);
      if (!p) continue;
      if (!claims.has(p.player_id)) claims.set(p.player_id, []);
      claims.get(p.player_id).push([e, p]);
    }
  }
  const claimScore = ([e, p]) =>
    (tmToOur.get(p.current_club_id) === e.clubId ? 2 : 0) +
    (norm(e.ap.name) === norm(p.name) ? 1 : 0);
  const dropped = new Set();
  for (const list of claims.values()) {
    list.sort(
      (a, b) =>
        claimScore(b) - claimScore(a) ||
        (b[0].day || "").localeCompare(a[0].day || ""),
    );
    const [[win, p], ...rest] = list;
    win.tm = p;
    used.add(p.player_id);
    for (const [e] of rest) {
      if (norm(e.ap.name) !== norm(p.name)) continue;
      dropped.add(e);
      twice.push(
        `${e.ap.name}: ${clubById.get(e.clubId)?.name} -> ${clubById.get(win.clubId)?.name}`,
      );
    }
  }
  if (dropped.size) {
    const keep = entries.filter((e) => !dropped.has(e));
    entries.length = 0;
    entries.push(...keep);
  }
  for (const e of entries)
    if (!e.tm)
      unmatched.push({
        club: clubById.get(e.clubId)?.name,
        name: e.ap.name,
        age: e.ap.age,
        api_id: e.ap.id,
      });

  const votes = new Map();
  for (const e of entries) {
    const tmId = e.tm?.current_club_id;
    if (!tmId || tmToOur.has(tmId)) continue;
    if (!votes.has(tmId)) votes.set(tmId, new Map());
    const m = votes.get(tmId);
    m.set(e.clubId, (m.get(e.clubId) ?? 0) + 1);
  }
  let voted = 0;
  for (const [tmId, m] of votes) {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    const [best, n] = [...m].sort((a, b) => b[1] - a[1])[0];
    if (n < 3 || n / total < 0.6) continue;
    const our = clubById.get(best);
    const names = [...(tmClubs.get(tmId)?.names ?? [])];
    if (names.some((tn) => ourNames(our).some((on) => isReserveName(on, tn))))
      continue;
    tmToOur.set(tmId, best);
    clubMapReport.push({
      tm_id: tmId,
      tm_names: names.slice(0, 3),
      our: our.name,
      score: `heyət səsi: ${n}/${total}`,
    });
    voted++;
  }
  let secondPass = 0;
  if (voted) {
    const nowMatched = new Set();
    for (const e of entries) {
      if (e.tm) continue;
      const p = matchPlayer(e.ap, e.clubId, e.day);
      if (!p || used.has(p.player_id)) continue;
      e.tm = p;
      used.add(p.player_id);
      nowMatched.add(e.ap.id);
      secondPass++;
    }
    const still = unmatched.filter((u) => !nowMatched.has(u.api_id));
    unmatched.length = 0;
    unmatched.push(...still);
  }
  if (squads.length)
    log(
      `${entries.length} API-Football oyunçusu, ${used.size} Transfermarkt ilə uyğunlaşdı` +
        (voted
          ? ` (${voted} klub heyətə görə tanındı, +${secondPass} oyunçu)`
          : ""),
    );
  if (twice.length)
    log(
      `${twice.length} oyunçu 2 klubun heyətində idi, biri saxlanıldı (siyahı: ${reportPath} -> players_in_two_squads)`,
    );

  const apiClubs = new Set(squads.map((sq) => sq.club_id));
  const lastVal = new Map();
  await eachRow(tm("player_valuations.csv.gz"), (r) => {
    if (!lastVal.has(r.player_id) || r.date > lastVal.get(r.player_id))
      lastVal.set(r.player_id, r.date);
  });
  let maxSeason = 0,
    dataDate = "";
  for (const p of tmPlayers.values())
    maxSeason = Math.max(maxSeason, Number(p.last_season) || 0);
  for (const d of lastVal.values()) if (d > dataDate) dataDate = d;
  const active = (p) =>
    Number(p.last_season) >= maxSeason - 1 ||
    (lastVal.has(p.player_id) &&
      days(lastVal.get(p.player_id), dataDate) <= 400);
  let fromTm = 0;
  for (const p of tmPlayers.values()) {
    if (used.has(p.player_id)) continue;
    const clubId = tmToOur.get(p.current_club_id);
    if (!clubId || apiClubs.has(clubId) || !active(p)) continue;
    const moved = currentOf(p.player_id);
    if (moved && moved.id !== clubId && moved.from >= dataDate.slice(0, 10))
      continue;
    used.add(p.player_id);
    entries.push({ ap: { name: p.name }, tm: p, clubId });
    fromTm++;
  }
  log(
    `${fromTm} oyunçu Transfermarkt-dakı hazırkı klubuna görə əlavə olundu (data tarixi: ${dataDate.slice(0, 10) || "?"})`,
  );

  const RETIRED_MIN_VALUE = 10_000_000,
    RETIRED_MIN_CAPS = 50;
  const playedForUs = (p) =>
    Boolean(tmToOur.get(p.current_club_id)) ||
    (transfersBy.get(p.player_id) ?? []).some(
      (t) => tmToOur.get(t.to_club_id) || tmToOur.get(t.from_club_id),
    ) ||
    careerOf(p.player_id).some((s) => s.id);
  let retiredCount = 0;
  for (const p of tmPlayers.values()) {
    if (used.has(p.player_id) || active(p)) continue;
    const notable =
      (num(p.highest_market_value_in_eur) ?? 0) >= RETIRED_MIN_VALUE ||
      (num(p.international_caps) ?? 0) >= RETIRED_MIN_CAPS;
    if (!notable || !playedForUs(p)) continue;
    used.add(p.player_id);
    entries.push({ ap: { name: p.name }, tm: p, clubId: null, retired: true });
    retiredCount++;
  }
  log(`${retiredCount} karyerasını bitirmiş tanınmış oyunçu əlavə olundu`);

  const STAR_MIN_VALUE = 10_000_000,
    STAR_MIN_CAPS = 40;
  let starCount = 0,
    starOutside = 0;
  for (const p of tmPlayers.values()) {
    if (used.has(p.player_id) || !active(p)) continue;
    const notable =
      (num(p.highest_market_value_in_eur) ?? 0) >= STAR_MIN_VALUE ||
      (num(p.international_caps) ?? 0) >= STAR_MIN_CAPS;
    if (!notable || !playedForUs(p)) continue;
    const cur = currentOf(p.player_id);
    const clubId = cur?.id && !apiClubs.has(cur.id) ? cur.id : null;
    const clubLabel = !cur?.id && cur?.label ? cur.label : null;
    used.add(p.player_id);
    entries.push({ ap: { name: p.name }, tm: p, clubId, clubLabel });
    starCount++;
    if (!clubId) starOutside++;
  }
  log(
    `${starCount} tanınmış aktiv oyunçu heyətlərdən kənarda tapılıb əlavə olundu (${starOutside} nəfərin klubu siyahımızda deyil)`,
  );
  const careerEnd = new Map();
  for (const e of entries) {
    if (!e.retired) continue;
    const p = e.tm,
      last = num(p.last_season);
    const byVal = lastVal.get(p.player_id)?.slice(0, 10);
    const bySeason = last ? `${last + 1}-06-30` : null;
    const end = [byVal, bySeason].filter(Boolean).sort().at(-1);
    if (end) careerEnd.set(p.player_id, end);
  }

  const games = new Map();
  await eachRow(tm("games.csv.gz"), (r) =>
    games.set(r.game_id, {
      c: r.competition_id,
      s: r.season,
      d: r.date,
      h: r.home_club_id,
      a: r.away_club_id,
      hm: r.home_club_manager_name || "",
      am: r.away_club_manager_name || "",
    }),
  );
  let lastSeason = 0;
  for (const g of games.values())
    if (Number(g.s) > lastSeason) lastSeason = Number(g.s);
  const blank = () => ({
    appearances: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
  });
  const career = new Map(),
    season = new Map(),
    playedUnder = new Map();
  await eachRow(tm("appearances.csv.gz"), (r) => {
    if (!used.has(r.player_id)) return;
    const g = games.get(r.game_id);
    const coach =
      g &&
      (r.player_club_id === g.h ? g.hm : r.player_club_id === g.a ? g.am : "");
    if (coach) {
      let m = playedUnder.get(r.player_id);
      if (!m) playedUnder.set(r.player_id, (m = new Map()));
      const k = norm(coach);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    const add = (map) => {
      let s = map.get(r.player_id);
      if (!s) map.set(r.player_id, (s = blank()));
      const yr = Number(g?.s);
      if (map === career && yr && (!s.since || yr < s.since)) s.since = yr;
      s.appearances++;
      s.goals += +r.goals || 0;
      s.assists += +r.assists || 0;
      s.yellow_cards += +r.yellow_cards || 0;
      s.red_cards += +r.red_cards || 0;
    };
    add(career);
    if (Number(games.get(r.game_id)?.s) === lastSeason) add(season);
  });
  log("statistika hesablandı");

  const valDate = new Map();
  await eachRow(tm("player_valuations.csv.gz"), (r) => {
    if (!used.has(r.player_id)) return;
    if (!valDate.has(r.player_id) || r.date > valDate.get(r.player_id))
      valDate.set(r.player_id, r.date);
  });

  const { trophiesOf, trophyReport } = await computeTrophies({
    winnersPath,
    tm,
    games,
    used,
    tmPlayers,
    transfersBy,
    tmToOur,
    clubs,
    compCodes,
    countryCode,
    today,
    log,
    careerEnd,
    careerClubOn,
  });

  const imageMap = async (kind) =>
    (await exists(path.join(imagesDir, `${kind}.json`)))
      ? readJson(path.join(imagesDir, `${kind}.json`), {})
      : {};
  const playerPhotos = await imageMap("players");
  const coachPhotos = await imageMap("coaches");
  const { coaches, coachIdsOf, natCodeOf } = await buildCoaches({
    tm,
    games,
    tmToOur,
    tmClubCoach,
    countryCode,
    playedUnder,
    coachesManualPath,
    coachPhotos,
    today,
    log,
  });

  const manual = new Map();
  if (await exists(manualPath)) {
    for (const p of await readJson(manualPath, [])) manual.set(norm(p.name), p);
  }

  const ids = (await exists(idsPath)) ? await readJson(idsPath, {}) : {};
  let nextId = Math.max(0, ...Object.values(ids)) + 1;
  const reserved = new Set();
  for (const e of entries) {
    const own = e.tm && ids[`tm:${e.tm.player_id}`];
    if (own) reserved.add(own);
  }
  const given = new Set();
  const idFor = (p, ap) => {
    const own = p && ids[`tm:${p.player_id}`];
    const apiId = ap.id != null ? ids[`api:${ap.id}`] : null;
    let id = null;
    if (own && !given.has(own)) id = own;
    else if (
      apiId &&
      !given.has(apiId) &&
      (!reserved.has(apiId) || apiId === own)
    )
      id = apiId;
    if (!id) id = nextId++;
    given.add(id);
    if (p) ids[`tm:${p.player_id}`] = id;
    if (ap.id != null) ids[`api:${ap.id}`] = id;
    return id;
  };
  const value = (e) => (e.retired ? 0 : Number(e.tm?.market_value_in_eur) || 0);
  entries.sort((a, b) => value(b) - value(a));
  const players = [],
    photos = {},
    slugs = new Set();
  for (const { ap, tm: p, clubId, clubLabel, retired } of entries) {
    const name = p?.name || ap.name;
    let slug = slugify(name);
    if (slugs.has(slug))
      slug = `${slug}-${(p?.date_of_birth || "").slice(0, 4) || ap.id}`;
    if (slugs.has(slug)) slug = `${slug}-${p?.player_id ?? ap.id}`;
    slugs.add(slug);

    const o = {
      id: idFor(p, ap),
      name,
      slug,
    };
    if (playerPhotos[slug]) o.photo_url = playerPhotos[slug];
    const nat =
      (p && countryCode(p.country_of_citizenship)) ||
      (ap.nationality && countryCode(ap.nationality));
    if (nat) o.nationality_code = nat;
    const pos = POS_API[ap.position] || (p && POS_TM[p.position]);
    if (pos) o.position = pos;
    o.is_active = !retired;
    if (p?.date_of_birth) o.birth_date = p.date_of_birth.slice(0, 10);
    if (num(p?.height_in_cm)) o.height_cm = num(p.height_in_cm);
    if (p && ["left", "right", "both"].includes(p.foot))
      o.preferred_foot = p.foot;
    if (clubId) o.current_club_id = clubId;
    else if (clubLabel) o.current_club_name = clubLabel;
    const wd = careerOf(p?.player_id);
    if (retired) {
      const tmYear = num(p.last_season) ? num(p.last_season) + 1 : null;
      const wdYear = Math.max(
        0,
        ...wd.filter((s) => s.to).map((s) => Number(s.to.slice(0, 4))),
      );
      const year = Math.max(tmYear ?? 0, wdYear);
      if (year) o.retired_year = year;
    }

    const hist = [];
    const push = (id) => {
      if (id && hist.at(-1) !== id) hist.push(id);
    };
    const tr = (p && transfersBy.get(p.player_id)) || [];
    tr.sort((a, b) => a.transfer_date.localeCompare(b.transfer_date));
    const tmSeq = [];
    if (tr.length)
      tmSeq.push({
        d: tr[0].transfer_date.slice(0, 10),
        id: tmToOur.get(tr[0].from_club_id),
        keep: true,
      });
    for (const t of tr)
      tmSeq.push({
        d: t.transfer_date.slice(0, 10),
        id: tmToOur.get(t.to_club_id),
      });
    const tmStays = tmSeq.filter(
      (e, i) =>
        e.keep || i === tmSeq.length - 1 || days(e.d, tmSeq[i + 1].d) >= 30,
    );
    const tmClubSet = new Set(tmStays.map((e) => e.id).filter(Boolean));
    const firstTm = tr.length ? tr[0].transfer_date.slice(0, 10) : "9999-12-31";
    const events = tmStays.map((e, i) => [
      e.d,
      i === 0 && e.keep ? 0 : 1,
      e.id,
    ]);
    for (const s of wd) {
      if (!s.id) continue;
      const d = s.from ?? s.to ?? "9999-12-30";
      if (d < firstTm || !tmClubSet.has(s.id)) events.push([d, 0, s.id]);
    }
    if (!tr.length && !wd.some((s) => s.id))
      events.push(["0000-00-00", 0, p && tmToOur.get(p.current_club_id)]);
    events.sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
    for (const [, , id] of events) push(id);
    push(clubId);
    o.club_history = hist;

    const stints = [];
    const open = (id, from) => {
      const last = stints.at(-1);
      if (last && !last.to && last.club_id === id) return;
      if (last && !last.to) last.to = from;
      if (!id) return;
      const s = { club_id: id };
      if (from) s.from = from;
      stints.push(s);
    };
    if (tr.length) open(tmToOur.get(tr[0].from_club_id), null);
    for (const t of tr)
      open(tmToOur.get(t.to_club_id) ?? 0, t.transfer_date.slice(0, 10));
    if (clubId && (stints.at(-1)?.club_id !== clubId || stints.at(-1)?.to))
      open(clubId, today.slice(0, 10));
    if (!clubId && stints.at(-1) && !stints.at(-1).to) {
      const end =
        lastVal.get(p?.player_id)?.slice(0, 10) ||
        (o.retired_year ? `${o.retired_year}-06-30` : null);
      if (end) stints.at(-1).to = end;
    }
    const tmStintClubs = new Set(stints.map((s) => s.club_id));
    for (const s of wd) {
      if (!s.id || tmStintClubs.has(s.id)) continue;
      const x = { club_id: s.id };
      if (s.from) x.from = s.from;
      if (s.to) x.to = s.to;
      stints.push(x);
    }
    stints.sort((a, b) => (a.from ?? "").localeCompare(b.from ?? ""));
    if (stints.length) o.club_stints = stints;

    const caps = num(p?.international_caps);
    if (caps) {
      o.international = { caps };
      const goals = num(p.international_goals);
      if (goals) o.international.goals = goals;
      const team = natCodeOf.get(p.current_national_team_id);
      if (team) o.international.team_code = team;
    }
    const coachIds = p ? coachIdsOf(p.player_id) : [];
    if (coachIds.length) o.coach_ids = coachIds;

    if (!retired && num(p?.market_value_in_eur)) {
      o.market_value = { amount_eur: num(p.market_value_in_eur) };
      if (valDate.has(p.player_id))
        o.market_value.updated_at = valDate.get(p.player_id);
    }
    if (num(p?.highest_market_value_in_eur)) {
      o.market_value ??= {};
      o.market_value.highest_eur = num(p.highest_market_value_in_eur);
    }
    const c = p && career.get(p.player_id),
      s = p && season.get(p.player_id);
    if (c || s) {
      o.stats = {};
      if (c) o.stats.career = c;
      if (s)
        o.stats.season = {
          season: `${lastSeason}-${String(lastSeason + 1).slice(2)}`,
          ...s,
        };
    }
    const tro = new Map(p ? trophiesOf(p.player_id) : []);
    for (const t of manual.get(norm(name))?.trophies ?? [])
      tro.set(t.id, Math.max(tro.get(t.id) ?? 0, t.count));
    if (tro.size) o.trophies = [...tro].map(([id, count]) => ({ id, count }));
    o.data_as_of = today.slice(0, 7);

    players.push(o);
    const src = p?.image_url || ap.photo;
    if (src) photos[slug] = src;
  }

  const legends = (await exists(legendsPath))
    ? await readJson(legendsPath, [])
    : [];
  const clubBySlug = new Map(clubs.map((c) => [c.slug, c.id]));
  const byNameYear = new Map(
    players.map((x) => [
      `${norm(x.name)}|${x.birth_date?.slice(0, 4) ?? ""}`,
      x,
    ]),
  );
  let legendNew = 0,
    legendMerged = 0;
  for (const L of legends) {
    const key = `${norm(L.name)}|${L.birth_date?.slice(0, 4) ?? ""}`;
    const found = byNameYear.get(key);
    if (found) {
      const tro = new Map((found.trophies ?? []).map((t) => [t.id, t.count]));
      for (const t of L.trophies ?? [])
        tro.set(t.id, Math.max(tro.get(t.id) ?? 0, t.count));
      if (tro.size)
        found.trophies = [...tro].map(([id, count]) => ({ id, count }));
      const legendHist = [];
      for (const cs of L.clubs ?? []) {
        const cid = clubBySlug.get(cs);
        if (cid && legendHist.at(-1) !== cid) legendHist.push(cid);
      }
      if (legendHist.length) {
        const merged = [...legendHist];
        for (const id of found.club_history)
          if (!legendHist.includes(id) && merged.at(-1) !== id) merged.push(id);
        found.club_history = merged;
      }
      if (!found.is_active && L.retired_year)
        found.retired_year = L.retired_year;
      legendMerged++;
      continue;
    }
    let slug = L.slug || slugify(L.name);
    if (slugs.has(slug))
      slug = `${slug}-${L.birth_date?.slice(0, 4) ?? "legend"}`;
    slugs.add(slug);
    const keyId = `legend:${slug}`;
    if (!ids[keyId] || given.has(ids[keyId])) ids[keyId] = nextId++;
    given.add(ids[keyId]);
    const o = { id: ids[keyId], name: L.name, slug };
    if (L.photo_url || playerPhotos[slug])
      o.photo_url = L.photo_url || playerPhotos[slug];
    for (const f of ["nationality_code", "position"]) if (L[f]) o[f] = L[f];
    o.is_active = false;
    for (const f of [
      "birth_date",
      "height_cm",
      "preferred_foot",
      "retired_year",
    ])
      if (L[f]) o[f] = L[f];
    const hist = [];
    for (const cs of L.clubs ?? []) {
      const cid = clubBySlug.get(cs);
      if (cid && hist.at(-1) !== cid) hist.push(cid);
    }
    o.club_history = hist;
    if (L.trophies?.length)
      o.trophies = L.trophies.map((t) => ({ id: t.id, count: t.count }));
    o.source = "manual";
    players.push(o);
    legendNew++;
  }
  if (legends.length)
    log(
      `Legendlər: ${legendNew} yeni, ${legendMerged} Transfermarkt-dakı oyunçu ilə birləşdi`,
    );

  const squadSize = new Map();
  for (const x of players)
    squadSize.set(
      x.current_club_id,
      (squadSize.get(x.current_club_id) ?? 0) + 1,
    );
  const thin = clubs.filter((c) => (squadSize.get(c.id) ?? 0) < 15);

  await writeJson(outPath, players);
  await writeJson(idsPath, ids);
  await writeJson(coachesPath, coaches);
  await writeJson(photosPath, photos);
  await writeJson(reportPath, {
    built_at: today,
    squads: squads.length,
    players: players.length,
    matched: used.size,
    unmatched_players: unmatched,
    players_in_two_squads: twice,
    tm_club_map: clubMapReport,
    wikidata_unmapped_clubs: [...wdUnmapped]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 150)
      .map(([label, n]) => `${label} (${n})`),
    trophy_competitions: trophyReport,
    squad_sizes: Object.fromEntries(
      clubs.map((c) => [c.name, squadSize.get(c.id) ?? 0]),
    ),
    thin_squads: thin.map((c) => `${c.name} (${squadSize.get(c.id) ?? 0})`),
  });
  const fromSquads = players.filter((x) => x.source !== "manual").length;
  const pct = fromSquads ? Math.round((used.size / fromSquads) * 100) : 0;
  log(`Hazırdır: ${players.length} oyunçu -> ${outPath}`);
  console.log(`   Məşqçilər: ${coaches.length} -> ${coachesPath}`);
  console.log(
    `   Milli komanda oyunu olan oyunçular: ${players.filter((x) => x.international).length}`,
  );
  console.log(`   Transfermarkt ilə uyğunlaşan: ${used.size} (${pct}%)`);
  console.log(
    `   Heyəti 15 oyunçudan az olan klublar: ${thin.length} (siyahı: ${reportPath} -> thin_squads)`,
  );
  console.log(`   Hesabat: ${reportPath}`);
  return { players, unmatched };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  build().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
