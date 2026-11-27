import { randomBytes } from "node:crypto";
import type { FastifyRequest } from "fastify";
import {
  buildPuzzle,
  normalizeGameKey,
  pointsFromRatio,
  scoreResult,
  type Answer,
  type GameKey,
  type Puzzle,
} from "@futgrid/game-core";
import type { GameSession } from "@prisma/client";
import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";
import { dataVersion, getGameData } from "../../lib/data.js";
import { ensureGames } from "../../lib/games.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { enforceScopedLimit, rateLimitKey } from "../../lib/rate-limit.js";
import { dayStartBaku, isoWeekKey, monthKey } from "../../lib/time.js";
import { applyPoints, getMyRank } from "../leaderboard/service.js";
import type { CreateSessionInput, FinishSessionInput, AnswerInput } from "./schemas.js";
import { applySoloResult } from "../ratings/service.js";

function actorWhere(identity: { userId?: string; guestId?: string }) {
  return identity.userId ? { userId: identity.userId } : { guestId: identity.guestId };
}

function actorData(identity: { userId?: string; guestId?: string }) {
  return identity.userId ? { userId: identity.userId } : { guestId: identity.guestId };
}

export async function createSession(
  identity: { userId?: string; guestId?: string },
  input: CreateSessionInput,
  request: FastifyRequest,
) {
  const game = normalizeGameKey(input.game);
  if (!game) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "game", rule: "unsupported_game" }],
    });
  }
  await ensureGames();
  await enforceScopedLimit(
    rateLimitKey("sessions", identity.userId ?? identity.guestId ?? request.ip),
    60,
    60 * 60,
  );

  const serializedSettings = JSON.stringify(input.settings);
  if (serializedSettings.length > 16_384) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "settings", rule: "too_large" }],
    });
  }

  const seed = randomBytes(4).readUInt32BE(0);
  try {
    buildPuzzle(game, getGameData(), seed, {
      ...input.settings,
      difficulty: input.difficulty,
    });
  } catch {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "settings", rule: "puzzle_unavailable" }],
    });
  }

  const expiresAt = new Date(Date.now() + config.GAME_SESSION_TTL_MINUTES * 60 * 1000);
  const session = await prisma.gameSession.create({
    data: {
      ...actorData(identity),
      gameId: game,
      mode: input.mode,
      difficulty: input.difficulty,
      settings: input.settings as unknown as import("@prisma/client").Prisma.InputJsonValue,
      seed: BigInt(seed),
      dataVersion: dataVersion(),
      expiresAt,
    },
  });

  return {
    sessionId: session.id,
    seed,
    dataVersion: session.dataVersion,
    expiresAt: session.expiresAt.toISOString(),
  };
}

function assertOwnership(
  session: GameSession,
  identity: { userId?: string; guestId?: string },
): void {
  const ownerMatches = identity.userId
    ? session.userId === identity.userId
    : Boolean(identity.guestId && session.guestId === identity.guestId);
  if (!ownerMatches) throw new AppError("SESSION_FORBIDDEN");
}

function validateShape(
  game: GameKey,
  puzzle: Puzzle,
  answer: AnswerInput,
  answerIndex: number,
): void {
  const fail = (rule: string): never => {
    throw new AppError("INVALID_RESULT", {
      details: [{ field: `answers.${answerIndex}`, rule }],
    });
  };
  const data = getGameData();
  const round = answer.round ?? 0;
  const playerExists = answer.playerId === undefined || data.playersById.has(answer.playerId);

  if (!playerExists) fail("player_not_found");

  switch (game) {
    case "xox":
      if (!Number.isInteger(round) || round < 0 || round > 8) fail("invalid_cell");
      if (answer.playerId === undefined) fail("player_required");
      break;
    case "orta":
      if (round >= Number(puzzle.rounds ?? 0)) fail("invalid_round");
      if (answer.playerId === undefined) fail("player_required");
      break;
    case "auction":
      if (round >= Number(puzzle.rounds ?? 0)) fail("invalid_round");
      if (answer.playerId === undefined) fail("player_required");
      break;
    case "higherLower":
      if (round >= Number(puzzle.rounds ?? 0)) fail("invalid_round");
      if (answer.direction !== "up" && answer.direction !== "down") fail("direction_required");
      break;
    case "wordle":
      if (!answer.guess || !/^[a-z]{4,8}$/.test(answer.guess.trim().toLowerCase())) {
        fail("invalid_guess");
      }
      break;
    case "career":
      if (round >= Number(puzzle.rounds ?? 0)) fail("invalid_round");
      if (answer.playerId === undefined) fail("player_required");
      break;
    case "lineups":
      if (round >= (puzzle.slots as unknown[]).length) fail("invalid_round");
      if (!(answer.playerName ?? answer.name ?? answer.guess)) fail("name_required");
      break;
    case "fiveClubs":
      if (answer.playerId === undefined) fail("player_required");
      break;
    case "clubOrder": {
      const targets = puzzle.targets as { path: number[] }[];
      const target = targets[round];
      if (!target) fail("invalid_round");
      const clubIds = answer.clubIds;
      if (!Array.isArray(clubIds)) {
        fail("club_ids_required");
        return;
      }
      if (clubIds.length !== target.path.length) fail("invalid_club_count");
      break;
    }
    case "pyramid":
      if (round >= (puzzle.levels as unknown[]).length) fail("invalid_round");
      if (answer.playerId === undefined) fail("player_required");
      break;
    case "twoLetters":
      if (round >= Number(puzzle.rounds ?? 0)) fail("invalid_round");
      if (!(answer.playerName ?? answer.name ?? answer.guess)) fail("name_required");
      break;
  }
}

