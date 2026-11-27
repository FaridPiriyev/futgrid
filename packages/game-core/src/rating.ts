import type { RawPlayer } from "./types.js";

const POS_BONUS: Record<string, number> = { GK: 2, DF: 1, MF: 0, FW: 0 };

// Legacy scale (peak values of retired legends).
const fromValue = (eur: number): number => 70 + 9.13 * Math.log10(eur / 1_000_000);
// Current-form scale for active players, calibrated on curated ratings: €220m ≈ 91, €20m ≈ 79, €1m ≈ 64.
const fromCurrent = (eur: number): number => 64 + 11.5 * Math.log10(eur / 1_000_000);
// Young players are priced on potential; FIFA rates what they do now.
const youthPenalty = (age: number | null): number => (age && age < 24 ? (24 - age) * 1.5 : 0);

function ageOf(player: RawPlayer, now = Date.now()): number | null {
  if (!player.birth_date) return null;
  return (now - new Date(player.birth_date).getTime()) / 31_557_600_000;
}

/**
 * Overall rating (FIFA-like scale).
 * 1. A curated `rating` from player-ratings.json wins.
 * 2. Active players: current market value, adjusted for age (older players are cheaper).
 *    Past peak value no longer props up veterans — rating follows current form.
 * 3. Retired legends: peak value + trophies + caps.
 */
export function playerRating(player: RawPlayer, now = Date.now()): number {
  if (typeof player.rating === "number") return player.rating;
  const market = player.market_value ?? {};
  const age = ageOf(player, now);
  const ageMultiplier = age && age > 28 ? 1 + 0.15 * (Math.min(age, 36) - 28) : 1;
  const current =
    (market.amount_eur ?? 0) > 0
      ? fromCurrent((market.amount_eur ?? 0) * ageMultiplier) - youthPenalty(age)
      : 0;
  const trophies = (player.trophies ?? []).reduce((sum, trophy) => sum + (trophy.count ?? 1), 0);
  const caps = player.international?.caps ?? 0;
  const legacy =
    (market.highest_eur ?? 0) > 0
      ? fromValue(market.highest_eur ?? 0) -
        4 +
        (Math.min(trophies, 50) / 50) * 8 +
        (Math.min(Math.max(caps - 80, 0), 120) / 120) * 2
      : 0;
  const active = player.is_active !== false && current > 0;
  const base = active ? Math.max(current, 50) : Math.max(current, legacy, 50);
  return Math.round(Math.min(95, base + (POS_BONUS[player.position ?? ""] ?? 0)));
}
