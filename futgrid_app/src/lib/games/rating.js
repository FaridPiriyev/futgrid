const POS_BONUS = { GK: 3, DF: 1, MF: 0, FW: 0 };

const fromValue = (eur) => 70 + 9.13 * Math.log10(eur / 1e6);

function ageOf(p) {
  if (!p.birth_date) return null;
  return (Date.now() - new Date(p.birth_date).getTime()) / 31557600000;
}

export function playerRating(p) {
  if (p._rating !== undefined) return p._rating;
  const mv = p.market_value ?? {};
  const age = ageOf(p);
  const ageMult = age && age > 28 ? 1 + 0.15 * (Math.min(age, 36) - 28) : 1;

  const current = mv.amount_eur > 0 ? fromValue(mv.amount_eur * ageMult) : 0;

  const trophies = (p.trophies ?? []).reduce((s, t) => s + (t.count ?? 1), 0);
  const caps = p.international?.caps ?? 0;
  const legacy =
    mv.highest_eur > 0
      ? fromValue(mv.highest_eur) -
        4 +
        (Math.min(trophies, 50) / 50) * 8 +
        (Math.min(Math.max(caps - 80, 0), 120) / 120) * 2
      : 0;

  const base = Math.max(current, legacy, 50);
  p._rating = Math.round(Math.min(97, base + (POS_BONUS[p.position] ?? 0)));
  return p._rating;
}
