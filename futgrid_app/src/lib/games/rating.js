const POS_BONUS = { GK: 2, DF: 1, MF: 0, FW: 0 };

// Legacy scale (peak values of retired legends).
const fromValue = (eur) => 70 + 9.13 * Math.log10(eur / 1e6);
// Current-form scale for active players, calibrated on curated ratings: €220m ≈ 91, €20m ≈ 79, €1m ≈ 64.
const fromCurrent = (eur) => 64 + 11.5 * Math.log10(eur / 1e6);
// Young players are priced on potential; FIFA rates what they do now.
const youthPenalty = (age) => (age && age < 24 ? (24 - age) * 1.5 : 0);

function ageOf(p) {
  if (!p.birth_date) return null;
  return (Date.now() - new Date(p.birth_date).getTime()) / 31557600000;
}

/**
 * Overall rating (FIFA-like scale). Same rules as packages/game-core/src/rating.ts:
 * curated `rating` first; active players by current (age-adjusted) market value;
 * retired legends by peak value, trophies and caps.
 */
export function playerRating(p) {
  if (p._rating !== undefined) return p._rating;
  if (typeof p.rating === "number") {
    p._rating = p.rating;
    return p._rating;
  }
  const mv = p.market_value ?? {};
  const age = ageOf(p);
  const ageMult = age && age > 28 ? 1 + 0.15 * (Math.min(age, 36) - 28) : 1;

  const current = mv.amount_eur > 0 ? fromCurrent(mv.amount_eur * ageMult) - youthPenalty(age) : 0;

  const trophies = (p.trophies ?? []).reduce((s, t) => s + (t.count ?? 1), 0);
  const caps = p.international?.caps ?? 0;
  const legacy =
    mv.highest_eur > 0
      ? fromValue(mv.highest_eur) -
        4 +
        (Math.min(trophies, 50) / 50) * 8 +
        (Math.min(Math.max(caps - 80, 0), 120) / 120) * 2
      : 0;

  const active = p.is_active !== false && current > 0;
  const base = active ? Math.max(current, 50) : Math.max(current, legacy, 50);
  p._rating = Math.round(Math.min(95, base + (POS_BONUS[p.position] ?? 0)));
  return p._rating;
}
