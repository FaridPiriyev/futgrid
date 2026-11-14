import { isCommon, randomPair, type Entity } from "../categories.js";
import type { Answer, GameData, Puzzle, ScoreBreakdown } from "../types.js";
import type { Random } from "../random.js";

export interface OrtaPair {
  key: string;
  a: Entity;
  b: Entity;
  answers: number;
}

export function buildOrtaPuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const rounds = Math.max(1, Math.min(20, Number(settings.rounds ?? 10)));
  const difficulty = String(settings.difficulty ?? "normal");
  const avoid = new Set<string>();
  const pairs: OrtaPair[] = [];
  for (let index = 0; index < rounds; index++) {
    const pair = randomPair(data, { difficulty, random, avoid });
    if (!pair) break;
    avoid.add(pair.key);
    pairs.push(pair);
  }
  if (!pairs.length) throw new Error("ORTA_PAIR_UNAVAILABLE");
  return {
    game: "orta",
    seed,
    settings: settings as Puzzle["settings"],
    pairs,
    rounds: pairs.length,
  };
}

export function verifyOrtaAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const pairs = puzzle.pairs as OrtaPair[];
  const pair = pairs[Number(answer.round ?? 0)];
  if (!pair) return false;
  const player = (puzzle as unknown as { player?: unknown }).player;
  if (player) return isCommon(pair.a, pair.b, player as never);
  const playerId = Number(answer.playerId);
  return (
    pair.a.ids.has(playerId) &&
    pair.b.ids.has(playerId)
  );
}

export function scoreOrta(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const rounds = Number(puzzle.rounds ?? 0);
  let correct = 0;
  let wrong = 0;
  for (const answer of answers) {
    if (answer.playerId === undefined) continue;
    if (verifyOrtaAnswer(puzzle, answer)) correct++;
    else wrong++;
  }
  const ratio = Math.max(0, (correct - wrong) / 10);
  return {
    game: "orta",
    correct,
    wrong,
    total: rounds,
    ratio,
    score: Math.round(Math.min(1, ratio) * 1000) / 1000,
  };
}
