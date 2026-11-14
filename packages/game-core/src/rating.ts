import type { RawPlayer } from "./types.js";

const POS_BONUS: Record<string, number> = { GK: 3, DF: 1, MF: 0, FW: 0 };

const fromValue = (eur: number): number => 70 + 9.13 * Math.log10(eur / 1_000_000);

function ageOf(player: RawPlayer, now = Date.now()): number | null {
  if (!player.birth_date) return null;
  return (now - new Date(player.birth_date).getTime()) / 31_557_600_000;
}

export function playerRating(player: RawPlayer, now = Date.now()): number {
  const market = player.market_value ?? {};
  const age = ageOf(player, now);
  const ageMultiplier = age && age > 28 ? 1 + 0.15 * (Math.min(age, 36) - 28) : 1;
  const current =
    (market.amount_eur ?? 0) > 0 ? fromValue((market.amount_eur ?? 0) * ageMultiplier) : 0;
  const trophies = (player.trophies ?? []).reduce((sum, trophy) => sum + (trophy.count ?? 1), 0);
  const caps = player.international?.caps ?? 0;
  const legacy =
    (market.highest_eur ?? 0) > 0
      ? fromValue(market.highest_eur ?? 0) -
        4 +
        (Math.min(trophies, 50) / 50) * 8 +
        (Math.min(Math.max(caps - 80, 0), 120) / 120) * 2
      : 0;
  const base = Math.max(current, legacy, 50);
  return Math.round(Math.min(97, base + (POS_BONUS[player.position ?? ""] ?? 0)));
}
