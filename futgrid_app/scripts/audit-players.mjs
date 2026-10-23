import fs from "node:fs";
import { eachRow, norm } from "./build-players.mjs";

const MIN_VALUE = Number(process.argv[2]) || 15_000_000;
const MIN_CAPS = 50;

const read = (p, fallback) =>
  fs.existsSync(p)
    ? JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""))
    : fallback;
const players = read("public/data/players.json", []);
const ids = read("src/data/player-ids.json", {});
const careers =
  read("data-raw/wikidata/careers.json", { players: {} }).players ?? {};
const clubs = read("public/data/clubs.json", []);
const clubName = new Map(clubs.map((c) => [c.id, c.name]));

const STOP = new Set([
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
  "the",
  "de",
  "da",
  "do",
  "del",
  "of",
  "and",
  "calcio",
  "futbol",
  "football",
  "clube",
  "regatas",
  "esporte",
  "esportiva",
  "sociedade",
  "futebol",
  "associacao",
  "sport",
  "sports",
  "deportivo",
  "soccer",
]);
const RESERVE =
  /\b(b|c|ii|iii|2|3|u\d{2}|reserves?|youth|academy|atletic|castilla|primavera|juvenil|cantera|next gen|national|regional|olympic)\b/;
const clean = (l) =>
  norm(String(l ?? "").replace(/\b(?:[A-Za-z]\.\s?){2,}/g, " "));
const toks = (l) =>
  new Set(
    clean(l)
      .split(" ")
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );

const clubKeys = clubs
  .map((c) => ({ id: c.id, cc: c.country_id, t: toks(c.name) }))
  .filter((c) => c.t.size);
const ourClubOf = (label, cc) => {
  if (!label || RESERVE.test(clean(label))) return null;
  const lt = toks(label);
  if (!lt.size) return null;
  const hits = clubKeys.filter(
    (c) =>
      (!cc || c.cc === cc) &&
      c.t.size === lt.size &&
      [...c.t].every((t) => lt.has(t)),
  );
  return hits.length === 1 ? hits[0].id : null;
};

const byId = new Map(players.map((p) => [p.id, p]));
const byKey = new Map(
  players.map((p) => [`${norm(p.name)}|${p.birth_date?.slice(0, 4) ?? ""}`, p]),
);
const apiOnly = new Map();
for (const p of players) {
  if (p.birth_date || p.source === "manual") continue;
  const n = norm(p.name);
  const parts = n.split(" ");
  for (const k of [n, `${parts[0][0]}|${parts.at(-1)}`])
    apiOnly.set(k, [...(apiOnly.get(k) ?? []), p]);
}
const findApiOnly = (name) => {
  const n = norm(name);
  const parts = n.split(" ");
  return (
    apiOnly.get(n)?.[0] ??
    apiOnly.get(`${parts[0][0]}|${parts.at(-1)}`)?.[0] ??
    null
  );
};

const transfers = new Map();
await eachRow("data-raw/transfermarkt/transfers.csv.gz", (r) => {
  transfers.set(r.player_id, (transfers.get(r.player_id) ?? 0) + 1);
});

let maxSeason = 0;
const famous = [];
await eachRow("data-raw/transfermarkt/players.csv.gz", (r) => {
  maxSeason = Math.max(maxSeason, Number(r.last_season) || 0);
  const value = Number(r.highest_market_value_in_eur) || 0;
  const caps = Number(r.international_caps) || 0;
  if (value >= MIN_VALUE || caps >= MIN_CAPS) famous.push(r);
});

const missing = [],
  apiUnmatched = [],
  gaps = [];
let ok = 0;
for (const r of famous) {
  const ourId = ids[`tm:${r.player_id}`];
  const p =
    (ourId && byId.get(ourId)) ||
    byKey.get(`${norm(r.name)}|${r.date_of_birth?.slice(0, 4) ?? ""}`);
  const wd = careers[r.player_id];
  const info = {
    name: r.name,
    tm_id: r.player_id,
    last_season: Number(r.last_season) || null,
    active_by_tm: Number(r.last_season) >= maxSeason - 1,
    tm_club: r.current_club_name || null,
    highest_value_m: Math.round(
      (Number(r.highest_market_value_in_eur) || 0) / 1e6,
    ),
    caps: Number(r.international_caps) || 0,
    tm_transfers: transfers.get(r.player_id) ?? 0,
    wikidata: wd
      ? wd.q
        ? `${wd.s?.length ?? 0} klub`
        : "Wikidata-da tapılmadı"
      : "yoxlanmayıb",
    wikidata_clubs: (wd?.s ?? []).map((s) => s[2]).filter(Boolean),
    wikidata_stints: (wd?.s ?? []).map((s) => [s[2], s[5]]),
  };
  if (!p) {
    const api = findApiOnly(r.name);
    if (api)
      apiUnmatched.push({
        ...info,
        api_name: api.name,
        api_club: clubName.get(api.current_club_id) ?? "-",
      });
    else {
      const linked = [
        ...new Set(
          [
            ...info.wikidata_stints.map(([l, cc]) => ourClubOf(l, cc)),
            ourClubOf(info.tm_club),
          ].filter(Boolean),
        ),
      ];
      missing.push({
        ...info,
        our_clubs: linked.map((id) => clubName.get(id) ?? id),
      });
    }
    continue;
  }
  const hist = new Set(p.club_history ?? []);
  const lost = [
    ...new Set(
      info.wikidata_stints.map(([l, cc]) => ourClubOf(l, cc)).filter(Boolean),
    ),
  ].filter((id) => !hist.has(id));
  if (lost.length) {
    gaps.push({
      ...info,
      tm_matched: Boolean(p.birth_date),
      history: [...hist].map((id) => clubName.get(id) ?? id),
      missing_clubs: lost.map((id) => clubName.get(id) ?? id),
    });
    continue;
  }
  ok++;
}

