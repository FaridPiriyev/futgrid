import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildPuzzle,
  createGameData,
  RANKED_GAME_KEYS,
  scoreResult,
  verifyAnswer,
  type Answer,
  type GameData,
  type GameKey,
  type Puzzle,
} from "../src/index.js";

const dataDir = fileURLToPath(new URL("../data/", import.meta.url));

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(`${dataDir}${name}`, "utf8")) as T;
}

let data: GameData;

beforeAll(() => {
  data = createGameData({
    clubs: readJson("clubs.json"),
    players: readJson("players.json"),
    trophies: readJson("trophies.json"),
    countries: readJson("countries.json"),
    coaches: readJson("coaches.json"),
    famousMatches: readJson("famous-matches.json"),
  });
});

const settingsFor = (game: GameKey): Record<string, unknown> => {
  if (game === "xox") {
    return { difficulty: "normal", categories: { country: true, trophy: true, coach: false } };
  }
  if (game === "orta") return { difficulty: "normal", rounds: 3 };
  if (game === "higherLower") return { difficulty: "normal", rounds: 5 };
  if (game === "twoLetters") return { difficulty: "normal", rounds: 3 };
  return { difficulty: "normal" };
};

const invalidAnswer = (game: GameKey): Answer => {
  switch (game) {
    case "xox":
      return { round: 0, playerId: -999 };
    case "orta":
    case "career":
    case "fiveClubs":
    case "pyramid":
      return { round: 0, playerId: -999 };
    case "auction":
      return { round: 0, playerId: -999 };
    case "higherLower":
      return { round: 999, direction: "up" };
    case "wordle":
      return { round: 0, guess: "zzzzzzzz" };
    case "lineups":
      return { round: 0, playerName: "Nobody Here" };
    case "clubOrder":
      return { round: 0, clubIds: [-1] };
    case "twoLetters":
      return { round: 0, playerName: "" };
  }
};

describe("game-core reproducibility", () => {
  for (const game of RANKED_GAME_KEYS) {
    it(`${game}: same seed produces the same puzzle`, () => {
      const settings = settingsFor(game);
      const first = buildPuzzle(game, data, 123456789, settings);
      const second = buildPuzzle(game, data, 123456789, settings);
      expect(second).toEqual(first);
    });

    it(`${game}: different seed changes the puzzle`, () => {
      const settings = settingsFor(game);
      const first = buildPuzzle(game, data, 1, settings);
      let changed = false;
      for (let seed = 2; seed < 20 && !changed; seed++) {
        const other = buildPuzzle(game, data, seed, settings);
        changed = JSON.stringify(other) !== JSON.stringify(first);
      }
      expect(changed).toBe(true);
    });

    it(`${game}: invalid answer is rejected`, () => {
      const puzzle = buildPuzzle(game, data, 42, settingsFor(game));
      expect(verifyAnswer(game, puzzle, invalidAnswer(game))).toBe(false);
    });

    it(`${game}: empty submission scores zero`, () => {
      const puzzle = buildPuzzle(game, data, 42, settingsFor(game));
      const result = scoreResult(game, puzzle, []);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.ratio).toBeGreaterThanOrEqual(0);
    });
  }
});

describe("known scoring inputs", () => {
  it("wordle awards maximum points for a first-attempt solve", () => {
    const puzzle = buildPuzzle("wordle", data, 7, { difficulty: "normal" }) as Puzzle & {
      word: string;
    };
    const result = scoreResult("wordle", puzzle, [{ round: 0, guess: puzzle.word }]);
    expect(result.ratio).toBe(1);
  });

  it("career awards one round point for a correct answer without hints", () => {
    const puzzle = buildPuzzle("career", data, 9, { difficulty: "normal" }) as Puzzle & {
      targets: { playerId: number }[];
    };
    const first = puzzle.targets[0];
    expect(first).toBeTruthy();
    const result = scoreResult("career", puzzle, [{ round: 0, playerId: first?.playerId }]);
    expect(result.ratio).toBeCloseTo(0.1, 3);
  });

  it("higher/lower increases the streak for correct directions", () => {
    const puzzle = buildPuzzle("higherLower", data, 11, {
      difficulty: "normal",
      rounds: 3,
    }) as Puzzle & { sequence: { aValue: number; bValue: number }[] };
    const answers = puzzle.sequence.map((round, index) => ({
      round: index,
      direction: round.bValue >= round.aValue ? ("up" as const) : ("down" as const),
    }));
    const result = scoreResult("higherLower", puzzle, answers);
    expect(result.ratio).toBeCloseTo(3 / 20, 3);
  });

  it("xox scores correct cells only once", () => {
    const puzzle = buildPuzzle("xox", data, 3, settingsFor("xox")) as Puzzle & {
      grid: { rows: { ids: Set<number> }[]; cols: { ids: Set<number> }[] };
    };
    const row = puzzle.grid.rows[0];
    const column = puzzle.grid.cols[0];
    const playerId = [...(row?.ids ?? [])].find((id) => column?.ids.has(id));
    expect(playerId).toBeTruthy();
    const result = scoreResult("xox", puzzle, [
      { round: 0, playerId },
      { round: 0, playerId },
    ]);
    expect(result.correct).toBe(1);
    expect(result.ratio).toBeCloseTo(1 / 9, 3);
  });
});
