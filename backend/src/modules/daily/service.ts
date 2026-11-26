import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  buildPuzzle,
  evaluate,
  seedFrom,
  surnameOf,
  verifyAnswer,
  wordlePool,
  type Category,
  type Puzzle,
} from "@futgrid/game-core";
import { config } from "../../config.js";
import { dataVersion, getGameData } from "../../lib/data.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { cachedJson } from "../../lib/cache.js";
import { bakuDateKey } from "../../lib/time.js";

export const DAILY_GAMES = ["xox", "wordle"] as const;
export const DAILY_DIFFICULTIES = ["easy", "normal", "hard"] as const;
export type DailyGame = (typeof DAILY_GAMES)[number];

interface Actor {
  userId?: string;
  guestId?: string;
}

interface SerializedCategory {
  key: string;
  type: string;
  label: string;
  tier: number;
  club?: { id: number; name: string };
  code?: string;
  flag?: string;
  trophyId?: string;
  min?: number;
  coach?: { id: string; name: string };
  image?: string | null;
  photo?: string | null;
}

function serializeCategory(category: Category): SerializedCategory {
  return {
    key: category.key,
    type: category.type,
    label: category.label,
    tier: category.tier,
    ...(category.club ? { club: { id: category.club.id, name: category.club.name } } : {}),
    ...(category.code ? { code: category.code } : {}),
    ...(category.flag ? { flag: category.flag } : {}),
    ...(category.trophyId ? { trophyId: category.trophyId } : {}),
    ...(category.min ? { min: category.min } : {}),
    ...(category.coach ? { coach: { id: category.coach.id, name: category.coach.name } } : {}),
    ...(category.image ? { image: category.image } : {}),
    ...(category.photo ? { photo: category.photo } : {}),
  };
}

function dailySeed(game: DailyGame, difficulty: string, date: string): number {
  return seedFrom(`daily:${game}:${difficulty}:${date}:${config.DATA_VERSION}`);
}

function dailySettings(game: DailyGame, difficulty: string): Record<string, unknown> {
  if (game === "xox") {
    return { difficulty, categories: { country: true, trophy: true, coach: false } };
  }
  return { difficulty };
}

function buildDaily(game: DailyGame, difficulty: string, date: string): {
  seed: number;
  puzzle: Puzzle;
  stored: Record<string, unknown>;
} {
  const seed = dailySeed(game, difficulty, date);
  const puzzle = buildPuzzle(game, getGameData(), seed, dailySettings(game, difficulty));
  if (game === "xox") {
    const grid = puzzle.grid as { rows: Category[]; cols: Category[] };
    return {
      seed,
      puzzle,
      stored: {
        grid: {
          rows: grid.rows.map(serializeCategory),
          cols: grid.cols.map(serializeCategory),
        },
        settings: dailySettings(game, difficulty),
      },
    };
  }
  if (game === "wordle") {
    const { targets } = wordlePool(getGameData(), difficulty);
    const target = targets[seedFrom(`${date}:${difficulty}`) % targets.length];
    const word = target ? surnameOf(target) : null;
    if (target && word) {
      return {
        seed,
        puzzle,
        stored: {
          word,
          targetPlayerId: target.id,
          length: word.length,
          settings: dailySettings(game, difficulty),
        },
      };
    }
  }
  return {
    seed,
    puzzle,
    stored: {
      word: String(puzzle.word),
      targetPlayerId: Number(puzzle.targetPlayerId),
      length: Number(puzzle.length),
      settings: dailySettings(game, difficulty),
    },
  };
}

async function ensurePuzzle(game: DailyGame, difficulty: string, date: string) {
  const existing = await prisma.dailyPuzzle.findUnique({
    where: { game_date_difficulty: { game, date, difficulty } },
  });
  if (existing) return existing;
  const built = buildDaily(game, difficulty, date);
  try {
    return await prisma.dailyPuzzle.create({
      data: {
        game,
        date,
        difficulty,
        seed: BigInt(built.seed),
        dataVersion: dataVersion(),
        puzzle: built.stored as Prisma.InputJsonValue,
      },
    });
  } catch {
    const raced = await prisma.dailyPuzzle.findUnique({
      where: { game_date_difficulty: { game, date, difficulty } },
    });
    if (raced) return raced;
    throw new AppError("INTERNAL");
  }
}

export async function generateDailyPuzzles(date = bakuDateKey()): Promise<void> {
  for (const game of DAILY_GAMES) {
    for (const difficulty of DAILY_DIFFICULTIES) {
      await ensurePuzzle(game, difficulty, date);
    }
  }
}

export async function closeOldDailyPuzzles(today = bakuDateKey()): Promise<void> {
  await prisma.dailyPuzzle.updateMany({
    where: { date: { lt: today }, closed: false },
    data: { closed: true },
  });
}

