import { prisma } from "../../lib/prisma.js";
import { getRedis } from "../../lib/redis.js";
import { AppError } from "../../lib/errors.js";
import { ELO_MIN_GAMES, OVERALL_GAME } from "../duel/rating.js";
import { getAchievements } from "../achievements/service.js";

/** Socket connections refresh this zset; a user counts as online for PRESENCE_MS after the last beat. */
export const PRESENCE_KEY = "presence:users";
export const PRESENCE_MS = 70_000;

export async function touchPresence(userId: string): Promise<void> {
  const redis = await getRedis();
  await redis.zadd(PRESENCE_KEY, Date.now(), userId);
}

export async function onlineSet(userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const redis = await getRedis();
  const scores = await redis.zmscore(PRESENCE_KEY, ...userIds);
  const cutoff = Date.now() - PRESENCE_MS;
  return new Set(userIds.filter((_, i) => Number(scores[i] ?? 0) > cutoff));
}

const publicUser = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  createdAt: true,
  blockedAt: true,
  deletedAt: true,
  emailVerifiedAt: true,
  team: { select: { id: true, name: true, slug: true, logoUrl: true } },
} as const;

async function findPublicUser(username: string) {
  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: publicUser,
  });
  if (!user || user.deletedAt || user.blockedAt) throw new AppError("NOT_FOUND");
  return user;
}

export type FriendStatus = "none" | "friends" | "outgoing" | "incoming" | "self";

async function relation(meId: string | undefined, otherId: string) {
  if (!meId) return { status: "none" as FriendStatus, row: null };
  if (meId === otherId) return { status: "self" as FriendStatus, row: null };
  const row = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: meId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: meId },
      ],
    },
  });
  if (!row) return { status: "none" as FriendStatus, row };
  if (row.status === "accepted") return { status: "friends" as FriendStatus, row };
  return { status: (row.requesterId === meId ? "outgoing" : "incoming") as FriendStatus, row };
}

/** Public profile card shown from leaderboards and duels. No email, no ids of other people. */
export async function getPublicProfile(username: string, viewerId?: string) {
  const user = await findPublicUser(username);
  const [stats, ratings, recent, friend, online, friendCount, achievements] = await Promise.all([
    prisma.userGameStats.findMany({
      where: { userId: user.id },
      select: { gameId: true, played: true, wins: true, totalPoints: true, bestStreak: true },
    }),
    prisma.userRating.findMany({
      where: { userId: user.id },
      select: { gameId: true, rating: true, peak: true, games: true, wins: true, losses: true, draws: true },
      orderBy: { rating: "desc" },
    }),
    prisma.duelMatch.findMany({
      where: { playerIds: { has: user.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { gameId: true, winnerId: true, loserId: true, createdAt: true, rated: true },
    }),
    relation(viewerId, user.id),
    onlineSet([user.id]),
    prisma.friendship.count({
      where: { status: "accepted", OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
    }),
    getAchievements(user.id),
  ]);

  const totals = stats.reduce(
    (acc, row) => ({
      games: acc.games + row.played,
      wins: acc.wins + row.wins,
      points: acc.points + row.totalPoints,
    }),
    { games: 0, wins: 0, points: 0 },
  );
  const favorite = [...stats].sort((a, b) => b.played - a.played)[0]?.gameId ?? null;
  const overall = ratings.find((row) => row.gameId === OVERALL_GAME) ?? null;

  return {
    username: user.username,
    displayName: user.displayName ?? user.username,
    avatarUrl: user.avatarUrl,
    team: user.team,
    memberSince: user.createdAt,
    online: online.has(user.id),
    friendStatus: friend.status,
    friendCount,
    totals: {
      games: totals.games,
      wins: totals.wins,
      points: Math.round(totals.points * 10) / 10,
      winRate: totals.games ? Math.round((totals.wins / totals.games) * 1000) / 10 : 0,
    },
    favoriteGame: favorite,
    duel: overall
      ? {
          rating: Math.round(overall.rating),
          peak: Math.round(overall.peak),
          games: overall.games,
          wins: overall.wins,
          losses: overall.losses,
          draws: overall.draws,
          provisional: overall.games < ELO_MIN_GAMES,
        }
      : null,
    ratings: ratings
      .filter((row) => row.gameId !== OVERALL_GAME)
      .map((row) => ({ gameId: row.gameId, rating: Math.round(row.rating), games: row.games })),
    achievements,
    recent: recent.map((match) => ({
      gameId: match.gameId,
      result: match.winnerId === user.id ? "win" : match.loserId === user.id ? "loss" : "draw",
      at: match.createdAt,
    })),
  };
}

export async function listFriends(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: {
      requester: { select: publicUser },
      addressee: { select: publicUser },
    },
    orderBy: { updatedAt: "desc" },
  });
  const others = rows.map((row) => (row.requesterId === userId ? row.addressee : row.requester));
  const online = await onlineSet(others.map((user) => user.id));
  const card = (user: (typeof others)[number]) => ({
    username: user.username,
    displayName: user.displayName ?? user.username,
    avatarUrl: user.avatarUrl,
    online: online.has(user.id),
  });
  type Card = ReturnType<typeof card>;
  const friends: Card[] = [];
  const incoming: Card[] = [];
  const outgoing: Card[] = [];
  for (const row of rows) {
    const other = row.requesterId === userId ? row.addressee : row.requester;
    if (other.deletedAt || other.blockedAt) continue;
    if (row.status === "accepted") friends.push(card(other));
    else if (row.addresseeId === userId) incoming.push(card(other));
    else outgoing.push(card(other));
  }
  friends.sort((a, b) => Number(b.online) - Number(a.online));
  return { friends, incoming, outgoing };
}

const MAX_FRIENDS = 300;

/** Sends a request, or accepts it when the other side already asked. */
export async function requestFriend(
  userId: string,
  username: string,
): Promise<{ status: FriendStatus; notifyUserId?: string }> {
  const other = await findPublicUser(username);
  if (other.id === userId) throw new AppError("VALIDATION_FAILED", { message: "Cannot befriend yourself" });
  const { status, row } = await relation(userId, other.id);
  if (status === "friends" || status === "outgoing") return { status };
  if (status === "incoming" && row) {
    await prisma.friendship.update({ where: { id: row.id }, data: { status: "accepted" } });
    return { status: "friends" };
  }
  const count = await prisma.friendship.count({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
  });
  if (count >= MAX_FRIENDS) throw new AppError("RATE_LIMITED", { message: "Friend limit reached" });
  await prisma.friendship.create({ data: { requesterId: userId, addresseeId: other.id } });
  return { status: "outgoing", notifyUserId: other.id };
}

export async function removeFriend(userId: string, username: string) {
  const other = await findPublicUser(username);
  const { row } = await relation(userId, other.id);
  if (row) await prisma.friendship.delete({ where: { id: row.id } });
  return { status: "none" as FriendStatus };
}

/** Returns the friend's id when `userId` and `username` are accepted friends. */
export async function friendIdIfAccepted(userId: string, username: string): Promise<string | null> {
  const other = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, deletedAt: null, blockedAt: null },
    select: { id: true },
  });
  if (!other) return null;
  const { status } = await relation(userId, other.id);
  return status === "friends" ? other.id : null;
}
