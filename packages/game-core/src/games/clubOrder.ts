import { careerPool, pathIds, pickRounds } from "./career.js";
import type { Answer, GameData, Puzzle, RawPlayer, ScoreBreakdown } from "../types.js";
import type { Random } from "../random.js";

export const CLUB_ORDER_ROUNDS = 10;
export const CLUB_ORDER_MAX_STEPS = 9;

export function orderPool(data: GameData, difficulty: string): RawPlayer[] {
  const key = `_order_${difficulty}`;
  if (data[key]) return data[key] as RawPlayer[];
  const pool = careerPool(data, difficulty).filter(
    (player) => pathIds(data, player).length <= CLUB_ORDER_MAX_STEPS,
  );
  data[key] = pool;
  return pool;
}

export function pickOrderPlayers(pool: RawPlayer[], random: Random): RawPlayer[] {
  return pickRounds(pool, random, CLUB_ORDER_ROUNDS);
}

export function buildClubOrderPuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const difficulty = String(settings.difficulty ?? "normal");
  const pool = orderPool(data, difficulty);
  const targets = pickOrderPlayers(pool, random);
  if (!targets.length) throw new Error("CLUB_ORDER_POOL_UNAVAILABLE");
  return {
    game: "clubOrder",
    seed,
    settings: settings as Puzzle["settings"],
    rounds: targets.length,
    targets: targets.map((player) => ({
      playerId: player.id,
      path: pathIds(data, player),
    })),
  };
}

export function verifyClubOrderAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const targets = puzzle.targets as { playerId: number; path: number[] }[];
  const target = targets[Number(answer.round ?? 0)];
  if (!target) return false;
  const clubIds = answer.clubIds;
  if (!Array.isArray(clubIds) || clubIds.length !== target.path.length) return false;
  return clubIds.every((id, index) => Number(id) === target.path[index]);
}

export function scoreClubOrder(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const targets = puzzle.targets as { playerId: number; path: number[] }[];
  let correctBoxes = 0;
  let totalBoxes = 0;
  let correct = 0;
  for (const target of targets) totalBoxes += target.path.length;
  for (const answer of answers) {
    const target = targets[Number(answer.round ?? 0)];
    if (!target) continue;
    const submitted = Array.isArray(answer.clubIds) ? answer.clubIds : [];
    for (let index = 0; index < target.path.length; index++) {
      if (Number(submitted[index]) === target.path[index]) correctBoxes++;
    }
    if (verifyClubOrderAnswer(puzzle, answer)) correct++;
  }
  const ratio = totalBoxes ? correctBoxes / totalBoxes : 0;
  return {
    game: "clubOrder",
    correct,
    wrong: answers.length - correct,
    total: targets.length,
    ratio,
    score: Math.round(ratio * 1000) / 1000,
    details: { correctBoxes, totalBoxes },
  };
}
