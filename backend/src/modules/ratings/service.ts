import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { cachedJson } from "../../lib/cache.js";
import { monthStartBaku, weekStartBaku } from "../../lib/time.js";
import { ELO_FLOOR, ELO_START, OVERALL_GAME } from "../duel/rating.js";

/**
 * One rating system for the whole site.
 *
 * - Every game has its own rating, everyone starts at 1000 (X0X 1000, Açıq Artırma 1000, …).
 * - Solo games against the bot move it a little: a win is +5 (easy +3, hard +8).
 * - Online duels (friend or random opponent) use Elo: about ±20 against an equal opponent.
 * - The overall rating ("overall" row) starts at 1000 and moves by exactly the same deltas,
 *   so it is 1000 + the sum of all per-game changes. That is the number on the home page.
 * - Every change is logged in rating_events, so weekly/monthly boards show who gained most.
 */

export type RatingResult = "wins" | "losses" | "draws";

export interface RatingChange {
  userId: string;
  gameId: string;
  delta: number;
  result: RatingResult;
  source: "solo" | "duel";
  sessionId?: string;
}

type RatingRow = { id: string; userId: string; gameId: string; rating: number; games: number };

/** Creates missing rows (1000) and locks them for the transaction, ordered to avoid deadlocks. */
export async function lockRatings(
  tx: Prisma.TransactionClient,
  userIds: string[],
  gameIds: string[],
): Promise<RatingRow[]> {
  await tx.userRating.createMany({
    data: userIds.flatMap((userId) =>
      gameIds.map((gameId) => ({ userId, gameId, rating: ELO_START, peak: ELO_START })),
    ),
    skipDuplicates: true,
  });
  return tx.$queryRaw<RatingRow[]>`
    SELECT id, user_id AS "userId", game_id AS "gameId", rating, games
    FROM user_ratings
    WHERE user_id = ANY(${userIds}::uuid[]) AND game_id = ANY(${gameIds}::text[])
    ORDER BY id
    FOR UPDATE`;
}

async function bump(tx: Prisma.TransactionClient, row: RatingRow, value: number, result: RatingResult) {
  await tx.$executeRaw`
    UPDATE user_ratings
    SET rating = ${value},
        peak = GREATEST(peak, ${value}),
        games = games + 1,
        ${Prisma.raw(`"${result}" = "${result}" + 1`)},
        updated_at = NOW()
    WHERE id = ${row.id}::uuid`;
}

export interface AppliedChange {
  before: number;
  after: number;
  delta: number;
  overallBefore: number;
  overallAfter: number;
  overallDelta: number;
}

/**
 * Applies per-game deltas and mirrors them onto the overall rating.
 * Must run inside a transaction; the rows are locked here.
 */
export async function applyRatingChanges(
  tx: Prisma.TransactionClient,
  changes: RatingChange[],
): Promise<Map<string, AppliedChange>> {
  const out = new Map<string, AppliedChange>();
  if (!changes.length) return out;
  const userIds = [...new Set(changes.map((c) => c.userId))];
  const gameIds = [...new Set([...changes.map((c) => c.gameId), OVERALL_GAME])];
  const rows = await lockRatings(tx, userIds, gameIds);
  const row = (userId: string, gameId: string) =>
    rows.find((entry) => entry.userId === userId && entry.gameId === gameId)!;

  for (const change of changes) {
    const g = row(change.userId, change.gameId);
    const o = row(change.userId, OVERALL_GAME);
    // Never drop below the floor in either rating.
    const delta = Math.max(Math.round(change.delta), Math.round(ELO_FLOOR - g.rating));
    const after = g.rating + delta;
    const overallDelta = Math.max(delta, Math.round(ELO_FLOOR - o.rating));
    const overallAfter = o.rating + overallDelta;
    await bump(tx, g, after, change.result);
    await bump(tx, o, overallAfter, change.result);
    g.rating = after;
    o.rating = overallAfter;
    await tx.ratingEvent.create({
      data: {
        userId: change.userId,
        gameId: change.gameId,
        delta,
        source: change.source,
        sessionId: change.sessionId ?? null,
      },
    });
    out.set(change.userId, {
      before: after - delta,
      after,
      delta,
      overallBefore: overallAfter - overallDelta,
      overallAfter,
      overallDelta,
    });
  }
  return out;
}

const SOLO_WIN = { easy: 3, normal: 5, hard: 8 } as const;
const SOLO_LOSS = { easy: -3, normal: -2, hard: -1 } as const;

/** Bot games: score is 0..1. Win (≥ 0.8) → +3/+5/+8, middling → +1, poor (< 0.4) → small loss. */
export function soloDelta(score: number, difficulty: string): { delta: number; result: RatingResult } {
  const level = (difficulty in SOLO_WIN ? difficulty : "normal") as keyof typeof SOLO_WIN;
  if (score >= 0.8) return { delta: SOLO_WIN[level], result: "wins" };
  if (score >= 0.4) return { delta: 1, result: "draws" };
  return { delta: SOLO_LOSS[level], result: "losses" };
}

export async function applySoloResult(
  userId: string,
  gameId: string,
  score: number,
  difficulty: string,
  sessionId?: string,
) {
  const { delta, result } = soloDelta(score, difficulty);
  const applied = await prisma.$transaction((tx) =>
    applyRatingChanges(tx, [{ userId, gameId, delta, result, source: "solo", sessionId }]),
  );
  return applied.get(userId) ?? null;
}

