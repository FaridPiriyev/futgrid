import { readFile, writeFile, unlink, access } from "node:fs/promises";
import { createHash } from "node:crypto";

const TARGETS = ["public/data/players.json", "../packages/game-core/data/players.json"];
const DRY = process.argv.includes("--dry");
const exists = (p) => access(p).then(() => true, () => false);

const players = JSON.parse(await readFile(TARGETS[0], "utf8"));
const groups = new Map();
let i = 0;
for (const p of players) {
  if (!p.photo_url?.startsWith("/images/players/")) continue;
  const file = "public" + p.photo_url;
  if (!(await exists(file))) continue;
  const hash = createHash("md5").update(await readFile(file)).digest("hex");
  if (!groups.has(hash)) groups.set(hash, []);
  groups.get(hash).push({ p, file });
  if (++i % 1000 === 0) process.stdout.write(`\r   ${i} şəkil yoxlandı`);
}
const dupes = [...groups.values()].filter((g) => g.length >= 2).sort((a, b) => b.length - a.length);
const total = dupes.reduce((n, g) => n + g.length, 0);
console.log(`\n${dupes.length} təkrarlanan şəkil, cəmi ${total} oyunçuda:`);
for (const g of dupes.slice(0, 15))
  console.log(`  ${String(g.length).padStart(5)} oyunçu · məs. ${g.slice(0, 3).map((x) => x.p.name).join(", ")}`);

if (DRY) {
  console.log("\n--dry: heç nə silinmədi.");
} else {
  for (const g of dupes)
    for (const { p, file } of g) {
      delete p.photo_url;
      await unlink(file).catch(() => {});
    }
  const out = JSON.stringify(players, null, 2) + "\n";
  for (const t of TARGETS) if (await exists(t)) await writeFile(t, out, "utf8");
  console.log(`\n${total} oyunçudan təkrarlanan şəkil silindi. İndi ${players.filter((p) => p.photo_url).length} oyunçunun şəkli var.`);
}
