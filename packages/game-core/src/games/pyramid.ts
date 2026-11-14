import { buildCategoryPool, entityIndex, type Category } from "../categories.js";
import { playerFame } from "../fame.js";
import type { Answer, GameData, Puzzle, RawPlayer, ScoreBreakdown } from "../types.js";
import type { Random } from "../random.js";

export const PYRAMID_STEPS = [5, 4, 3, 2, 1] as const;
export const PYRAMID_PENALTY = 3;

interface Rule {
  maxTier: number;
  clubTier: number;
  margin: number;
  pairs: number;
}

const RULES: Record<string, Rule> = {
  easy: { maxTier: 1, clubTier: 1, margin: 3, pairs: 0.15 },
  normal: { maxTier: 2, clubTier: 1, margin: 2.5, pairs: 0.25 },
  hard: { maxTier: 3, clubTier: 3, margin: 1.4, pairs: 0.4 },
};

const count = (a: Set<number>, b: Set<number>): number => {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let total = 0;
  for (const id of small) if (large.has(id)) total++;
  return total;
};

interface LevelCandidate {
  a: Category;
  b: Category;
  key: string;
  total: number;
}

function tryLevel(
  pool: ReturnType<typeof buildCategoryPool>,
  need: number,
  rule: Rule,
  tier: number,
  usedClubs: Set<string>,
  usedKeys: Set<string>,
  random: Random,
  usedCountries: Set<string>,
): LevelCandidate | null {
  const clubs = pool.club.filter((category) => category.tier <= tier && !usedClubs.has(category.key));
  const core = clubs.filter((category) => category.tier <= Math.max(rule.clubTier, tier - 1));
  const firsts = core.length >= 4 ? core : clubs;
  const countries = pool.country.filter((category) => category.tier <= tier);
  const min = Math.max(need, Math.ceil(need * rule.margin));
  for (let attempt = 0; attempt < 400; attempt++) {
    const a = firsts[Math.floor(random() * firsts.length)];
    if (!a) return null;
    const pair = need <= 3 && random() < rule.pairs;
    const list = pair ? clubs : countries;
    const b = list[Math.floor(random() * list.length)];
    if (!b || b.key === a.key) continue;
    if (b.type === "country" && usedCountries.has(b.key) && attempt < 300) continue;
    const key = [a.key, b.key].sort().join("|");
    if (usedKeys.has(key)) continue;
    const total = count(a.ids, b.ids);
    if (total < min) continue;
    return { a, b, key, total };
  }
  return null;
}

export interface PyramidLevel {
  need: number;
  a: Category;
  b: Category;
  total: number;
}

export function buildPyramid(
  data: GameData,
  difficulty: string,
  random: Random,
): PyramidLevel[] | null {
  const pool = buildCategoryPool(data);
  const byKey = entityIndex(data).byKey;
  const rule = RULES[difficulty] ?? RULES.normal;
  const usedClubs = new Set<string>();
  const usedKeys = new Set<string>();
  const usedCountries = new Set<string>();
  const levels: PyramidLevel[] = [];
  for (const need of PYRAMID_STEPS) {
    let found: LevelCandidate | null = null;
    for (let tier = rule.maxTier; tier <= 3 && !found; tier++) {
      found = tryLevel(pool, need, rule, tier, usedClubs, usedKeys, random, usedCountries);
    }
    if (!found) {
      found = tryLevel(pool, need, { ...rule, margin: 1 }, 3, new Set(), usedKeys, random, new Set());
    }
    if (!found) return null;
    usedClubs.add(found.a.key);
    if (found.b.type === "club") usedClubs.add(found.b.key);
    else usedCountries.add(found.b.key);
    usedKeys.add(found.key);
    const entityA = byKey.get(found.a.key);
    const entityB = byKey.get(found.b.key);
    if (!entityA || !entityB) return null;
    levels.push({
      need,
      a: { ...found.a, ids: entityA.ids },
      b: { ...found.b, ids: entityB.ids },
      total: found.total,
    });
  }
  return levels;
}

export function fits(level: PyramidLevel, playerId: number): boolean {
  return level.a.ids.has(playerId) && level.b.ids.has(playerId);
}

export function buildPyramidPuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const difficulty = String(settings.difficulty ?? "normal");
  const levels = buildPyramid(data, difficulty, random);
  if (!levels) throw new Error("PYRAMID_UNAVAILABLE");
  return {
    game: "pyramid",
    seed,
    settings: settings as Puzzle["settings"],
    difficulty,
    levels: levels.map((level) => ({
      need: level.need,
      a: level.a.key,
      b: level.b.key,
      aIds: [...level.a.ids],
      bIds: [...level.b.ids],
      total: level.total,
    })),
  };
}

function levelFor(puzzle: Puzzle, round: number): { aIds: Set<number>; bIds: Set<number>; need: number } | null {
  const levels = puzzle.levels as { need: number; aIds: number[]; bIds: number[] }[];
  const level = levels[round];
  if (!level) return null;
  return { aIds: new Set(level.aIds), bIds: new Set(level.bIds), need: level.need };
}

export function verifyPyramidAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const level = levelFor(puzzle, Number(answer.round ?? 0));
  const playerId = Number(answer.playerId);
  if (!level || !Number.isInteger(playerId)) return false;
  return level.aIds.has(playerId) && level.bIds.has(playerId);
}

export function scorePyramid(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const levels = puzzle.levels as { need: number }[];
  const found = new Set<number>();
  for (const answer of answers) {
    const index = Number(answer.round ?? -1);
    if (!found.has(index) && verifyPyramidAnswer(puzzle, answer)) found.add(index);
  }
  const cap = levels.reduce((sum, level) => sum + level.need, 0);
  const ratio = Math.min(found.size / 15, 1);
  return {
    game: "pyramid",
    correct: found.size,
    wrong: Math.max(0, answers.length - found.size),
    total: cap,
    ratio,
    score: Math.round(ratio * 1000) / 1000,
  };
}

export function examplesForLevel(
  data: GameData,
  level: PyramidLevel,
  exclude: number[] = [],
  limit = 6,
): RawPlayer[] {
  const skip = new Set(exclude);
  const [small, large] =
    level.a.ids.size < level.b.ids.size ? [level.a.ids, level.b.ids] : [level.b.ids, level.a.ids];
  const out: RawPlayer[] = [];
  for (const id of small) {
    if (!large.has(id) || skip.has(id)) continue;
    const player = data.playersById.get(id);
    if (player) out.push(player);
  }
  return out.sort((a, b) => playerFame(b) - playerFame(a)).slice(0, limit);
}
