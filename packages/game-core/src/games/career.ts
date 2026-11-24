import { clubFameTier } from "../fame.js";
import type { Answer, GameData, Puzzle, RawPlayer, ScoreBreakdown } from "../types.js";
import type { Random } from "../random.js";

export const CAREER_ROUNDS = 10;
export const CAREER_MAX_WRONG = 3;
export const CAREER_TIERS = {
  easy: { minPeak: 40e6, from: 0, to: 100 },
  normal: { minPeak: 15e6, from: 50, to: 450 },
  hard: { minPeak: 4e6, from: 320, to: 1800 },
} as const;
export const CAREER_POOL = {
  easy: CAREER_TIERS.easy.to - CAREER_TIERS.easy.from,
  normal: CAREER_TIERS.normal.to - CAREER_TIERS.normal.from,
  hard: CAREER_TIERS.hard.to - CAREER_TIERS.hard.from,
} as const;

const RECOGNITION_TROPHY: Record<string, number> = { ballon_dor: 2, world_cup: 1, ucl: 0.4, euro: 0.4, copa_america: 0.4 };
const peak = (player: RawPlayer): number =>
  Math.max(player.market_value?.amount_eur ?? 0, player.market_value?.highest_eur ?? 0);

const popularity = (player: RawPlayer): number =>
  Math.max(player.market_value?.amount_eur ?? 0, player.market_value?.highest_eur ?? 0);

export function pathIds(data: GameData, player: RawPlayer): number[] {
  const out: number[] = [];
  for (const id of player.club_history ?? []) {
    if (!data.clubsById.has(id)) continue;
    if (out[out.length - 1] !== id) out.push(id);
  }
  return out;
}

export const pathKey = (data: GameData, player: RawPlayer): string =>
  pathIds(data, player).join(">");

function recognition(data: GameData, player: RawPlayer): number {
  let trophies = 0;
  for (const t of player.trophies ?? [])
    trophies += (RECOGNITION_TROPHY[t.id] ?? 0) * Math.min(t.count ?? 1, 3);
  const caps = Math.min(player.international?.caps ?? 0, 150);
  const big = pathIds(data, player).filter((id) => clubFameTier(data.clubsById.get(id)) === 1).length;
  return (
    Math.log10(Math.max(peak(player), 1e5) / 1e6) * 2.4 +
    caps / 70 +
    Math.min(trophies, 3) +
    Math.min(big, 3) * 0.25
  );
}

export function careerPool(data: GameData, difficulty: string): RawPlayer[] {
  const key = `_career_${difficulty}`;
  if (data[key]) return data[key] as RawPlayer[];
  const scored = (data._careerScored as { player: RawPlayer; score: number }[] | undefined) ??
    data.players
      .filter((player) => popularity(player) > 0 && pathIds(data, player).length >= 3)
      .map((player) => ({ player, score: recognition(data, player) }))
      .sort((a, b) => b.score - a.score);
  data._careerScored = scored;
  const tier = CAREER_TIERS[difficulty as keyof typeof CAREER_TIERS] ?? CAREER_TIERS.normal;
  const pool = scored
    .filter(({ player }) => peak(player) >= tier.minPeak)
    .slice(tier.from, tier.to)
    .map(({ player }) => player);
  data[key] = pool;
  return pool;
}

export function pickRounds(
  pool: RawPlayer[],
  random: Random,
  count = CAREER_ROUNDS,
): RawPlayer[] {
  const picked: RawPlayer[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (picked.length < Math.min(count, pool.length) && guard++ < 5000) {
    const player = pool[Math.floor(random() * pool.length)];
    if (!player || used.has(player.id)) continue;
    used.add(player.id);
    picked.push(player);
  }
  return picked;
}

export const roundPoints = (hints: number): number => Math.max(1, 3 - hints);

export function buildCareerPuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const difficulty = String(settings.difficulty ?? "normal");
  const pool = careerPool(data, difficulty);
  const targets = pickRounds(pool, random);
  if (!targets.length) throw new Error("CAREER_POOL_UNAVAILABLE");
  return {
    game: "career",
    seed,
    settings: settings as Puzzle["settings"],
    difficulty,
    targets: targets.map((player) => ({
      playerId: player.id,
      path: pathIds(data, player),
    })),
    rounds: targets.length,
  };
}

export function verifyCareerAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const targets = puzzle.targets as { playerId: number; path: number[] }[];
  const target = targets[Number(answer.round ?? 0)];
  if (!target) return false;
  return Number(answer.playerId) === target.playerId;
}

export function scoreCareer(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const rounds = Number(puzzle.rounds ?? 0);
  let correct = 0;
  let wrong = 0;
  let hints = 0;
  for (const answer of answers) {
    const hintCount = Math.max(0, Number(answer.hints ?? 0));
    hints += hintCount;
    if (verifyCareerAnswer(puzzle, answer)) correct++;
    else wrong++;
  }
  const raw = (correct - 0.25 * hints) / 10;
  const ratio = Math.max(0, Math.min(1, raw));
  return {
    game: "career",
    correct,
    wrong,
    total: rounds,
    ratio,
    score: Math.round(ratio * 1000) / 1000,
    details: { hints },
  };
}
