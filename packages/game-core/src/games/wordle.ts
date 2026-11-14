import { norm } from "../data.js";
import { byFame } from "../fame.js";
import type { Answer, GameData, Puzzle, RawPlayer, ScoreBreakdown } from "../types.js";
import type { Random } from "../random.js";

export const WORDLE_MAX_TRIES = 6;
export const WORDLE_POOL = { easy: 120, normal: 260, hard: 2500 } as const;

const PARTICLES = new Set([
  "van", "de", "di", "da", "dos", "das", "der", "den", "le", "la", "el", "ben", "al",
  "von", "du", "mac", "del",
]);

const isWord = (value: string): boolean => /^[a-z]{4,8}$/.test(value);

const popularity = (player: RawPlayer): number =>
  Math.max(player.market_value?.amount_eur ?? 0, player.market_value?.highest_eur ?? 0);

export function surnameOf(player: RawPlayer): string | null {
  const tokens = norm(player.name).split(" ").filter(Boolean);
  if (!tokens.length) return null;
  const last = tokens[tokens.length - 1];
  if (tokens.length > 1 && PARTICLES.has(tokens[tokens.length - 2] ?? "")) return null;
  return last && isWord(last) ? last : null;
}

function wordleIndex(data: GameData): { dict: Set<string>; targets: RawPlayer[] } {
  if (data._wordle) return data._wordle;
  const dict = new Set<string>();
  for (const player of data.players) {
    for (const token of norm(player.name).split(" ")) if (isWord(token)) dict.add(token);
  }
  const ranked = data.players
    .filter((player) => surnameOf(player) && popularity(player) > 0)
    .sort(byFame);
  const seen = new Set<string>();
  const targets: RawPlayer[] = [];
  for (const player of ranked) {
    const word = surnameOf(player);
    if (!word || seen.has(word)) continue;
    seen.add(word);
    targets.push(player);
  }
  data._wordle = { dict, targets };
  return data._wordle;
}

export function wordlePool(
  data: GameData,
  difficulty: string,
): { dict: Set<string>; targets: RawPlayer[] } {
  const index = wordleIndex(data);
  return {
    dict: index.dict,
    targets: index.targets.slice(0, WORDLE_POOL[difficulty as keyof typeof WORDLE_POOL] ?? WORDLE_POOL.normal),
  };
}

export type Mark = "hit" | "near" | "miss";

export function evaluate(guess: string, answer: string): Mark[] {
  const result: Mark[] = Array.from({ length: guess.length }, () => "miss");
  const left: Record<string, number> = {};
  for (let index = 0; index < answer.length; index++) {
    if (guess[index] === answer[index]) result[index] = "hit";
    else left[answer[index] ?? ""] = (left[answer[index] ?? ""] ?? 0) + 1;
  }
  for (let index = 0; index < guess.length; index++) {
    if (result[index] === "hit") continue;
    const char = guess[index] ?? "";
    if ((left[char] ?? 0) > 0) {
      result[index] = "near";
      left[char] = (left[char] ?? 0) - 1;
    }
  }
  return result;
}

export function buildWordlePuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const difficulty = String(settings.difficulty ?? "normal");
  const { dict, targets } = wordlePool(data, difficulty);
  if (!targets.length) throw new Error("WORDLE_POOL_UNAVAILABLE");
  const target = targets[Math.floor(random() * targets.length)];
  const word = target ? surnameOf(target) : null;
  if (!target || !word) throw new Error("WORDLE_POOL_UNAVAILABLE");
  return {
    game: "wordle",
    seed,
    settings: settings as Puzzle["settings"],
    difficulty,
    targetPlayerId: target.id,
    word,
    dict: [...dict],
    length: word.length,
  };
}

export function verifyWordleAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const guess = norm(answer.guess ?? "").replace(/ /g, "");
  const dict = puzzle.dict as string[];
  return isWord(guess) && dict.includes(guess);
}

export function scoreWordle(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const word = String(puzzle.word ?? "");
  let attempts = 0;
  let solved = false;
  for (const answer of answers.slice(0, WORDLE_MAX_TRIES)) {
    const guess = norm(answer.guess ?? "").replace(/ /g, "");
    if (!isWord(guess)) continue;
    attempts++;
    if (guess === word) {
      solved = true;
      break;
    }
  }
  const ratio = solved ? Math.max(0, (7 - attempts) / 6) : 0;
  return {
    game: "wordle",
    correct: solved ? 1 : 0,
    wrong: solved ? 0 : 1,
    total: WORDLE_MAX_TRIES,
    ratio,
    score: Math.round(Math.min(1, ratio) * 1000) / 1000,
    details: { attempts, solved },
  };
}