function attemptWhere(puzzleId: string, actor: Actor) {
  return actor.userId
    ? { puzzleId_userId: { puzzleId, userId: actor.userId } }
    : { puzzleId_guestId: { puzzleId, guestId: actor.guestId as string } };
}

function attemptData(actor: Actor) {
  return actor.userId ? { userId: actor.userId } : { guestId: actor.guestId };
}

async function getOrCreateAttempt(
  puzzleId: string,
  game: DailyGame,
  actor: Actor,
) {
  const where = attemptWhere(puzzleId, actor);
  const existing = await prisma.dailyAttempt.findUnique({ where });
  if (existing) return existing;
  const state =
    game === "xox"
      ? { answers: [] as unknown[], board: Array(9).fill(null) as (number | null)[] }
      : { guesses: [] as unknown[], solved: false, finished: false };
  try {
    return await prisma.dailyAttempt.create({
      data: {
        puzzleId,
        ...attemptData(actor),
        state: state as Prisma.InputJsonValue,
      },
    });
  } catch {
    const raced = await prisma.dailyAttempt.findUnique({ where });
    if (raced) return raced;
    throw new AppError("INTERNAL");
  }
}

function sanitizeXox(puzzle: { puzzle: Prisma.JsonValue }, state: Record<string, unknown>) {
  const stored = puzzle.puzzle as unknown as {
    grid: { rows: SerializedCategory[]; cols: SerializedCategory[] };
  };
  return { rows: stored.grid.rows, cols: stored.grid.cols, ...state };
}

