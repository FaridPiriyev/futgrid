import { byFame } from "../fame.js";
import type { Answer, GameData, Puzzle, RawPlayer, ScoreBreakdown } from "../types.js";
import type { Random } from "../random.js";

export const HL_POOL_SIZE = { easy: 200, normal: 450, hard: 5000 } as const;
export const HL_ROUNDS = 20;

const valueOf = (player: RawPlayer): number | undefined =>
  player.is_active !== false ? player.market_value?.amount_eur : undefined;

export function buildPool(data: GameData, difficulty: string): RawPlayer[] {
  const size = HL_POOL_SIZE[difficulty as keyof typeof HL_POOL_SIZE] ?? HL_POOL_SIZE.normal;
  return data.players
    .filter((player) => (valueOf(player) ?? 0) > 0)
    .sort(byFame)
    .slice(0, size);
}

const band = (streak: number): number => {
  if (streak < 4) return 4;
  if (streak < 10) return 2.5;
  if (streak < 18) return 1.8;
  return 1.4;
};

export function pickChallenger(
  pool: RawPlayer[],
  a: RawPlayer,
  streak: number,
  recent: Set<number>,
  random: Random,
): RawPlayer | null {
  const va = valueOf(a) ?? 0;
  const k = band(streak);
  let fallback: RawPlayer | null = null;
  for (let attempt = 0; attempt < 120; attempt++) {
    const b = pool[Math.floor(random() * pool.length)];
    if (!b || b.id === a.id || recent.has(b.id)) continue;
    const vb = valueOf(b) ?? 0;
    fallback ??= b;
    if (vb === va && attempt < 100) continue;
    const ratio = Math.max(va, vb) / Math.max(1, Math.min(va, vb));
    if (ratio <= k) return b;
  }
  return fallback ?? pool.find((player) => player.id !== a.id) ?? null;
}

export interface HLRound {
  aId: number;
  bId: number;
  aValue: number;
  bValue: number;
}

export function buildHigherLowerPuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const difficulty = String(settings.difficulty ?? "normal");
  const rounds = Math.max(1, Math.min(50, Number(settings.rounds ?? HL_ROUNDS)));
  const pool = buildPool(data, difficulty);
  if (pool.length < 2) throw new Error("HIGHER_LOWER_POOL_UNAVAILABLE");
  const first = pool[Math.floor(random() * Math.min(pool.length, 400))];
  if (!first) throw new Error("HIGHER_LOWER_POOL_UNAVAILABLE");
  const sequence: HLRound[] = [];
  const recent = new Set<number>();
  let current = first;
  let streak = 0;
  for (let index = 0; index < rounds; index++) {
    const challenger = pickChallenger(pool, current, streak, recent, random);
    if (!challenger) break;
    const aValue = valueOf(current) ?? 0;
    const bValue = valueOf(challenger) ?? 0;
    sequence.push({
      aId: current.id,
      bId: challenger.id,
      aValue,
      bValue,
    });
    recent.add(current.id);
    recent.add(challenger.id);
    current = challenger;
    streak++;
  }
  if (!sequence.length) throw new Error("HIGHER_LOWER_POOL_UNAVAILABLE");
  return {
    game: "higherLower",
    seed,
    settings: settings as Puzzle["settings"],
    difficulty,
    rounds: sequence.length,
    sequence,
  };
}

export function verifyHigherLowerAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const sequence = puzzle.sequence as HLRound[];
  const round = sequence[Number(answer.round ?? 0)];
  if (!round) return false;
  if (answer.direction !== "up" && answer.direction !== "down") return false;
  if (round.aValue === round.bValue) return true;
  return answer.direction === "up" ? round.bValue > round.aValue : round.bValue < round.aValue;
}

export function scoreHigherLower(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const sequence = puzzle.sequence as HLRound[];
  let streak = 0;
  let correct = 0;
  let wrong = 0;
  for (const answer of answers) {
    if (!verifyHigherLowerAnswer(puzzle, answer)) {
      wrong++;
      break;
    }
    correct++;
    streak++;
  }
  const ratio = Math.min(streak / 20, 1);
  return {
    game: "higherLower",
    correct,
    wrong,
    total: sequence.length,
    ratio,
    score: Math.round(ratio * 1000) / 1000,
    details: { streak },
  };
}
