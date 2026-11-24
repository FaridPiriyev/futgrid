import { config } from "../../config.js";
import { cachedJson } from "../../lib/cache.js";
import { prisma } from "../../lib/prisma.js";
import { getRedis } from "../../lib/redis.js";
import {
  addDays,
  isoWeekKey,
  monthKey,
  monthStartBaku,
  weekStartBaku,
} from "../../lib/time.js";

export type LeaderboardPeriod = "week" | "month" | "all";

const TTL = {
  week: 5 * 7 * 24 * 60 * 60,
  month: 3 * 30 * 24 * 60 * 60,
};

export function periodKeys(now = new Date()) {
  return { week: isoWeekKey(now), month: monthKey(now) };
}

export function leaderboardKey(period: LeaderboardPeriod, gameId?: string): string {
  const keys = periodKeys();
  if (period === "all") return gameId ? `lb:all:${gameId}` : "lb:all";
  const base = `lb:${period}:${keys[period]}`;
  return gameId ? `${base}:${gameId}` : base;
}

export function teamLeaderboardKey(period: LeaderboardPeriod): string {
  const keys = periodKeys();
  if (period === "all") return "lb:team:all";
  return `lb:team:${period}:${keys[period]}`;
}

function ttlFor(period: LeaderboardPeriod): number | null {
  return period === "all" ? null : TTL[period];
}

export interface ApplyPointsInput {
  userId: string;
  gameId: string;
  points: number;
  teamId?: number | null;
  at?: Date;
}

export async function applyPoints(input: ApplyPointsInput): Promise<void> {
  if (!(input.points > 0)) return;
  const redis = await getRedis();
  const at = input.at ?? new Date();
  const keys = periodKeys(at);
  const week = `lb:week:${keys.week}`;
  const month = `lb:month:${keys.month}`;
  const multi = redis.multi();
  multi.zincrby(week, input.points, input.userId);
  multi.zincrby(`lb:week:${keys.week}:${input.gameId}`, input.points, input.userId);
  multi.zincrby(month, input.points, input.userId);
  multi.zincrby(`lb:month:${keys.month}:${input.gameId}`, input.points, input.userId);
  multi.zincrby("lb:all", input.points, input.userId);
  multi.zincrby(`lb:all:${input.gameId}`, input.points, input.userId);
  multi.expire(week, TTL.week);
  multi.expire(`lb:week:${keys.week}:${input.gameId}`, TTL.week);
  multi.expire(month, TTL.month);
  multi.expire(`lb:month:${keys.month}:${input.gameId}`, TTL.month);
  if (input.teamId) {
    multi.zincrby(`lb:team:week:${keys.week}`, input.points, String(input.teamId));
    multi.expire(`lb:team:week:${keys.week}`, TTL.week);
    multi.zincrby(`lb:team:month:${keys.month}`, input.points, String(input.teamId));
    multi.expire(`lb:team:month:${keys.month}`, TTL.month);
    multi.zincrby("lb:team:all", input.points, String(input.teamId));
  }
  await multi.exec();
}

function periodStart(period: LeaderboardPeriod, now = new Date()): Date | null {
  if (period === "week") return weekStartBaku(now);
  if (period === "month") return monthStartBaku(now);
  return null;
}

async function rebuild(period: LeaderboardPeriod, gameId?: string): Promise<void> {
  const start = periodStart(period);
  const grouped = await prisma.pointsLedger.groupBy({
    by: ["userId"],
    where: {
      userId: { not: null },
      ...(gameId ? { gameId } : {}),
      ...(start ? { createdAt: { gte: start } } : {}),
    },
    _sum: { points: true },
  });
  const totals = grouped
    .map((row) => ({ userId: row.userId as string, points: row._sum.points ?? 0 }))
    .filter((row) => row.points > 0);
  if (!totals.length) return;

  const validUsers = await prisma.user.findMany({
    where: {
      id: { in: totals.map((row) => row.userId) },
      emailVerifiedAt: { not: null },
      blockedAt: null,
      deletedAt: null,
    },
    select: { id: true },
  });
  const valid = new Set(validUsers.map((user) => user.id));
  const redis = await getRedis();
  const key = leaderboardKey(period, gameId);
  const multi = redis.multi();
  for (const row of totals) {
    if (!valid.has(row.userId)) continue;
    multi.zadd(key, row.points, row.userId);
  }
  const ttl = ttlFor(period);
  if (ttl) multi.expire(key, ttl);
  await multi.exec();
}