function validateTiming(input: FinishSessionInput, game: GameKey): void {
  const answers = input.answers;
  const timed = answers.filter((answer) => answer.ms !== undefined);
  if (!timed.length) return;
  const total = timed.reduce((sum, answer) => sum + (answer.ms ?? 0), 0);
  if (timed.length >= 5 && total / timed.length < 150) {
    throw new AppError("INVALID_RESULT", { details: [{ rule: "timing_too_fast" }] });
  }
  if (game === "xox" && answers.length >= 9 && total < 3000) {
    throw new AppError("INVALID_RESULT", { details: [{ rule: "xox_too_fast" }] });
  }
  if (input.durationMs !== undefined && input.durationMs < answers.length * 150) {
    throw new AppError("INVALID_RESULT", { details: [{ rule: "duration_too_short" }] });
  }
}

async function isFlagged(
  identity: { userId?: string; guestId?: string },
  game: GameKey,
  input: FinishSessionInput,
): Promise<boolean> {
  const recent = await prisma.pointsLedger.findMany({
    where: { ...actorWhere(identity), gameId: game, reason: "session" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { score: true },
  });
  if (recent.length >= 19 && recent.every((row) => row.score >= 0.999)) return true;

  const timed = input.answers.filter((answer) => answer.ms !== undefined);
  if (timed.length >= 5) {
    const avg = timed.reduce((sum, answer) => sum + (answer.ms ?? 0), 0) / timed.length;
    if (avg < 150) return true;
  }
  return false;
}

export async function finishSession(
  identity: { userId?: string; guestId?: string },
  sessionId: string,
  input: FinishSessionInput,
) {
  const session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError("NOT_FOUND");
  assertOwnership(session, identity);
  if (session.status !== "active") throw new AppError("SESSION_FINISHED");
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.gameSession.updateMany({
      where: { id: session.id, status: "active" },
      data: { status: "expired" },
    });
    throw new AppError("SESSION_EXPIRED");
  }

  const game = normalizeGameKey(session.gameId);
  if (!game) throw new AppError("INVALID_RESULT", { details: [{ rule: "unsupported_game" }] });

  let puzzle: Puzzle;
  try {
    puzzle = buildPuzzle(game, getGameData(), Number(session.seed), {
      ...(session.settings as Record<string, unknown>),
      difficulty: session.difficulty as "easy" | "normal" | "hard",
    });
  } catch (error) {
    logger.error({ err: error, sessionId }, "failed to rebuild puzzle");
    throw new AppError("INTERNAL");
  }

  input.answers.forEach((answer, index) => validateShape(game, puzzle, answer, index));
  validateTiming(input, game);

  const answers = input.answers as Answer[];
  const breakdown = scoreResult(game, puzzle, answers);
  const flagged = await isFlagged(identity, game, input);
  const now = new Date();
  const todayStart = dayStartBaku(now);
  const dailyCount = await prisma.pointsLedger.count({
    where: {
      ...actorWhere(identity),
      gameId: game,
      reason: "session",
      createdAt: { gte: todayStart },
    },
  });
  const ranked = session.mode === "ranked";
  const counts = ranked && !flagged && dailyCount < config.DAILY_RANKED_LIMIT;
  const points = counts ? pointsFromRatio(breakdown.score, session.difficulty) : 0;
  const reason = !ranked
    ? "unranked"
    : flagged
      ? "flagged"
      : dailyCount >= config.DAILY_RANKED_LIMIT
        ? "daily_limit"
        : "session";

  const claimed = await prisma.gameSession.updateMany({
    where: { id: session.id, status: "active" },
    data: {
      status: "finished",
      finishedAt: now,
      score: breakdown.score,
      points,
      flagged,
    },
  });
  if (claimed.count === 0) throw new AppError("SESSION_FINISHED");

  const streak =
    typeof breakdown.details?.streak === "number" ? breakdown.details.streak : null;

  let newRecord = false;
  await prisma.$transaction(async (tx) => {
    if (ranked) {
      await tx.pointsLedger.create({
        data: {
          ...actorData(identity),
          sessionId: session.id,
          gameId: game,
          points,
          score: breakdown.score,
          difficulty: session.difficulty as "easy" | "normal" | "hard",
          periodWeek: isoWeekKey(now),
          periodMonth: monthKey(now),
          reason,
        },
      });
    }
    const existing = await tx.userGameStats.findUnique({
      where: identity.userId
        ? { userId_gameId: { userId: identity.userId, gameId: game } }
        : { guestId_gameId: { guestId: identity.guestId as string, gameId: game } },
    });
    newRecord = breakdown.score > (existing?.bestScore ?? 0);
    const currentStreak =
      streak ?? (breakdown.score > 0 ? (existing?.currentStreak ?? 0) + 1 : 0);
    const where = identity.userId
      ? { userId_gameId: { userId: identity.userId, gameId: game } }
      : { guestId_gameId: { guestId: identity.guestId as string, gameId: game } };
    await tx.userGameStats.upsert({
      where,
      update: {
        played: { increment: 1 },
        ...(breakdown.score >= 0.8 ? { wins: { increment: 1 } } : {}),
        bestScore: Math.max(existing?.bestScore ?? 0, breakdown.score),
        totalPoints: (existing?.totalPoints ?? 0) + points,
        currentStreak,
        bestStreak: Math.max(existing?.bestStreak ?? 0, currentStreak),
        lastPlayedAt: now,
      },
      create: {
        ...actorData(identity),
        gameId: game,
        played: 1,
        wins: breakdown.score >= 0.8 ? 1 : 0,
        bestScore: breakdown.score,
        totalPoints: points,
        currentStreak,
        bestStreak: currentStreak,
        lastPlayedAt: now,
      },
    });
  });

  let rating: Awaited<ReturnType<typeof applySoloResult>> = null;
  if (counts && identity.userId) {
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { teamId: true, emailVerifiedAt: true, blockedAt: true, deletedAt: true },
    });
    if (user?.emailVerifiedAt && !user.blockedAt && !user.deletedAt) {
      // Site-wide rating: this game's rating and the overall rating (both start at 1000).
      try {
        rating = await applySoloResult(identity.userId, game, breakdown.score, session.difficulty);
      } catch (error) {
        logger.error({ err: error, userId: identity.userId }, "rating update failed");
      }
    }
    if (points > 0 && user?.emailVerifiedAt && !user.blockedAt && !user.deletedAt) {
      try {
        await applyPoints({
          userId: identity.userId,
          gameId: game,
          points,
          teamId: user.teamId,
          at: now,
        });
      } catch (error) {
        logger.error({ err: error, userId: identity.userId }, "leaderboard projection update failed");
      }
    }
  }

  let rank: number | null = null;
  if (identity.userId) {
    try {
      const me = await getMyRank(identity.userId, "week", game);
      rank = me.rank;
    } catch {
      rank = null;
    }
  }

  return {
    score: breakdown.score,
    points,
    newRecord,
    rank,
    flagged,
    counted: counts,
    reason,
    rating,
    details: breakdown,
  };
}

export async function recordEvent(
  identity: { userId?: string; guestId?: string },
  input: { game: string; mode: string; durationMs: number },
) {
  const game = normalizeGameKey(input.game);
  if (!game) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "game", rule: "unsupported_game" }],
    });
  }
  await prisma.event.create({
    data: {
      ...actorData(identity),
      gameId: game,
      type: "game_completed",
      payload: { mode: input.mode, durationMs: input.durationMs },
    },
  });
  return { ok: true };
}
