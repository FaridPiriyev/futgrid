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
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted+${suffix}@futgrid.invalid`,
        username: `deleted_${suffix}`,
        passwordHash: null,
        displayName: "Deleted user",
        teamId: null,
        deletedAt: new Date(),
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
