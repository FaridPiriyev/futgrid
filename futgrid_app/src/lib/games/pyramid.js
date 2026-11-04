import { entityIndex } from "./common";
import { playerFame } from "./fame";
import { buildCategoryPool } from "./x0xCategories";

export const STEPS = [5, 4, 3, 2, 1];
export const PENALTY = 3;

const RULES = {
  easy: { maxTier: 1, margin: 3, pairs: 0.15 },
  normal: { maxTier: 2, margin: 2, pairs: 0.3 },
  hard: { maxTier: 3, margin: 1.4, pairs: 0.4 },
};

const count = (a, b) => {
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  let n = 0;
  for (const id of s) if (l.has(id)) n++;
  return n;
};

function tryLevel(pool, need, rule, tier, usedClubs, usedKeys, random, usedCountries = new Set()) {
  const clubs = pool.club.filter((c) => c.tier <= tier && !usedClubs.has(c.key));
  const countries = pool.country.filter((c) => c.tier <= tier);
  const min = Math.max(need, Math.ceil(need * rule.margin));
  for (let t = 0; t < 400; t++) {
    const a = clubs[Math.floor(random() * clubs.length)];
    if (!a) return null;
    const pair = need <= 3 && random() < rule.pairs;
    const list = pair ? clubs : countries;
    const b = list[Math.floor(random() * list.length)];
    if (!b || b.key === a.key) continue;
    if (b.type === "country" && usedCountries.has(b.key) && t < 300) continue;
    const key = [a.key, b.key].sort().join("|");
    if (usedKeys.has(key)) continue;
    const n = count(a.ids, b.ids);
    if (n < min) continue;
    return { a, b, key, total: n };
  }
  return null;
}

export function buildPyramid(data, difficulty = "normal", random = Math.random) {
  const pool = buildCategoryPool(data);
  const byKey = entityIndex(data).byKey;
  const rule = RULES[difficulty] ?? RULES.normal;
  const usedClubs = new Set();
  const usedKeys = new Set();
  const usedCountries = new Set();
  const levels = [];
  for (const need of STEPS) {
    let found = null;
    for (let tier = rule.maxTier; tier <= 3 && !found; tier++)
      found = tryLevel(pool, need, rule, tier, usedClubs, usedKeys, random, usedCountries);
    if (!found)
      found = tryLevel(pool, need, { ...rule, margin: 1 }, 3, new Set(), usedKeys, random);
    if (!found) return null;
    usedClubs.add(found.a.key);
    if (found.b.type === "club") usedClubs.add(found.b.key);
    else usedCountries.add(found.b.key);
    usedKeys.add(found.key);
    levels.push({
      need,
      a: byKey.get(found.a.key) ?? found.a,
      b: byKey.get(found.b.key) ?? found.b,
      ids: [found.a.ids, found.b.ids],
      total: found.total,
    });
  }
  return levels;
}

export const fits = (level, player) =>
  level.ids[0].has(player.id) && level.ids[1].has(player.id);

export function examples(data, level, exclude = [], limit = 6) {
  const skip = new Set(exclude.map((p) => p.id));
  const [s, l] = level.ids[0].size < level.ids[1].size ? level.ids : [level.ids[1], level.ids[0]];
  const out = [];
  for (const id of s) {
    if (!l.has(id) || skip.has(id)) continue;
    const p = data.playersById.get(id);
    if (p) out.push(p);
  }
  return out.sort((x, y) => playerFame(y) - playerFame(x)).slice(0, limit);
}