function previousDate(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

async function updateStreak(actor: Actor, game: DailyGame, date: string, solved: boolean): Promise<void> {
  const where = actor.userId
    ? { userId_game: { userId: actor.userId, game } }
    : { guestId_game: { guestId: actor.guestId as string, game } };
  const existing = await prisma.dailyStreak.findUnique({ where });
  let current = existing?.currentStreak ?? 0;
  if (existing?.lastDate !== date) {
    current = solved ? (existing?.lastDate === previousDate(date) ? current + 1 : 1) : 0;
  }
  await prisma.dailyStreak.upsert({
    where,
    update: {
      currentStreak: current,
      bestStreak: Math.max(existing?.bestStreak ?? 0, current),
      lastDate: date,
    },
    create: {
      ...(actor.userId ? { userId: actor.userId } : { guestId: actor.guestId }),
      game,
      currentStreak: current,
      bestStreak: Math.max(current, 0),
      lastDate: date,
    },
  });
}

export async function getDaily(
  game: DailyGame,
  difficulty: string,
  actor: Actor,
  date = bakuDateKey(),
) {
  const puzzle = await ensurePuzzle(game, difficulty, date);
  const attempt = await getOrCreateAttempt(puzzle.id, game, actor);

  if (game === "xox") {
    return {
      game,
      date,
      difficulty,
      puzzleId: puzzle.id,
      ...sanitizeXox(puzzle, attempt.state as Record<string, unknown>),
      attempt: {
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        solved: attempt.solved,
        board: (attempt.state as { board: (number | null)[] }).board,
        answers: (attempt.state as { answers: unknown[] }).answers,
      },
    };
  }

  const stored = puzzle.puzzle as { length: number; word: string };
  const state = attempt.state as {
    guesses: { word: string; marks: string[] }[];
    solved: boolean;
    finished: boolean;
  };
  return {
    game,
    date,
    difficulty,
    puzzleId: puzzle.id,
    length: stored.length,
    attempt: {
      id: attempt.id,
      status: attempt.status,
      solved: attempt.solved,
      guesses: state.guesses,
      attemptsLeft: Math.max(0, 6 - state.guesses.length),
      answer: state.finished ? stored.word : undefined,
    },
  };
}

export async function answerDailyXox(
  actor: Actor,
  input: { cell: number; playerId: number; difficulty: string },
  date = bakuDateKey(),
) {
  const puzzle = await ensurePuzzle("xox", input.difficulty, date);
  if (puzzle.closed) throw new AppError("CONFLICT", { message: "Daily puzzle is closed" });
  const attempt = await getOrCreateAttempt(puzzle.id, "xox", actor);
  if (attempt.status !== "active") throw new AppError("CONFLICT", { message: "Daily attempt finished" });

  const state = attempt.state as {
    answers: { cell: number; playerId: number; correct: boolean; rarity: number }[];
    board: (number | null)[];
  };
  if (state.board[input.cell] !== null) {
    throw new AppError("CONFLICT", { message: "Cell already answered" });
  }
  if (state.board.includes(input.playerId)) {
    throw new AppError("CONFLICT", { message: "Player already used" });
  }

  const rebuilt = buildPuzzle(
    "xox",
    getGameData(),
    Number(puzzle.seed),
    dailySettings("xox", input.difficulty),
  );
  const correct = verifyAnswer("xox", rebuilt, {
    round: input.cell,
    playerId: input.playerId,
  });

  await prisma.dailyAnswerCount.upsert({
    where: {
      puzzleId_cell_playerId: {
        puzzleId: puzzle.id,
        cell: input.cell,
        playerId: input.playerId,
      },
    },
    update: {
      selectedCount: { increment: 1 },
      ...(correct ? { correctCount: { increment: 1 } } : {}),
    },
    create: {
      puzzleId: puzzle.id,
      cell: input.cell,
      playerId: input.playerId,
      selectedCount: 1,
      correctCount: correct ? 1 : 0,
    },
  });

  const aggregate = await prisma.dailyAnswerCount.aggregate({
    where: { puzzleId: puzzle.id, cell: input.cell },
    _sum: { selectedCount: true, correctCount: true },
  });
  const selected = aggregate._sum.selectedCount ?? 0;
  const correctInCell = aggregate._sum.correctCount ?? 0;
  const rarity =
    Math.round((selected / Math.max(1, correctInCell)) * 10) / 10;

  state.board[input.cell] = input.playerId;
  state.answers.push({ cell: input.cell, playerId: input.playerId, correct, rarity });
  const finished = state.board.every((value) => value !== null);
  const correctCount = state.answers.filter((answer) => answer.correct).length;
  const score = Math.round((correctCount / 9) * 1000) / 1000;
  const solved = correctCount >= 5;

  const updated = await prisma.dailyAttempt.update({
    where: { id: attempt.id },
    data: {
      state: state as unknown as Prisma.InputJsonValue,
      ...(finished
        ? {
            status: "finished",
            score,
            solved,
            finishedAt: new Date(),
          }
        : {}),
    },
  });
  if (finished) await updateStreak(actor, "xox", date, solved);

  return {
    correct,
    rarity,
    board: state.board,
    answers: state.answers,
    status: updated.status,
    score: finished ? score : null,
    solved: finished ? solved : null,
    finished,
  };
}

export async function finishDailyXox(
  actor: Actor,
  difficulty: string,
  date = bakuDateKey(),
) {
  const puzzle = await ensurePuzzle("xox", difficulty, date);
  const attempt = await getOrCreateAttempt(puzzle.id, "xox", actor);
  if (attempt.status !== "active") throw new AppError("CONFLICT", { message: "Daily attempt finished" });
  const state = attempt.state as {
    answers: { correct: boolean }[];
    board: (number | null)[];
  };
  const correct = state.answers.filter((answer) => answer.correct).length;
  const score = Math.round((correct / 9) * 1000) / 1000;
  const solved = correct >= 5;
  const updated = await prisma.dailyAttempt.update({
    where: { id: attempt.id },
    data: { status: "finished", score, solved, finishedAt: new Date() },
  });
  await updateStreak(actor, "xox", date, solved);
  return { status: updated.status, score, solved, board: state.board };
}

export async function guessDailyWordle(
  actor: Actor,
  input: { guess: string; difficulty: string },
  date = bakuDateKey(),
) {
  const puzzle = await ensurePuzzle("wordle", input.difficulty, date);
  if (puzzle.closed) throw new AppError("CONFLICT", { message: "Daily puzzle is closed" });
  const attempt = await getOrCreateAttempt(puzzle.id, "wordle", actor);
  if (attempt.status !== "active") throw new AppError("CONFLICT", { message: "Daily attempt finished" });

  const stored = puzzle.puzzle as { word: string };
  const rebuilt = buildPuzzle(
    "wordle",
    getGameData(),
    Number(puzzle.seed),
    dailySettings("wordle", input.difficulty),
  );
  const guess = input.guess.trim().toLowerCase();
  const dict = (rebuilt.dict as string[]) ?? [];
  if (!/^[a-z]{4,8}$/.test(guess) || !dict.includes(guess)) {
    throw new AppError("INVALID_RESULT", { details: [{ field: "guess", rule: "not_in_dictionary" }] });
  }

  const state = attempt.state as {
    guesses: { word: string; marks: string[] }[];
    solved: boolean;
    finished: boolean;
  };
  if (state.guesses.some((entry) => entry.word === guess)) {
    throw new AppError("CONFLICT", { message: "Guess already submitted" });
  }
  const marks = evaluate(guess, stored.word);
  state.guesses.push({ word: guess, marks });
  const solved = guess === stored.word;
  const finished = solved || state.guesses.length >= 6;
  state.solved = solved;
  state.finished = finished;

  await prisma.dailyAttempt.update({
    where: { id: attempt.id },
    data: {
      state: state as unknown as Prisma.InputJsonValue,
      status: finished ? "finished" : "active",
      solved,
      score: solved ? Math.round(((7 - state.guesses.length) / 6) * 1000) / 1000 : 0,
      ...(finished ? { finishedAt: new Date() } : {}),
    },
  });
  if (finished) await updateStreak(actor, "wordle", date, solved);

  return {
    word: guess,
    marks,
    solved,
    finished,
    attemptsLeft: Math.max(0, 6 - state.guesses.length),
    answer: finished ? stored.word : undefined,
  };
}

export async function getDailyStats(
  game: DailyGame,
  date = bakuDateKey(),
  difficulty?: string,
) {
  return cachedJson(`cache:daily:${game}:${date}:${difficulty ?? "all"}`, 60, async () => {
    const puzzles = await prisma.dailyPuzzle.findMany({
      where: { game, date, ...(difficulty ? { difficulty } : {}) },
      select: { id: true },
    });
    if (!puzzles.length) {
      return {
        game,
        date,
        played: 0,
        solved: 0,
        solvedPercent: 0,
        averageScore: 0,
        averageCellsFilled: 0,
        wordleDistribution: [0, 0, 0, 0, 0, 0, 0],
      };
    }
    const attempts = await prisma.dailyAttempt.findMany({
      where: { puzzleId: { in: puzzles.map((puzzle) => puzzle.id) } },
    });
    const played = attempts.length;
    const solved = attempts.filter((attempt) => attempt.solved).length;
    const averageScore =
      played > 0
        ? Math.round((attempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0) / played) * 1000) / 1000
        : 0;
    let cells = 0;
    const distribution = [0, 0, 0, 0, 0, 0, 0];
    for (const attempt of attempts) {
      const state = attempt.state as {
        board?: (number | null)[];
        guesses?: unknown[];
        solved?: boolean;
      };
      cells += (state.board ?? []).filter((value) => value !== null).length;
      if (game === "wordle") {
        const guesses = state.guesses?.length ?? 0;
        if (attempt.solved && guesses >= 1 && guesses <= 6) distribution[guesses - 1] = (distribution[guesses - 1] ?? 0) + 1;
        else if (attempt.status === "finished") distribution[6] = (distribution[6] ?? 0) + 1;
      }
    }
    return {
      game,
      date,
      played,
      solved,
      solvedPercent: played ? Math.round((solved / played) * 1000) / 10 : 0,
      averageScore,
      averageCellsFilled: played && game === "xox" ? Math.round((cells / played) * 10) / 10 : 0,
      wordleDistribution: distribution,
    };
  });
}

