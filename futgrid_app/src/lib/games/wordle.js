import { norm } from "../data";
import { seedFrom, todayKey } from "../random";

export const MAX_TRIES = 6;
export const POOL = { easy: 150, normal: 600, hard: 2500 };

const PARTICLES = new Set([
  "van", "de", "di", "da", "dos", "das", "der", "den", "le", "la", "el", "ben", "al", "von", "du", "mac", "del",
]);

const isWord = (w) => /^[a-z]{4,8}$/.test(w);

const popularity = (p) =>
  Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0);

export function surnameOf(p) {
  const tokens = norm(p.name).split(" ").filter(Boolean);
  if (!tokens.length) return null;
  const last = tokens[tokens.length - 1];
  if (tokens.length > 1 && PARTICLES.has(tokens[tokens.length - 2])) return null;
  return isWord(last) ? last : null;
}

function index(data) {
  if (data._wordle) return data._wordle;
  const dict = new Set();
  for (const p of data.players)
    for (const t of norm(p.name).split(" ")) if (isWord(t)) dict.add(t);
  const ranked = data.players
    .filter((p) => surnameOf(p) && popularity(p) > 0)
    .sort((a, b) => popularity(b) - popularity(a));
  const seen = new Set();
  const targets = [];
  for (const p of ranked) {
    const w = surnameOf(p);
    if (seen.has(w)) continue;
    seen.add(w);
    targets.push(p);
  }
  data._wordle = { dict, targets };
  return data._wordle;
}

export function wordlePool(data, difficulty) {
  const { dict, targets } = index(data);
  return { dict, targets: targets.slice(0, POOL[difficulty] ?? POOL.normal) };
}

export function dailyTarget(targets, difficulty) {
  return targets[seedFrom(`${todayKey()}:${difficulty}`) % targets.length];
}

export function randomTarget(targets, random = Math.random, avoid) {
  for (let i = 0; i < 20; i++) {
    const p = targets[Math.floor(random() * targets.length)];
    if (p.id !== avoid) return p;
  }
  return targets[0];
}

export function evaluate(guess, answer) {
  const res = Array(guess.length).fill("miss");
  const left = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) res[i] = "hit";
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] === "hit") continue;
    if (left[guess[i]] > 0) {
      res[i] = "near";
      left[guess[i]]--;
    }
  }
  return res;
}

const RANK = { miss: 1, near: 2, hit: 3 };

export function keyStates(rows) {
  const out = {};
  for (const { word, marks } of rows)
    for (let i = 0; i < word.length; i++) {
      const k = word[i];
      if (!out[k] || RANK[marks[i]] > RANK[out[k]]) out[k] = marks[i];
    }
  return out;
}

export function shareText(rows, won, length) {
  const map = { hit: "🟩", near: "🟨", miss: "⬛" };
  const head = `FutGrid Wordle ${todayKey()} ${won ? rows.length : "X"}/${MAX_TRIES} (${length} hərf)`;
  return [head, ...rows.map((r) => r.marks.map((m) => map[m]).join(""))].join("\n");
}

const dailyKey = (difficulty) => `futgrid:wordle:${difficulty}:${todayKey()}`;

export function loadDaily(difficulty) {
  try {
    return JSON.parse(localStorage.getItem(dailyKey(difficulty)) ?? "null");
  } catch {
    return null;
  }
}

export function saveDaily(difficulty, value) {
  try {
    localStorage.setItem(dailyKey(difficulty), JSON.stringify(value));
  } catch {}
}
