import type { FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { ensureGames } from "../../lib/games.js";
import { hashPassword, verifyPassword } from "../../lib/crypto.js";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { publishObject } from "../../lib/storage.js";
import type { ImportGuestInput } from "./schemas.js";

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      teamId: true,
      locale: true,
      role: true,
      emailVerifiedAt: true,
      ageConfirmedAt: true,
      createdAt: true,
      team: { select: { id: true, name: true, slug: true, logoUrl: true } },
      settings: { select: { gameKey: true, settings: true, updatedAt: true } },
      stats: {
        orderBy: { gameId: "asc" },
        select: {
          gameId: true,
          played: true,
          wins: true,
          bestScore: true,
          totalPoints: true,
          currentStreak: true,
          bestStreak: true,
          lastPlayedAt: true,
        },
      },
    },
  });
  if (!user) throw new AppError("NOT_FOUND");
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    team: user.team,
    locale: user.locale,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    ageConfirmed: Boolean(user.ageConfirmedAt),
    createdAt: user.createdAt.toISOString(),
    settings: Object.fromEntries(user.settings.map((row) => [row.gameKey, row.settings])),
    stats: user.stats.map((row) => ({
      ...row,
      totalPoints: Math.round(row.totalPoints * 1000) / 1000,
      bestScore: Math.round(row.bestScore * 1000) / 1000,
      lastPlayedAt: row.lastPlayedAt?.toISOString() ?? null,
    })),
    records: Object.fromEntries(user.stats.map((row) => [row.gameId, row.bestScore])),
  };
}

export async function updateMe(
  userId: string,
  input: { displayName?: string | null; teamId?: number | null; locale?: string },
) {
  if (input.teamId !== undefined && input.teamId !== null) {
    const team = await prisma.team.findUnique({ where: { id: input.teamId } });
    if (!team) {
      throw new AppError("VALIDATION_FAILED", {
        details: [{ field: "teamId", rule: "team_not_found" }],
      });
    }
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.teamId !== undefined ? { teamId: input.teamId } : {}),
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      teamId: true,
      locale: true,
      role: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
  return {
    ...user,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt.toISOString(),
  };
}

export async function putSettings(userId: string, gameKey: string, settings: Record<string, unknown>) {
  const serialized = JSON.stringify(settings);
  if (serialized.length > 16_384) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "settings", rule: "too_large" }],
    });
  }
  await prisma.userSetting.upsert({
    where: { userId_gameKey: { userId, gameKey } },
    update: { settings: settings as unknown as Prisma.InputJsonValue },
    create: { userId, gameKey, settings: settings as unknown as Prisma.InputJsonValue },
  });
  return { ok: true, gameKey, settings };
}

export async function importGuest(
  userId: string,
  input: ImportGuestInput,
  request: FastifyRequest,
) {
  const guestId = input.guestId ?? request.identity.guestId;
  if (!guestId) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "guestId", rule: "required" }],
    });
  }
  const existing = await prisma.guestLink.findUnique({ where: { guestId } });
  if (existing) throw new AppError("GUEST_IMPORTED");

  await ensureGames();
  const imported = await prisma.$transaction(async (tx) => {
    await tx.guestLink.create({ data: { guestId, userId } });
    for (const record of input.records) {
      const current = await tx.userGameStats.findUnique({
        where: { userId_gameId: { userId, gameId: record.gameKey } },
      });
      await tx.userGameStats.upsert({
        where: { userId_gameId: { userId, gameId: record.gameKey } },
        update: {
          played: Math.max(current?.played ?? 0, record.played),
          wins: Math.max(current?.wins ?? 0, record.wins),
          bestScore: Math.max(current?.bestScore ?? 0, record.bestScore),
          bestStreak: Math.max(current?.bestStreak ?? 0, record.bestStreak),
          lastPlayedAt: record.lastPlayedAt ?? current?.lastPlayedAt ?? null,
        },
        create: {
          userId,
          gameId: record.gameKey,
          played: record.played,
          wins: record.wins,
          bestScore: record.bestScore,
          bestStreak: record.bestStreak,
          lastPlayedAt: record.lastPlayedAt ?? null,
          totalPoints: 0,
        },
      });
    }
    return input.records.length;
  });
  return { ok: true, imported, rankedPointsAwarded: 0 };
}

