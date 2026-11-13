import { norm } from "../data";
import { playerFame } from "./fame";

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const PENALTY = 3;

const RULES = {
  easy: { pool: 600, min: 20 },
  normal: { pool: 2000, min: 8 },
  hard: { pool: Infinity, min: 3 },
};

const letterKey = (l) => l.toLowerCase();

function prepared(data) {
  if (data._twoLetters) return data._twoLetters;
  const ranked = [...data.players].sort((a, b) => playerFame(b) - playerFame(a));
  const rank = new Map(ranked.map((p, i) => [p.id, i]));
  const sets = new Map();
  for (const p of data.players) sets.set(p.id, new Set(norm(p.name).replace(/ /g, "")));
  data._twoLetters = { ranked, rank, sets };
  return data._twoLetters;
}

export function hasLetters(data, player, a, b) {
  const set = prepared(data).sets.get(player.id) ?? new Set(norm(player.name).replace(/ /g, ""));
  return set.has(letterKey(a)) && set.has(letterKey(b));
}

export function countFor(data, a, b, difficulty = "normal") {
  const { ranked } = prepared(data);
  const rule = RULES[difficulty] ?? RULES.normal;
  const limit = Math.min(rule.pool, ranked.length);
  let n = 0;
  for (let i = 0; i < limit; i++) if (hasLetters(data, ranked[i], a, b)) n++;
  return n;
}

export function letterOptions(data, first, difficulty = "normal") {
  const rule = RULES[difficulty] ?? RULES.normal;
  const key = `_tl_${difficulty}_${first ?? ""}`;
  if (data[key]) return data[key];
  const out = {};
  for (const l of LETTERS) {
    if (first) out[l] = l !== first && countFor(data, first, l, difficulty) >= rule.min;
    else out[l] = LETTERS.some((m) => m !== l && countFor(data, l, m, difficulty) >= rule.min);
  }
  data[key] = out;
  return out;
}

export function examples(data, a, b, exclude = [], limit = 6) {
  const { ranked } = prepared(data);
  const skip = new Set(exclude.map((p) => p.id));
  const out = [];
  for (const p of ranked) {
    if (skip.has(p.id) || !hasLetters(data, p, a, b)) continue;
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

export function highlight(name, a, b) {
  const ka = letterKey(a);
  const kb = letterKey(b);
  return [...name].map((ch) => {
    const k = norm(ch);
    return { ch, mark: k === ka ? "a" : k === kb ? "b" : null };
  });
}