/** Moves a rating (and the overall rating) by `delta` without counting a game. Used by admin tools. */
async function adjust(
  tx: Prisma.TransactionClient,
  userId: string,
  gameId: string,
  delta: number,
  source: string,
  sessionId?: string,
) {
  const rows = await lockRatings(tx, [userId], [gameId, OVERALL_GAME]);
  for (const row of rows) {
    const value = Math.max(ELO_FLOOR, row.rating + delta);
    await tx.$executeRaw`UPDATE user_ratings SET rating = ${value}, updated_at = NOW() WHERE id = ${row.id}::uuid`;
  }
  await tx.ratingEvent.create({ data: { userId, gameId, delta, source, sessionId: sessionId ?? null } });
}

/** Undo the rating a solo session gave (admin "revoke result"). Returns the reverted delta. */
export async function revertSessionRating(sessionId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const events = await tx.ratingEvent.findMany({ where: { sessionId } });
    const net = events.reduce((sum, e) => sum + e.delta, 0);
    const original = events.find((e) => e.source === "solo");
    if (!original || net === 0) return 0;
    await adjust(tx, original.userId, original.gameId, -net, "revoke", sessionId);
    return net;
  });
}

/** Admin tool for cheaters: puts every rating of the user back to 1000 (history stays). */
export async function resetUserRatings(userId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.userRating.findMany({ where: { userId } });
    for (const row of rows) {
      if (row.gameId === OVERALL_GAME || row.rating === ELO_START) continue;
      await tx.ratingEvent.create({
        data: { userId, gameId: row.gameId, delta: ELO_START - row.rating, source: "reset" },
      });
    }
    await tx.userRating.updateMany({ where: { userId }, data: { rating: ELO_START, peak: ELO_START } });
    return { reset: rows.length };
  });
}

export type RatingPeriod = "week" | "month" | "all";

const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  team: { select: { id: true, name: true, slug: true, logoUrl: true } },
} as const;

/**
 * "all": current rating (1000-based) for the overall board or one game.
 * "week"/"month": rating gained in that period (only positive totals are listed).
 */
export async function getRatingLeaderboard(period: RatingPeriod, gameId: string | undefined, limit: number) {
  const game = gameId || OVERALL_GAME;
  return cachedJson(`ratings:lb:${period}:${game}:${limit}`, 30, async () => {
    if (period === "all") {
      const rows = await prisma.userRating.findMany({
        where: {
          gameId: game,
          games: { gte: 1 },
          user: { deletedAt: null, blockedAt: null, emailVerifiedAt: { not: null } },
        },
        orderBy: [{ rating: "desc" }, { games: "desc" }],
        take: limit,
        select: { rating: true, games: true, wins: true, losses: true, draws: true, user: { select: userSelect } },
      });
      return {
        period,
        game,
        entries: rows.map((row, index) => ({
          rank: index + 1,
          userId: row.user.id,
          username: row.user.username,
          displayName: row.user.displayName ?? row.user.username,
          avatarUrl: row.user.avatarUrl,
          team: row.user.team,
          rating: Math.round(row.rating),
          points: Math.round(row.rating),
          games: row.games,
          wins: row.wins,
          losses: row.losses,
          draws: row.draws,
          winRate: row.games ? Math.round((row.wins / row.games) * 1000) / 10 : 0,
        })),
      };
    }

    const since = period === "week" ? weekStartBaku(new Date()) : monthStartBaku(new Date());
    const grouped = await prisma.ratingEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since }, ...(gameId ? { gameId } : {}) },
      _sum: { delta: true },
      _count: { _all: true },
      orderBy: { _sum: { delta: "desc" } },
      take: limit * 2,
    });
    const positive = grouped.filter((row) => (row._sum.delta ?? 0) > 0);
    const users = await prisma.user.findMany({
      where: {
        id: { in: positive.map((row) => row.userId) },
        deletedAt: null,
        blockedAt: null,
        emailVerifiedAt: { not: null },
      },
      select: userSelect,
    });
    const ratings = await prisma.userRating.findMany({
      where: { userId: { in: users.map((u) => u.id) }, gameId: game },
      select: { userId: true, rating: true, wins: true, games: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const ratingOf = new Map(ratings.map((r) => [r.userId, r]));
    const entries = [];
    for (const row of positive) {
      const user = byId.get(row.userId);
      if (!user) continue;
      const r = ratingOf.get(user.id);
      entries.push({
        rank: entries.length + 1,
        userId: user.id,
        username: user.username,
        displayName: user.displayName ?? user.username,
        avatarUrl: user.avatarUrl,
        team: user.team,
        points: Math.round(row._sum.delta ?? 0),
        rating: r ? Math.round(r.rating) : ELO_START,
        games: row._count._all,
        winRate: r?.games ? Math.round((r.wins / r.games) * 1000) / 10 : 0,
      });
      if (entries.length >= limit) break;
    }
    return { period, game, entries };
  });
}

export async function getMyRating(userId: string, gameId?: string) {
  const game = gameId || OVERALL_GAME;
  const mine = await prisma.userRating.findUnique({
    where: { userId_gameId: { userId, gameId: game } },
    select: { rating: true, peak: true, games: true, wins: true, losses: true, draws: true },
  });
  if (!mine) return { game, rank: null, rating: ELO_START, games: 0 };
  const above = await prisma.userRating.count({
    where: {
      gameId: game,
      games: { gte: 1 },
      rating: { gt: mine.rating },
      user: { deletedAt: null, blockedAt: null, emailVerifiedAt: { not: null } },
    },
  });
  return {
    game,
    rank: mine.games ? above + 1 : null,
    rating: Math.round(mine.rating),
    peak: Math.round(mine.peak),
    games: mine.games,
    wins: mine.wins,
    losses: mine.losses,
    draws: mine.draws,
  };
}
