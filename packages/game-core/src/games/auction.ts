import { playerRating } from "../rating.js";
import type { Answer, GameData, Puzzle, RawPlayer, ScoreBreakdown } from "../types.js";
import type { Random } from "../random.js";

export const AUCTION_SLOTS = ["GK", "DF", "MF", "FW", "FW"] as const;
export const AUCTION_BUDGET = 40;
export const AUCTION_MAX_LOTS = 30;

const POOL_SIZES: Record<string, Record<string, number>> = {
  stars: { GK: 30, DF: 70, MF: 70, FW: 80 },
  wide: { GK: 120, DF: 300, MF: 300, FW: 320 },
};

export const tierOf = (rating: number): { key: string; start: number } =>
  rating >= 89
    ? { key: "star", start: 4 }
    : rating >= 85
      ? { key: "good", start: 2 }
      : { key: "base", start: 1 };

export function buildAuctionPool(
  data: GameData,
  key: string,
): Record<string, RawPlayer[]> {
  const sizes = POOL_SIZES[key] ?? POOL_SIZES.stars;
  const byPosition: Record<string, RawPlayer[]> = { GK: [], DF: [], MF: [], FW: [] };
  for (const player of data.players) {
    if (player.is_active === false) continue;
    const position = player.position ?? "";
    if (!byPosition[position]) continue;
    if (!((player.market_value?.amount_eur ?? 0) > 0)) continue;
    byPosition[position]?.push(player);
  }
  for (const position of Object.keys(byPosition)) {
    byPosition[position] = (byPosition[position] ?? [])
      .sort(
        (a, b) =>
          playerRating(b) - playerRating(a) ||
          (b.market_value?.amount_eur ?? 0) - (a.market_value?.amount_eur ?? 0),
      )
      .slice(0, sizes[position] ?? 0);
  }
  return byPosition;
}

export interface AuctionLot {
  playerId: number;
  position: string;
  rating: number;
  start: number;
}

export function buildAuctionPuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const pool = buildAuctionPool(data, String(settings.pool ?? "stars"));
  const lots: AuctionLot[] = [];
  const used = new Set<number>();
  const positions = [...AUCTION_SLOTS];
  for (let lotIndex = 0; lotIndex < 10; lotIndex++) {
    const position = positions[lotIndex % positions.length] ?? "MF";
    const options = (pool[position] ?? []).filter((player) => !used.has(player.id));
    if (!options.length) break;
    const player = options[Math.floor(random() * options.length)];
    if (!player) break;
    used.add(player.id);
    const rating = playerRating(player);
    lots.push({
      playerId: player.id,
      position,
      rating,
      start: tierOf(rating).start,
    });
  }
  if (!lots.length) throw new Error("AUCTION_POOL_UNAVAILABLE");
  return {
    game: "auction",
    seed,
    settings: settings as Puzzle["settings"],
    budget: AUCTION_BUDGET,
    slots: [...AUCTION_SLOTS],
    lots,
    rounds: lots.length,
  };
}

export function verifyAuctionAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const lots = puzzle.lots as AuctionLot[];
  const lot = lots[Number(answer.round ?? 0)];
  if (!lot) return false;
  return Number(answer.playerId) === lot.playerId;
}

export function scoreAuction(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const lots = puzzle.lots as AuctionLot[];
  let correct = 0;
  let wrong = 0;
  let points = 0;
  for (const answer of answers) {
    if (!verifyAuctionAnswer(puzzle, answer)) {
      wrong++;
      continue;
    }
    correct++;
    points += answer.won === true ? 1 : 0.2;
  }
  const ratio = answers.length ? points / answers.length : 0;
  return {
    game: "auction",
    correct,
    wrong,
    total: lots.length,
    ratio,
    score: Math.round(ratio * 1000) / 1000,
    details: { note: "Auction win flags are accepted from the authoritative session client in Phase 1." },
  };
}
