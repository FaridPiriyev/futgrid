export const ELO_START = 1000;
export const ELO_FLOOR = 100;
export const OVERALL_GAME = "overall";
export const ELO_MIN_GAMES = 5;
export const PAIR_DAILY_LIMIT = 6;
export const MIN_RATED_QUIT_MS = 15_000;

export const QUIT_REASONS = new Set(["surrender", "left", "disconnect"]);

export function kFactor(rating: number, games: number): number {
  if (games < 20) return 40;
  if (rating >= 1800) return 10;
  return 20;
}

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

export interface EloPlayer {
  id: string;
  rating: number;
  games: number;
}

export interface PairResult {
  a: string;
  b: string;
  scoreA: number;
}

export function computeElo(players: EloPlayer[], pairs: PairResult[]): Map<string, number> {
  const byId = new Map(players.map((player) => [player.id, player]));
  const opponents = new Map<string, number>();
  for (const { a, b } of pairs) {
    opponents.set(a, (opponents.get(a) ?? 0) + 1);
    opponents.set(b, (opponents.get(b) ?? 0) + 1);
  }
  const raw = new Map<string, number>();
  const outcome = new Map<string, number>();
  for (const { a, b, scoreA } of pairs) {
    const pa = byId.get(a);
    const pb = byId.get(b);
    if (!pa || !pb) continue;
    const ka = kFactor(pa.rating, pa.games) / (opponents.get(a) ?? 1);
    const kb = kFactor(pb.rating, pb.games) / (opponents.get(b) ?? 1);
    const ea = expectedScore(pa.rating, pb.rating);
    raw.set(a, (raw.get(a) ?? 0) + ka * (scoreA - ea));
    raw.set(b, (raw.get(b) ?? 0) + kb * (1 - scoreA - (1 - ea)));
    outcome.set(a, (outcome.get(a) ?? 0) + (scoreA - 0.5));
    outcome.set(b, (outcome.get(b) ?? 0) + (0.5 - scoreA));
  }
  const deltas = new Map<string, number>();
  for (const [id, value] of raw) {
    let delta = Math.round(value);
    const net = outcome.get(id) ?? 0;
    if (net > 0 && delta < 1) delta = 1;
    if (net < 0 && delta > -1) delta = -1;
    const player = byId.get(id)!;
    if (player.rating + delta < ELO_FLOOR) delta = Math.round(ELO_FLOOR - player.rating);
    deltas.set(id, delta);
  }
  return deltas;
}

export interface OutcomePlayer {
  seat: string;
  id: string;
  guest: boolean;
}

export function pairResults(input: {
  players: OutcomePlayer[];
  winnerSeat: string | null;
  loserSeat: string | null;
  endedReason: string | null;
  strength?: Record<string, { total?: number } | undefined> | null;
}): PairResult[] {
  const seats = input.players.map((player) => player.seat);
  if (seats.length < 2) return [];
  if (seats.length === 2) {
    const [a, b] = seats as [string, string];
    if (!input.winnerSeat) return [{ a, b, scoreA: 0.5 }];
    return [{ a, b, scoreA: input.winnerSeat === a ? 1 : 0 }];
  }
  const quitter = input.endedReason && QUIT_REASONS.has(input.endedReason) ? input.loserSeat : null;
  if (quitter) {
    return seats.filter((seat) => seat !== quitter).map((seat) => ({ a: seat, b: quitter, scoreA: 1 }));
  }
  const totals = input.strength
    ? seats.map((seat) => Number(input.strength?.[seat]?.total))
    : [];
  const pairs: PairResult[] = [];
  if (totals.length === seats.length && totals.every((value) => Number.isFinite(value))) {
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        const diff = totals[i]! - totals[j]!;
        pairs.push({ a: seats[i]!, b: seats[j]!, scoreA: diff === 0 ? 0.5 : diff > 0 ? 1 : 0 });
      }
    }
    return pairs;
  }
  if (input.winnerSeat) {
    for (const seat of seats) {
      if (seat !== input.winnerSeat) pairs.push({ a: input.winnerSeat, b: seat, scoreA: 1 });
    }
  }
  return pairs;
}