export async function exportMe(userId: string) {
  const [user, settings, stats, ledger, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        teamId: true,
        locale: true,
        role: true,
        emailVerifiedAt: true,
        ageConfirmedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.userSetting.findMany({ where: { userId } }),
    prisma.userGameStats.findMany({ where: { userId } }),
    prisma.pointsLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.gameSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5000,
      select: {
        id: true,
        gameId: true,
        mode: true,
        difficulty: true,
        score: true,
        points: true,
        flagged: true,
        startedAt: true,
        finishedAt: true,
      },
    }),
  ]);
  if (!user) throw new AppError("NOT_FOUND");
  return {
    exportedAt: new Date().toISOString(),
    user: {
      ...user,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      ageConfirmedAt: user.ageConfirmedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    settings: settings.map((row) => ({
      gameKey: row.gameKey,
      settings: row.settings,
      updatedAt: row.updatedAt.toISOString(),
    })),
    stats,
    pointsLedger: ledger.map((row) => ({ ...row, id: row.id.toString() })),
    sessions: sessions.map((row) => ({
      ...row,
      startedAt: row.startedAt.toISOString(),
      finishedAt: row.finishedAt?.toISOString() ?? null,
    })),
  };
}

export async function deleteMe(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("NOT_FOUND");
  const suffix = userId.slice(0, 8);
  await prisma.$transaction([
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),

    prisma.oAuthAccount.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted+${suffix}@futgrid.invalid`,
        username: `deleted_${suffix}`,
        passwordHash: null,
        displayName: "Deleted user",
        teamId: null,
        deletedAt: new Date(),
        avatarUrl: null,
      },
    }),
  ]);
}

export async function registerPushToken(
  userId: string,
  token: string,
  platform: string,
): Promise<void> {
  await prisma.pushToken.upsert({
    where: { token },
    update: { userId, platform, enabled: true },
    create: { userId, token, platform },
  });
}

export async function deletePushToken(userId: string, token: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { userId, token } });
}

export async function getMyRatings(userId: string) {
  const ratings = await prisma.userRating.findMany({
    where: { userId },
    orderBy: { rating: "desc" },
  });
  return { entries: ratings };
}

export async function getMyDuels(userId: string, limit = 20) {
  const matches = await prisma.duelMatch.findMany({
    where: { playerIds: { has: userId } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return { entries: matches };
}

export async function changeUsername(userId: string, username: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing && existing.id !== userId) throw new AppError("USERNAME_TAKEN");
  const user = await prisma.user.update({
    where: { id: userId },
    data: { username },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      locale: true,
      role: true,
      createdAt: true,
    },
  });
  return { ...user, createdAt: user.createdAt.toISOString() };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) throw new AppError("INVALID_CREDENTIALS");
  const ok = await verifyPassword(user.passwordHash, currentPassword);
  if (!ok) throw new AppError("INVALID_CREDENTIALS");
  if (await verifyPassword(user.passwordHash, newPassword)) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "newPassword", rule: "same_as_current" }],
    });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() },
  });
}

export async function setAvatar(
  userId: string,
  buffer: Buffer,
  mimetype: string,
): Promise<{ avatarUrl: string }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimetype)) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "avatar", rule: "unsupported_image_type" }],
    });
  }
  if (buffer.length > 5_000_000) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "avatar", rule: "image_too_large" }],
    });
  }
  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: 512, height: 512, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  const hash = createHash("sha256").update(webp).digest("hex").slice(0, 20);
  const key = `avatars/${userId}-${hash}.webp`;
  const published = await publishObject("media", key, webp, "image/webp");
  await prisma.media.create({
    data: {
      entityType: "user",
      entityId: userId,
      kind: "avatar",
      sourceUrl: "upload",
      hash,
      urls: { original: published.url, local: published.localPath },
      status: "ready",
    },
  });
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: published.url } });
  return { avatarUrl: published.url };
}

export async function clearAvatar(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
}

type HistoryResult = "win" | "loss" | "draw";

interface StoredRatingChange {
  delta?: number;
  after?: number;
  result?: "wins" | "losses" | "draws";
}

interface StoredScore {
  scores?: Record<string, number> | null;
  strength?: Record<string, { total?: number }> | null;
  seats?: string[];
  winnerSeat?: string | null;
  loserSeat?: string | null;
}

/** Duel nəticəsi istifadəçinin baxışından. Köhnə yazılarda seat yoxdur — ID-lərə baxırıq. */
function duelResultFor(
  userId: string,
  match: { winnerId: string | null; loserId: string | null; endedReason: string; playerIds: string[] },
  score: StoredScore,
  change: StoredRatingChange | undefined,
): HistoryResult {
  if (change?.result) return change.result === "wins" ? "win" : change.result === "losses" ? "loss" : "draw";
  const index = match.playerIds.indexOf(userId);
  const seat = index >= 0 ? score.seats?.[index] : undefined;
  if (seat && score.seats) {
    if (score.winnerSeat === seat) return "win";
    if (score.loserSeat === seat || score.winnerSeat) return "loss";
    return "draw";
  }
  if (match.winnerId === userId) return "win";
  if (match.loserId === userId || match.winnerId) return "loss";
  return "draw";
}

export async function getMyHistory(
  userId: string,
  options: { type: "all" | "duel" | "solo"; limit: number; before?: Date },
) {
  const { type, limit, before } = options;
  const [duels, solos] = await Promise.all([
    type === "solo"
      ? []
      : prisma.duelMatch.findMany({
          where: { playerIds: { has: userId }, ...(before ? { createdAt: { lt: before } } : {}) },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
    type === "duel"
      ? []
      : prisma.gameSession.findMany({
          where: {
            userId,
            status: "finished",
            ...(before ? { finishedAt: { lt: before } } : {}),
          },
          orderBy: { finishedAt: "desc" },
          take: limit,
          select: {
            id: true,
            gameId: true,
            mode: true,
            difficulty: true,
            score: true,
            points: true,
            flagged: true,
            startedAt: true,
            finishedAt: true,
          },
        }),
  ]);

  const opponentIds = new Set<string>();
  for (const match of duels) for (const id of match.playerIds) if (id !== userId) opponentIds.add(id);
  const people = opponentIds.size
    ? await prisma.user.findMany({
        where: { id: { in: [...opponentIds] } },
        select: { id: true, username: true, displayName: true, avatarUrl: true, deletedAt: true },
      })
    : [];
  const personById = new Map(people.map((person) => [person.id, person]));

  const items = [
    ...duels.map((match) => {
      const score = (match.score ?? {}) as unknown as StoredScore;
      const changes = (match.ratingChanges ?? {}) as unknown as { players?: Record<string, StoredRatingChange> };
      const change = changes.players?.[userId];
      const index = match.playerIds.indexOf(userId);
      const seats = score.seats ?? [];
      const mySeat = seats[index];
      const opponents = match.playerIds
        .map((id, i) => ({ id, seat: seats[i] }))
        .filter((entry) => entry.id !== userId)
        .map((entry) => {
          const person = personById.get(entry.id);
          const entryScore =
            entry.seat && score.scores ? (score.scores[entry.seat] ?? null) : null;
          if (!person) return { username: null, displayName: null, avatarUrl: null, guest: true, deleted: false, score: entryScore };
          return {
            username: person.deletedAt ? null : person.username,
            displayName: person.deletedAt ? "Deleted user" : (person.displayName ?? person.username),
            avatarUrl: person.deletedAt ? null : person.avatarUrl,
            guest: false,
            deleted: Boolean(person.deletedAt),
            score: entryScore,
          };
        });
      return {
        kind: "duel" as const,
        id: match.id,
        gameId: match.gameId,
        at: match.createdAt.toISOString(),
        result: duelResultFor(userId, match, score, change),
        endedReason: match.endedReason,
        durationMs: match.durationMs,
        myScore: mySeat && score.scores ? (score.scores[mySeat] ?? null) : null,
        opponents,
        rated: match.rated,
        ratingDelta: change?.delta ?? null,
        ratingAfter: change?.after ?? null,
      };
    }),
    ...solos.map((session) => ({
      kind: "solo" as const,
      id: session.id,
      gameId: session.gameId,
      at: (session.finishedAt ?? session.startedAt).toISOString(),
      mode: session.mode,
      difficulty: session.difficulty,
      score: session.score,
      points: session.points ?? 0,
      flagged: session.flagged,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, limit);

  const ratings = await prisma.userRating.findMany({
    where: { userId },
    orderBy: { rating: "desc" },
    select: { gameId: true, rating: true, peak: true, games: true, wins: true, losses: true, draws: true },
  });
  const [duelCount, soloCount] = await Promise.all([
    prisma.duelMatch.count({ where: { playerIds: { has: userId } } }),
    prisma.gameSession.count({ where: { userId, status: "finished" } }),
  ]);

  return {
    entries: items,
    nextBefore: items.length === limit ? items[items.length - 1]!.at : null,
    summary: {
      duels: duelCount,
      solo: soloCount,
      overall: ratings.find((row) => row.gameId === "overall") ?? null,
      games: ratings.filter((row) => row.gameId !== "overall"),
    },
  };
}
