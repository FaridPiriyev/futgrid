import fs from "node:fs";
import path from "node:path";

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
const q = norm(process.argv.slice(2).join(" "));
if (!q) {
  console.log("İstifadə: node scripts/find-team.mjs libertad");
  process.exit(1);
}
const dir = "data-raw/api-football/cache";
const found = new Map();
for (const f of fs.readdirSync(dir)) {
  if (!f.startsWith("teams_")) continue;
  let body;
  try {
    body = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  } catch {
    continue;
  }
  for (const t of body.response ?? []) {
    if (!norm(t.team?.name).includes(q)) continue;
    found.set(
      t.team.id,
      `${t.team.id} | ${t.team.name} | ${t.team.country ?? "-"} | ${t.venue?.city ?? "-"}`,
    );
  }
}
console.log(
  found.size
    ? `ID | ad | ölkə | şəhər\n${[...found.values()].join("\n")}`
    : "Keşdə tapılmadı",
);
