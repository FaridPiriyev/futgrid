import fs from "node:fs";

const clubs = JSON.parse(fs.readFileSync("public/data/clubs.json", "utf8"));
console.log("KLUBLAR:");
for (const c of clubs) {
  if (/aris|austria|truiden/i.test(c.slug)) console.log(" ", c.slug, "|", c.name, "|", c.league);
}

console.log("API:");
const searches = ["aris_thessaloniki", "thessaloniki", "austria_wien", "austria", "sint_truidense_vv", "truidense"];
for (const f of searches) {
  const p = `data-raw/api-football/cache/teams_search=${f}.json`;
  if (fs.existsSync(p) === false) {
    console.log(" ", f, "-> fayl yoxdur");
    continue;
  }
  const r = JSON.parse(fs.readFileSync(p, "utf8")).response || [];
  const names = r.map((t) => `${t.team.id}:${t.team.name} (${t.team.country})`).join(", ");
  console.log(" ", f, "->", names || "boş");
}