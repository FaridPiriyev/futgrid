import fs from "node:fs";
import { eachRow } from "./build-players.mjs";

const NAMES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["Aubameyang", "Lewandowski", "Wayne Rooney", "Fernando Torres"];

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
const hit = (name) => NAMES.find((n) => norm(name).includes(norm(n)));

const clubs = JSON.parse(fs.readFileSync("public/data/clubs.json", "utf8"));
const clubName = new Map(clubs.map((c) => [c.id, c.name]));
const players = JSON.parse(fs.readFileSync("public/data/players.json", "utf8"));

console.log("=== players.json ===");
for (const n of NAMES) {
  const found = players.filter((p) => hit(p.name) === n);
  if (!found.length) console.log(`${n}: YOXDUR`);
  for (const p of found) {
    console.log(
      `${p.name} | aktiv: ${p.is_active} | klub: ${clubName.get(p.current_club_id) ?? "-"} | mənbə: ${p.source ?? "api/tm"}`,
    );
    console.log(
      `   tarixçə: ${(p.club_history ?? []).map((id) => clubName.get(id) ?? id).join(" → ") || "BOŞ"}`,
    );
  }
}

const legendsPath = "src/data/legends.json";
if (fs.existsSync(legendsPath)) {
  const legends = JSON.parse(fs.readFileSync(legendsPath, "utf8"));
  const inLegends = legends
    .filter((l) => hit(l.name))
    .map((l) => `${l.name} (${(l.clubs ?? []).join(", ")})`);
  console.log(
    `\n=== legends.json ===\n${inLegends.join("\n") || "heç biri yoxdur"}`,
  );
}

const tmDir = "data-raw/transfermarkt";
const ids = new Map();
await eachRow(`${tmDir}/players.csv.gz`, (r) => {
  if (hit(r.name)) ids.set(r.player_id, r);
});
console.log("\n=== Transfermarkt players.csv ===");
for (const [id, r] of ids)
  console.log(
    `${r.name} | id ${id} | son mövsüm: ${r.last_season} | hazırkı klub: ${r.current_club_name} | ən yüksək dəyər: ${r.highest_market_value_in_eur} | milli oyun: ${r.international_caps}`,
  );

const transfers = new Map();
await eachRow(`${tmDir}/transfers.csv.gz`, (r) => {
  if (!ids.has(r.player_id)) return;
  if (!transfers.has(r.player_id)) transfers.set(r.player_id, []);
  transfers.get(r.player_id).push(r);
});
let oldest = "9999";
await eachRow(`${tmDir}/transfers.csv.gz`, (r) => {
  if (r.transfer_date && r.transfer_date < oldest) oldest = r.transfer_date;
});
console.log(
  `\n=== Transfermarkt transfers.csv (ən köhnə transfer: ${oldest.slice(0, 10)}) ===`,
);
for (const [id, r] of ids) {
  const list = (transfers.get(id) ?? []).sort((a, b) =>
    a.transfer_date.localeCompare(b.transfer_date),
  );
  console.log(`${r.name}: ${list.length} transfer`);
  for (const t of list)
    console.log(
      `   ${t.transfer_date.slice(0, 10)}  ${t.from_club_name} → ${t.to_club_name}`,
    );
}