const byValue = (a, b) => b.highest_value_m - a.highest_value_m;
missing.sort(
  (a, b) => b.our_clubs.length - a.our_clubs.length || byValue(a, b),
);
apiUnmatched.sort(byValue);
gaps.sort(byValue);
fs.writeFileSync(
  "data-raw/audit-report.json",
  JSON.stringify(
    {
      min_value: MIN_VALUE,
      min_caps: MIN_CAPS,
      missing,
      api_unmatched: apiUnmatched,
      history_gaps: gaps,
    },
    null,
    2,
  ),
);

console.log(
  `Tanınmış oyunçu (ən yüksək dəyər ≥ ${MIN_VALUE / 1e6}M və ya ${MIN_CAPS}+ milli oyun): ${famous.length}`,
);
console.log(`   Datada var, tarixçəsi qaydasında: ${ok}`);
console.log(
  `   Datada var, amma tarixçədə bizim siyahıdakı klub çatışmır: ${gaps.length}`,
);
console.log(
  `   API heyətində var, amma Transfermarkt ilə uyğunlaşmayıb: ${apiUnmatched.length}`,
);
const linkedMissing = missing.filter((m) => m.our_clubs.length);
console.log(`   Datada YOXDUR: ${missing.length}`);
console.log(
  `      bizim klublarda oynayıb (əsl problem): ${linkedMissing.length}`,
);
console.log(
  `      bizim heç bir klubda oynamayıb (oyunda lazım deyil): ${missing.length - linkedMissing.length}`,
);

console.log("\nDatada olmayan, amma bizim klublarda oynamış oyunçular:");
for (const m of linkedMissing.slice(0, 20))
  console.log(
    `   ${m.name} | ${m.highest_value_m}M | ${m.caps} milli oyun | TM klubu: ${m.tm_club ?? "-"} | bizim klublar: ${m.our_clubs.join(", ")}`,
  );
if (!linkedMissing.length) console.log("   yoxdur");
console.log("\nAPI-də var, TM ilə uyğunlaşmayan ilk 20 oyunçu:");
for (const m of apiUnmatched.slice(0, 20))
  console.log(
    `   ${m.name} (TM) ↔ ${m.api_name} (API, ${m.api_club}) | ${m.highest_value_m}M | TM klubu: ${m.tm_club ?? "-"}`,
  );
console.log("\nTarixçəsində klub çatışmayan ilk 20 oyunçu:");
for (const m of gaps.slice(0, 20))
  console.log(
    `   ${m.name} | ${m.highest_value_m}M | TM: ${m.tm_matched ? "bəli" : "XEYR"} | tarixçə: ${m.history.join(" → ") || "BOŞ"} | çatışmır: ${m.missing_clubs.join(", ")}`,
  );

const dupes = new Map();
for (const p of players) {
  if (!p.birth_date) continue;
  const k = `${norm(p.name)}|${p.birth_date}`;
  dupes.set(k, [...(dupes.get(k) ?? []), p]);
}
const doubled = [...dupes.values()].filter((l) => l.length > 1);
console.log(
  `\nEyni ad və eyni doğum tarixi ilə 2+ dəfə olan oyunçu: ${doubled.length}`,
);
for (const l of doubled.slice(0, 10))
  console.log(
    `   ${l[0].name}: ${l.map((p) => clubName.get(p.current_club_id) ?? p.current_club_name ?? "-").join(" | ")}`,
  );
const leavers = new Map();
for (const p of players) {
  if (
    !p.birth_date ||
    !p.is_active ||
    p.current_club_id ||
    !p.club_history?.length
  )
    continue;
  const k = `${p.club_history.at(-1)}|${p.position ?? ""}|${p.nationality_code ?? ""}`;
  leavers.set(k, [...(leavers.get(k) ?? []), p]);
}
const maybeDup = [];
for (const p of players) {
  if (p.birth_date || p.source === "manual" || !p.current_club_id) continue;
  const l = leavers.get(
    `${p.current_club_id}|${p.position ?? ""}|${p.nationality_code ?? ""}`,
  );
  if (l?.length)
    maybeDup.push({
      api: p.name,
      club: clubName.get(p.current_club_id) ?? "-",
      tm: l.map((x) => `${x.name} (${x.birth_date.slice(0, 4)})`),
    });
}
console.log(
  `\nEhtimal olunan dublikat (API-də datasız oyunçu ↔ eyni klubdan ayrılmış, eyni mövqe və ölkəli TM oyunçusu): ${maybeDup.length}`,
);
for (const d of maybeDup.slice(0, 15))
  console.log(`   ${d.api} (API, ${d.club}) ↔ ${d.tm.join(" / ")}`);
const report = JSON.parse(
  fs.readFileSync("data-raw/audit-report.json", "utf8"),
);
report.possible_duplicates = maybeDup;
fs.writeFileSync("data-raw/audit-report.json", JSON.stringify(report, null, 2));

const idCount = new Map();
for (const p of players)
  idCount.set(p.id, [...(idCount.get(p.id) ?? []), p.name]);
const sameId = [...idCount].filter(([, l]) => l.length > 1);
console.log(`\nEyni ID ilə 2+ oyunçu: ${sameId.length}`);
for (const [id, l] of sameId.slice(0, 10))
  console.log(`   ${id}: ${l.join(" | ")}`);
console.log("\nTam siyahı: data-raw/audit-report.json");
