import { norm } from "../data.js";
import { playerFame } from "../fame.js";
import type { Answer, GameData, Puzzle, RawPlayer, ScoreBreakdown, TwoLettersIndex } from "../types.js";
import type { Random } from "../random.js";

export const TWO_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const TWO_LETTERS_PENALTY = 3;

const RULES = {
  easy: { pool: 600, min: 20 },
  normal: { pool: 2000, min: 8 },
  hard: { pool: Number.POSITIVE_INFINITY, min: 3 },
} as const;

const letterKey = (letter: string): string => letter.toLowerCase();

function prepared(data: GameData): TwoLettersIndex {
  if (data._twoLetters) return data._twoLetters;
  const ranked = [...data.players].sort((a, b) => playerFame(b) - playerFame(a));
  const rank = new Map(ranked.map((player, index) => [player.id, index]));
  const sets = new Map<number, Set<string>>();
  for (const player of data.players) {
    sets.set(player.id, new Set(norm(player.name).replace(/ /g, "")));
  }
  data._twoLetters = { ranked, rank, sets };
  return data._twoLetters;
}

export function hasLetters(
  data: GameData,
  player: RawPlayer,
  a: string,
  b: string,
): boolean {
  const set = prepared(data).sets.get(player.id) ?? new Set(norm(player.name).replace(/ /g, ""));
  return set.has(letterKey(a)) && set.has(letterKey(b));
}

export function countFor(
  data: GameData,
  a: string,
  b: string,
  difficulty: string,
): number {
  const { ranked } = prepared(data);
  const rule = RULES[difficulty as keyof typeof RULES] ?? RULES.normal;
  const limit = Math.min(rule.pool, ranked.length);
  let count = 0;
  for (let index = 0; index < limit; index++) {
    const player = ranked[index];
    if (player && hasLetters(data, player, a, b)) count++;
  }
  return count;
}

export function buildTwoLettersPuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const difficulty = String(settings.difficulty ?? "normal");
  const rounds = Math.max(1, Math.min(10, Number(settings.rounds ?? 5)));
  const rule = RULES[difficulty as keyof typeof RULES] ?? RULES.normal;
  const pairs: { a: string; b: string; count: number }[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (pairs.length < rounds && guard++ < 500) {
    const a = TWO_LETTERS[Math.floor(random() * TWO_LETTERS.length)];
    const b = TWO_LETTERS[Math.floor(random() * TWO_LETTERS.length)];
    if (!a || !b || a === b) continue;
    const key = [a, b].sort().join("");
    if (used.has(key)) continue;
    const count = countFor(data, a, b, difficulty);
    if (count < rule.min) continue;
    used.add(key);
    pairs.push({ a, b, count });
  }
  if (!pairs.length) throw new Error("TWO_LETTERS_UNAVAILABLE");
  return {
    game: "twoLetters",
    seed,
    settings: settings as Puzzle["settings"],
    difficulty,
    rounds: pairs.length,
    pairs,
  };
}

export function verifyTwoLettersAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const pairs = puzzle.pairs as { a: string; b: string }[];
  const pair = pairs[Number(answer.round ?? 0)];
  const name = String(answer.playerName ?? answer.name ?? answer.guess ?? "");
  if (!pair || name.length < 2) return false;
  const letters = new Set(norm(name).replace(/ /g, ""));
  return letters.has(letterKey(pair.a)) && letters.has(letterKey(pair.b));
}

export function scoreTwoLetters(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const rounds = Number(puzzle.rounds ?? 0);
  const found = new Set<string>();
  for (const answer of answers) {
    const key = `${answer.round ?? -1}:${norm(answer.playerName ?? answer.name ?? answer.guess ?? "")}`;
    if (!found.has(key) && verifyTwoLettersAnswer(puzzle, answer)) found.add(key);
  }
  const ratio = Math.min(found.size / (rounds * 5), 1);
  return {
    game: "twoLetters",
    correct: found.size,
    wrong: Math.max(0, answers.length - found.size),
    total: rounds * 5,
    ratio,
    score: Math.round(ratio * 1000) / 1000,
  };
}