export async function removePoints(input: {
  userId: string;
  gameId: string;
  points: number;
  periodWeek: string;
  periodMonth: string;
  teamId?: number | null;
}): Promise<void> {
  if (!(input.points > 0)) return;
  const redis = await getRedis();
  const keys = [
    `lb:week:${input.periodWeek}`,
    `lb:week:${input.periodWeek}:${input.gameId}`,
    `lb:month:${input.periodMonth}`,
    `lb:month:${input.periodMonth}:${input.gameId}`,
    "lb:all",
    `lb:all:${input.gameId}`,
    ...(input.teamId
      ? [
          `lb:team:week:${input.periodWeek}`,
          `lb:team:month:${input.periodMonth}`,
          "lb:team:all",
        ]
      : []),
  ];
  for (const key of keys) {
    const member = input.teamId && key.startsWith("lb:team:") ? String(input.teamId) : input.userId;
    await redis.zincrby(key, -input.points, member);
    const score = Number((await redis.zscore(key, member)) ?? 0);
    if (score <= 0) await redis.zrem(key, member);
  }
}

async function ensureLeaderboard(period: LeaderboardPeriod, gameId?: string): Promise<string> {
  const key = leaderboardKey(period, gameId);
  const redis = await getRedis();
  const size = await redis.zcard(key);
  if (!size) await rebuild(period, gameId);
  return key;
}

interface RawEntry {
  userId: string;
  points: number;
}

async function hydrate(raw: RawEntry[]) {
  if (!raw.length) return [];
  const userIds = raw.map((entry) => entry.userId);
  const [users, stats] = await Promise.all([
    prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      displayName: true,
      deletedAt: true,
      blockedAt: true,
      emailVerifiedAt: true,
      avatarUrl: true,
      team: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
    }),
    prisma.userGameStats.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: { played: true, wins: true, totalPoints: true },
    }),
  ]);
  const byId = new Map(users.map((user) => [user.id, user]));
  const statsById = new Map(
    stats
      .filter((row) => row.userId)
      .map((row) => [
        row.userId as string,
        {
          games: row._sum.played ?? 0,
          wins: row._sum.wins ?? 0,
          totalPoints: row._sum.totalPoints ?? 0,
        },
      ]),
  );
  const entries: {
    rank: number;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    team: (typeof users)[number]["team"] | null;
    points: number;
    games: number;
    wins: number;
    winRate: number;
  }[] = [];
  for (const entry of raw) {
    const user = byId.get(entry.userId);
    if (!user || user.blockedAt || !user.emailVerifiedAt) continue;
    const userStats = statsById.get(user.id);
    entries.push({
      rank: entries.length + 1,
      userId: entry.userId,
      username: user.username,
      displayName: user.deletedAt ? "Deleted user" : (user.displayName ?? user.username),
      avatarUrl: user.deletedAt ? null : user.avatarUrl,
      team: user.team,
      points: Math.round(entry.points * 1000) / 1000,
      games: userStats?.games ?? 0,
      wins: userStats?.wins ?? 0,
      winRate: userStats?.games
        ? Math.round(((userStats.wins / userStats.games) * 1000)) / 10
        : 0,
    });
  }
  return entries;
}

