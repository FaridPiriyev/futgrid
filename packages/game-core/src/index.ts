import { seeded } from "./random.js";
import type {
  Answer,
  GameData,
  GameKey,
  GameSettings,
  Puzzle,
  ScoreBreakdown,
} from "./types.js";
import { buildXoxPuzzle, scoreXox, verifyXoxAnswer } from "./games/xox.js";
import { buildOrtaPuzzle, scoreOrta, verifyOrtaAnswer } from "./games/orta.js";
import { buildAuctionPuzzle, scoreAuction, verifyAuctionAnswer } from "./games/auction.js";
import {
  buildHigherLowerPuzzle,
  scoreHigherLower,
  verifyHigherLowerAnswer,
} from "./games/higherLower.js";
import { buildWordlePuzzle, scoreWordle, verifyWordleAnswer } from "./games/wordle.js";
import { buildCareerPuzzle, scoreCareer, verifyCareerAnswer } from "./games/career.js";
import { buildLineupsPuzzle, scoreLineups, verifyLineupsAnswer } from "./games/lineups.js";
import { buildFiveClubsPuzzle, scoreFiveClubs, verifyFiveClubsAnswer } from "./games/fiveClubs.js";
import { buildClubOrderPuzzle, scoreClubOrder, verifyClubOrderAnswer } from "./games/clubOrder.js";
import { buildPyramidPuzzle, scorePyramid, verifyPyramidAnswer } from "./games/pyramid.js";
import {
  buildTwoLettersPuzzle,
  scoreTwoLetters,
  verifyTwoLettersAnswer,
} from "./games/twoLetters.js";

export * from "./types.js";
export * from "./random.js";
export * from "./data.js";
export * from "./fame.js";
export * from "./categories.js";
export * from "./rating.js";
export * from "./games/xox.js";
export * from "./games/orta.js";
export * from "./games/auction.js";
export * from "./games/higherLower.js";
export * from "./games/wordle.js";
export * from "./games/career.js";
export * from "./games/lineups.js";
export * from "./games/fiveClubs.js";
export * from "./games/clubOrder.js";
export * from "./games/pyramid.js";
export * from "./games/twoLetters.js";

export const RANKED_GAME_KEYS: GameKey[] = [
  "xox",
  "orta",
  "auction",
  "higherLower",
  "wordle",
  "career",
  "lineups",
  "fiveClubs",
  "clubOrder",
  "pyramid",
  "twoLetters",
];

export const GAME_KEY_ALIASES: Record<string, GameKey> = {
  x0x: "xox",
  "futbol-x0x": "xox",
  "orta-oyuncu": "orta",
  ortaq: "orta",
  auksion: "auction",
  auction: "auction",
  "yuksek-asagi": "higherLower",
  higherlower: "higherLower",
  wordle: "wordle",
  "futbol-wordle": "wordle",
  "karyera-yolu": "career",
  career: "career",
  "heyeti-xatirla": "lineups",
  lineups: "lineups",
  "5-klub": "fiveClubs",
  fiveclubs: "fiveClubs",
  "klublari-sirala": "clubOrder",
  cluborder: "clubOrder",
  piramida: "pyramid",
  pyramid: "pyramid",
  "iki-herf": "twoLetters",
  twoletters: "twoLetters",
};

export function normalizeGameKey(value: string): GameKey | null {
  return GAME_KEY_ALIASES[value] ?? (RANKED_GAME_KEYS.includes(value as GameKey) ? (value as GameKey) : null);
}

type Builder = (
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: () => number,
) => Puzzle;

const BUILDERS: Record<GameKey, Builder> = {
  xox: buildXoxPuzzle,
  orta: buildOrtaPuzzle,
  auction: buildAuctionPuzzle,
  higherLower: buildHigherLowerPuzzle,
  wordle: buildWordlePuzzle,
  career: buildCareerPuzzle,
  lineups: buildLineupsPuzzle,
  fiveClubs: buildFiveClubsPuzzle,
  clubOrder: buildClubOrderPuzzle,
  pyramid: buildPyramidPuzzle,
  twoLetters: buildTwoLettersPuzzle,
};

const VERIFIERS: Record<GameKey, (puzzle: Puzzle, answer: Answer) => boolean> = {
  xox: verifyXoxAnswer,
  orta: verifyOrtaAnswer,
  auction: verifyAuctionAnswer,
  higherLower: verifyHigherLowerAnswer,
  wordle: verifyWordleAnswer,
  career: verifyCareerAnswer,
  lineups: verifyLineupsAnswer,
  fiveClubs: verifyFiveClubsAnswer,
  clubOrder: verifyClubOrderAnswer,
  pyramid: verifyPyramidAnswer,
  twoLetters: verifyTwoLettersAnswer,
};

const SCORERS: Record<GameKey, (puzzle: Puzzle, answers: Answer[]) => ScoreBreakdown> = {
  xox: scoreXox,
  orta: scoreOrta,
  auction: scoreAuction,
  higherLower: scoreHigherLower,
  wordle: scoreWordle,
  career: scoreCareer,
  lineups: scoreLineups,
  fiveClubs: scoreFiveClubs,
  clubOrder: scoreClubOrder,
  pyramid: scorePyramid,
  twoLetters: scoreTwoLetters,
};

export function buildPuzzle(
  game: GameKey,
  data: GameData,
  seed: number,
  settings: GameSettings = {},
): Puzzle {
  const builder = BUILDERS[game];
  if (!builder) throw new Error(`UNSUPPORTED_GAME:${game}`);
  return builder(seed, settings as Record<string, unknown>, data, seeded(seed));
}

export function verifyAnswer(game: GameKey, puzzle: Puzzle, answer: Answer): boolean {
  const verifier = VERIFIERS[game];
  if (!verifier) return false;
  return verifier(puzzle, answer);
}

export function scoreResult(game: GameKey, puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const scorer = SCORERS[game];
  if (!scorer) throw new Error(`UNSUPPORTED_GAME:${game}`);
  return scorer(puzzle, answers);
}

export function createGameCore(data: GameData) {
  return {
    data,
    buildPuzzle: (game: GameKey, seed: number, settings: GameSettings = {}) =>
      buildPuzzle(game, data, seed, settings),
    verifyAnswer,
    scoreResult,
  };
}

export const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  easy: 0.5,
  normal: 1,
  hard: 1.5,
};

export function pointsFromRatio(ratio: number, difficulty: string): number {
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;
  return Math.round(Math.max(0, Math.min(100, ratio * 100 * multiplier)) * 1000) / 1000;
}