export function currentDailyDate(): string {
  return bakuDateKey();
}

export function xoxRarity(selected: number, correct: number): number {
  return Math.round((selected / Math.max(1, correct)) * 10) / 10;
}
export async function regenerateDailyPuzzle(id: string) {
  const puzzle = await prisma.dailyPuzzle.findUnique({ where: { id } });
  if (!puzzle) throw new AppError("NOT_FOUND");
  const seed = randomBytes(4).readUInt32BE(0);
  const built = buildDaily(puzzle.game as DailyGame, puzzle.difficulty, puzzle.date);
  const stored = built.stored;
  const rebuilt = buildPuzzle(
    puzzle.game as DailyGame,
    getGameData(),
    seed,
    dailySettings(puzzle.game as DailyGame, puzzle.difficulty),
  );
  let nextStored: Record<string, unknown> = stored;
  if (puzzle.game === "xox") {
    const grid = rebuilt.grid as { rows: Category[]; cols: Category[] };
    nextStored = {
      grid: {
        rows: grid.rows.map(serializeCategory),
        cols: grid.cols.map(serializeCategory),
      },
      settings: dailySettings("xox", puzzle.difficulty),
    };
  } else {
    nextStored = {
      word: String(rebuilt.word),
      targetPlayerId: Number(rebuilt.targetPlayerId),
      length: Number(rebuilt.length),
      settings: dailySettings("wordle", puzzle.difficulty),
    };
  }
  await prisma.$transaction([
    prisma.dailyAnswerCount.deleteMany({ where: { puzzleId: id } }),
    prisma.dailyAttempt.deleteMany({ where: { puzzleId: id } }),
    prisma.dailyPuzzle.update({
      where: { id },
      data: { seed: BigInt(seed), puzzle: nextStored as Prisma.InputJsonValue, closed: false },
    }),
  ]);
  return { ok: true, id, seed };
}

export async function editDailyPuzzle(id: string, puzzleData: Record<string, unknown>) {
  const puzzle = await prisma.dailyPuzzle.findUnique({ where: { id } });
  if (!puzzle) throw new AppError("NOT_FOUND");
  await prisma.dailyPuzzle.update({
    where: { id },
    data: { puzzle: puzzleData as Prisma.InputJsonValue },
  });
  return { ok: true, id };
}

