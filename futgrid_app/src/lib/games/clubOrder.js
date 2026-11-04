import { careerPath, careerPool, pickRounds } from "./career";

export const ROUNDS = 10;
export const MAX_STEPS = 9;

export function orderPool(data, difficulty) {
  const key = `_order_${difficulty}`;
  data[key] ??= careerPool(data, difficulty).filter(
    (p) => careerPath(data, p).length <= MAX_STEPS,
  );
  return data[key];
}

export const pickPlayers = (pool, random = Math.random) =>
  pickRounds(pool, random, ROUNDS);

export function checkClub(path, filled, slot, clubId) {
  if (path[slot]?.club.id === clubId) return { type: "hit" };
  const elsewhere = path.findIndex(
    (step, i) => i !== slot && !filled[i] && step.club.id === clubId,
  );
  if (elsewhere >= 0) return { type: "elsewhere" };
  if (path.some((step) => step.club.id === clubId)) return { type: "used" };
  return { type: "miss" };
}

export const nextEmpty = (filled, from = 0) => {
  for (let k = 0; k < filled.length; k++) {
    const i = (from + k) % filled.length;
    if (!filled[i]) return i;
  }
  return null;
};
