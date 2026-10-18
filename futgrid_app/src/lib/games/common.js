import { norm } from "../data";
import { shuffle } from "../random";
import { buildCategoryPool, countryFlag, countryName } from "./x0xCategories";

export const DIFFICULTY = {
  easy: { maxTier: 1, minAnswers: 5 },
  normal: { maxTier: 2, minAnswers: 3 },
  hard: { maxTier: 3, minAnswers: 1 },
};

const intersect = (a, b) => {
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  const out = [];
  for (const id of s) if (l.has(id)) out.push(id);
  return out;
};

export function entityIndex(data) {
  if (data._entities) return data._entities;
  const clubs = data.clubs
    .filter((c) => data.playersByClub.get(c.id)?.size)
    .map((c) => ({
      key: `club:${c.id}`,
      type: "club",
      club: c,
      label: c.name,
      image: c.logo_url ?? null,
      short: c.short_name,
      ids: data.playersByClub.get(c.id),
    }));

  const byCountry = new Map();
  for (const p of data.players) {
    if (!p.nationality_code) continue;
    if (!byCountry.has(p.nationality_code)) byCountry.set(p.nationality_code, new Set());
    byCountry.get(p.nationality_code).add(p.id);
  }
  const countries = [...byCountry].map(([code, ids]) => {
    const info = data.countriesByCode.get(code);
    return {
      key: `country:${code}`,
      type: "country",
      code,
      label: countryName(code, data),
      flag: countryFlag(code, data),
      images: [info?.flag_url, `https://flagcdn.com/${code.toLowerCase()}.svg`].filter(Boolean),
      ids,
    };
  });

  for (const e of [...clubs, ...countries]) e._name = norm(e.label);
  const all = [...clubs, ...countries];
  data._entities = { clubs, countries, all, byKey: new Map(all.map((e) => [e.key, e])) };
  return data._entities;
}

export function searchEntities(data, query, { types = ["club", "country"], limit = 8 } = {}) {
  const q = norm(query);
  if (q.length < 2) return [];
  const words = q.split(" ");
  const hits = [];
  for (const e of entityIndex(data).all) {
    if (!types.includes(e.type)) continue;
    if (!words.every((w) => e._name.split(" ").some((t) => t.startsWith(w)) || e._name.includes(w))) continue;
    const rank = e._name === q ? 0 : e._name.startsWith(q) ? 1 : 2;
    hits.push({ e, rank, size: e.ids.size });
  }
  hits.sort((a, b) => a.rank - b.rank || b.size - a.size);
  return hits.slice(0, limit).map((h) => h.e);
}

export function commonPlayers(data, a, b) {
  if (!a || !b) return [];
  return intersect(a.ids, b.ids)
    .map((id) => data.playersById.get(id))
    .filter(Boolean)
    .sort((x, y) => (y.market_value?.amount_eur ?? y.market_value?.highest_eur ?? 0) - (x.market_value?.amount_eur ?? x.market_value?.highest_eur ?? 0));
}

export const isCommon = (a, b, player) => a.ids.has(player.id) && b.ids.has(player.id);

export function pairProblem(a, b) {
  if (!a || !b) return null;
  if (a.key === b.key) return "Hər iki oyunçu eyni şeyi seçib.";
  if (a.type === "country" && b.type === "country") return "İki ölkə ola bilməz: ən azı biri klub olmalıdır.";
  return null;
}

export function randomPair(data, { difficulty = "normal", random = Math.random, avoid = new Set(), tries = 400 } = {}) {
  const pool = buildCategoryPool(data);
  const { maxTier, minAnswers } = DIFFICULTY[difficulty] ?? DIFFICULTY.normal;
  for (let tier = maxTier; tier <= 3; tier++) {
    const clubs = pool.club.filter((c) => c.tier <= tier);
    const countries = pool.country.filter((c) => c.tier <= tier);
    if (clubs.length < 2) continue;
    for (let t = 0; t < tries; t++) {
      const a = clubs[Math.floor(random() * clubs.length)];
      const second = random() < 0.4 && countries.length ? countries : clubs;
      const b = second[Math.floor(random() * second.length)];
      if (pairProblem(a, b)) continue;
      const key = [a.key, b.key].sort().join("|");
      if (avoid.has(key)) continue;
      const n = intersect(a.ids, b.ids).length;
      if (n < minAnswers) continue;
      const [first, other] = b.type === "country" ? [a, b] : shuffle([a, b], random);
      const byKey = entityIndex(data).byKey;
      return { a: byKey.get(first.key), b: byKey.get(other.key), key, answers: n };
    }
  }
  return null;
}