async function readEntries(key: string, start: number, stop: number): Promise<RawEntry[]> {
  const redis = await getRedis();
  const flat = await redis.zrevrange(key, start, stop, "WITHSCORES");
  const entries: RawEntry[] = [];
  for (let index = 0; index < flat.length; index += 2) {
    entries.push({ userId: flat[index] ?? "", points: Number(flat[index + 1] ?? 0) });
  }
  return entries;
}

export async function getLeaderboard(options: {
  period: LeaderboardPeriod;
  gameId?: string;
  limit: number;
  teamId?: number;
}) {
  const cacheKey = `cache:lb:${options.period}:${options.gameId ?? "all"}:${options.limit}:${options.teamId ?? "all"}`;
  return cachedJson(cacheKey, 30, async () => {
    if (options.teamId) return getTeamFilteredLeaderboard(options.period, options.teamId, options.limit);
    const key = await ensureLeaderboard(options.period, options.gameId);
    const raw = await readEntries(key, 0, Math.max(0, options.limit - 1));
    return { period: options.period, game: options.gameId ?? null, entries: await hydrate(raw) };
  });
}

async function getTeamFilteredLeaderboard(period: LeaderboardPeriod, teamId: number, limit: number) {
  const start = periodStart(period);
  const grouped = await prisma.pointsLedger.groupBy({
    by: ["userId"],
    where: {
      userId: { not: null },
      ...(start ? { createdAt: { gte: start } } : {}),
    },
    _sum: { points: true },
  });
  const userIds = grouped.map((row) => row.userId as string).filter(Boolean);
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      teamId,
      emailVerifiedAt: { not: null },
      blockedAt: null,
      deletedAt: null,
    },
    select: { id: true },
  });
  const allowed = new Set(users.map((user) => user.id));
  const totals = grouped
    .filter((row) => row.userId && allowed.has(row.userId))
    .map((row) => ({ userId: row.userId as string, points: row._sum.points ?? 0 }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
  return { period, game: null, entries: await hydrate(totals) };
}

export async function getMyRank(userId: string, period: LeaderboardPeriod, gameId?: string) {
  const key = await ensureLeaderboard(period, gameId);
  const redis = await getRedis();
  const rank = await redis.zrevrank(key, userId);
  if (rank === null) {
    return { period, game: gameId ?? null, rank: null, points: 0, neighbors: [] };
  }
  const points = Number((await redis.zscore(key, userId)) ?? 0);
  const start = Math.max(0, rank - 2);
  const raw = await readEntries(key, start, rank + 2);
  const entries = await hydrate(raw);
  return {
    period,
    game: gameId ?? null,
    rank: rank + 1,
    points: Math.round(points * 1000) / 1000,
    neighbors: entries.map((entry) => ({ ...entry, rank: start + entry.rank })),
  };
}

export async function getTeamLeaderboard(period: LeaderboardPeriod, limit = 10) {
  return cachedJson(`cache:lb:teams:${period}:${limit}`, 30, async () => {
    const start = periodStart(period);
    const grouped = await prisma.pointsLedger.groupBy({
      by: ["userId"],
      where: {
        userId: { not: null },
        ...(start ? { createdAt: { gte: start } } : {}),
      },
      _sum: { points: true },
    });
    const totals = grouped
      .filter((row) => row.userId && (row._sum.points ?? 0) > 0)
      .map((row) => ({ userId: row.userId as string, points: row._sum.points ?? 0 }));
    const users = await prisma.user.findMany({
      where: {
        id: { in: totals.map((row) => row.userId) },
        teamId: { not: null },
        emailVerifiedAt: { not: null },
        blockedAt: null,
        deletedAt: null,
      },
      select: { id: true, teamId: true, team: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
    const byUser = new Map(users.map((user) => [user.id, user]));
    const byTeam = new Map<number, { team: NonNullable<(typeof users)[number]["team"]>; memberPoints: number[] }>();
    for (const row of totals) {
      const user = byUser.get(row.userId);
      if (!user?.team || !user.teamId) continue;
      if (!byTeam.has(user.teamId)) byTeam.set(user.teamId, { team: user.team, memberPoints: [] });
      byTeam.get(user.teamId)?.memberPoints.push(row.points);
    }
    const ranked = [...byTeam.values()]
      .map((item) => ({
        team: item.team,
        points:
          Math.round(
            item.memberPoints
              .sort((a, b) => b - a)
              .slice(0, config.TEAM_LEADERBOARD_TOP)
              .reduce((sum, value) => sum + value, 0) * 1000,
          ) / 1000,
        members: item.memberPoints.length,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((item, index) => ({ rank: index + 1, ...item }));
    return { period, entries: ranked };
  });
}

export async function snapshotPeriod(
  period: LeaderboardPeriod,
  at: Date,
  gameId?: string,
): Promise<void> {
  const keys = periodKeys(at);
  const key =
    period === "all"
      ? gameId
        ? `lb:all:${gameId}`
        : "lb:all"
      : gameId
        ? `lb:${period}:${keys[period]}:${gameId}`
        : `lb:${period}:${keys[period]}`;
  const raw = await readEntries(key, 0, 99);
  if (!raw.length) return;
  const entries = await hydrate(raw);
  await prisma.leaderboardSnapshot.create({
    data: {
      periodType: period,
      periodKey: period === "all" ? "all" : keys[period],
      gameId: gameId ?? null,
      scope: gameId ? "game" : "global",
      entries,
    },
  });
}

export async function runSnapshotSet(
  period: LeaderboardPeriod,
  now = new Date(),
): Promise<void> {
  const previous = addDays(now, -1);
  await snapshotPeriod(period, previous);
  for (const gameId of [
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
  ]) {
    await snapshotPeriod(period, previous, gameId);
  }
}

export async function runSnapshots(now = new Date()): Promise<void> {
  await runSnapshotSet("week", now);
  await runSnapshotSet("month", now);
}

export async function removeUserFromLeaderboards(userId: string): Promise<void> {
  const redis = await getRedis();
  const keys = await redis.keys("lb:*");
  if (!keys.length) return;
  const multi = redis.multi();
  for (const key of keys) multi.zrem(key, userId);
  await multi.exec();
}

export async function getEloLeaderboard(gameId: string, limit: number, minGames: number) {
  const rows = await prisma.userRating.findMany({
    where: {
      gameId,
      games: { gte: minGames },
      user: { deletedAt: null, blockedAt: null },
    },
    orderBy: [{ rating: "desc" }, { games: "desc" }],
    take: limit,
    select: {
      rating: true,
      peak: true,
      games: true,
      wins: true,
      losses: true,
      draws: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          team: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
      },
    },
  });
  return {
    game: gameId,
    minGames,
    entries: rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user.id,
      username: row.user.username,
      displayName: row.user.displayName ?? row.user.username,
      avatarUrl: row.user.avatarUrl,
      team: row.user.team,
      rating: Math.round(row.rating),
      peak: Math.round(row.peak),
      games: row.games,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      winRate: row.games ? Math.round((row.wins / row.games) * 1000) / 10 : 0,
    })),
  };
}

export async function getMyEloRank(userId: string, gameId: string, minGames: number) {
  const mine = await prisma.userRating.findUnique({
    where: { userId_gameId: { userId, gameId } },
    select: { rating: true, peak: true, games: true, wins: true, losses: true, draws: true },
  });
  if (!mine) return { game: gameId, rank: null, rating: null, games: 0, minGames };
  const ranked = mine.games >= minGames;
  const above = ranked
    ? await prisma.userRating.count({
        where: {
          gameId,
          games: { gte: minGames },
          rating: { gt: mine.rating },
          user: { deletedAt: null, blockedAt: null },
        },
      })
    : null;
  return {
    game: gameId,
    rank: above === null ? null : above + 1,
    rating: Math.round(mine.rating),
    peak: Math.round(mine.peak),
    games: mine.games,
    wins: mine.wins,
    losses: mine.losses,
    draws: mine.draws,
    minGames,
  };
}
