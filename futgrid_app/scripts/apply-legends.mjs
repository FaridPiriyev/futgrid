// src/data/legends.json-dakı əfsanələri birbaşa public/data/players.json-a yazır.
// data-raw (Transfermarkt) lazım deyil — tam build-players işlətmədən yeni
// əfsanə əlavə etmək üçündür. Təkrar işlətmək təhlükəsizdir.
//
//   cd futgrid_app && node scripts/apply-legends.mjs
import fs from "node:fs";

const read = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const norm = (s) =>
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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const playersPath = "public/data/players.json";
const idsPath = "src/data/player-ids.json";
const players = read(playersPath);
const ids = read(idsPath);
const legends = read("src/data/legends.json");
const clubBySlug = new Map(
  read("public/data/clubs.json").map((c) => [c.slug, c.id]),
);
const photoDir = "public/images/players";

const bySlug = new Map(players.map((p) => [p.slug, p]));
const byNameYear = new Map(
  players
    .filter((p) => p.source !== "manual")
    .map((p) => [`${norm(p.name)}|${p.birth_date?.slice(0, 4) ?? ""}`, p]),
);
let nextId =
  Math.max(0, ...Object.values(ids), ...players.map((p) => p.id)) + 1;

const hist = (L) => {
  const h = [];
  for (const cs of L.clubs ?? []) {
    const cid = clubBySlug.get(cs);
    if (cid && h.at(-1) !== cid) h.push(cid);
  }
  return h;
};

let added = 0,
  updated = 0,
  merged = 0;
for (const L of legends) {
  const found = byNameYear.get(
    `${norm(L.name)}|${L.birth_date?.slice(0, 4) ?? ""}`,
  );
  if (found) {
    // Transfermarkt-dan gələn oyunçu: kubokları və klubları birləşdir
    const tro = new Map((found.trophies ?? []).map((t) => [t.id, t.count]));
    for (const t of L.trophies ?? [])
      tro.set(t.id, Math.max(tro.get(t.id) ?? 0, t.count));
    if (tro.size)
      found.trophies = [...tro].map(([id, count]) => ({ id, count }));
    // Karyera Transfermarkt-dan daha dəqiqdir (club_stints da var) — yalnız boşdursa doldur
    if (!found.club_history?.length) found.club_history = hist(L);
    if (!found.is_active && L.retired_year) found.retired_year = L.retired_year;
    merged++;
    continue;
  }
  let slug = L.slug;
  if (bySlug.get(slug) && bySlug.get(slug).source !== "manual")
    slug = `${slug}-${L.birth_date?.slice(0, 4) ?? "legend"}`;
  const keyId = `legend:${slug}`;
  let o = bySlug.get(slug);
  if (o && o.source !== "manual") {
    console.warn(`! "${L.name}": slug "${slug}" başqa oyunçudadır, ötürüldü`);
    continue;
  }
  const isNew = !o;
  if (isNew) {
    if (!ids[keyId]) ids[keyId] = nextId++;
    o = { id: ids[keyId], name: L.name, slug };
    players.push(o);
    bySlug.set(slug, o);
  }
  o.name = L.name;
  for (const ext of ["jpg", "webp", "png"])
    if (fs.existsSync(`${photoDir}/${slug}.${ext}`))
      o.photo_url = `/images/players/${slug}.${ext}`;
  if (L.photo_url) o.photo_url = L.photo_url;
  for (const f of ["nationality_code", "position"]) if (L[f]) o[f] = L[f];
  if (L.aka?.length) o.aka = L.aka;
  else delete o.aka;
  o.is_active = false;
  for (const f of ["birth_date", "height_cm", "preferred_foot", "retired_year"])
    if (L[f]) o[f] = L[f];
  o.club_history = hist(L);
  if (L.trophies?.length)
    o.trophies = L.trophies.map((t) => ({ id: t.id, count: t.count }));
  o.source = "manual";
  isNew ? added++ : updated++;
}

fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
fs.writeFileSync(idsPath, JSON.stringify(ids, null, 2));
console.log(
  `Əfsanələr: ${added} yeni, ${updated} yeniləndi, ${merged} mövcud oyunçu ilə birləşdi. Cəmi oyunçu: ${players.length}`,
);
