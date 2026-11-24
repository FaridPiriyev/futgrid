import type { FastifyRequest } from "fastify";
import type { User } from "@prisma/client";
import { config } from "../../config.js";
import { addDays } from "../../lib/time.js";
import {
  hashIp,
  hashPassword,
  hashToken,
  randomToken,
  signAccessToken,
  verifyPassword,
} from "../../lib/crypto.js";
import { AppError } from "../../lib/errors.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../lib/mail.js";
import { logger } from "../../lib/logger.js";
import { enforceScopedLimit, rateLimitKey } from "../../lib/rate-limit.js";
import { parseLocale, type Locale } from "../../lib/i18n.js";
import { prisma } from "../../lib/prisma.js";
import type { LoginInput, RegisterInput } from "./schemas.js";

const PROHIBITED_USERNAMES = new Set([
  "admin",
  "administrator",
  "futgrid",
  "support",
  "moderator",
  "root",
  "fuck",
  "shit",
  "sex",
]);

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  teamId: number | null;
  locale: string;
  role: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    teamId: user.teamId,
    locale: user.locale,
    role: user.role,
    avatarUrl: user.avatarUrl,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt.toISOString(),
  };
}

async function createVerificationToken(user: User, locale: Locale): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.emailToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), type: "verify", expiresAt },
  });
  try {
    await sendVerificationEmail(user.email, locale, token);
  } catch (error) {
    logger.error({ err: error, userId: user.id }, "failed to send verification email");
  }
}

export async function register(input: RegisterInput, request: FastifyRequest): Promise<PublicUser> {
  await enforceScopedLimit(rateLimitKey("register:ip", request.ip), 30, 60 * 60);
  await enforceScopedLimit(rateLimitKey("register:email", input.email), 5, 60 * 60);

  if (PROHIBITED_USERNAMES.has(input.username.toLowerCase())) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "username", rule: "prohibited" }],
    });
  }

  const username = input.username.trim();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing?.email === input.email) throw new AppError("EMAIL_TAKEN");
  if (existing?.username === username) throw new AppError("USERNAME_TAKEN");

  if (input.teamId) {
    const team = await prisma.team.findUnique({ where: { id: input.teamId } });
    if (!team) {
      throw new AppError("VALIDATION_FAILED", {
        details: [{ field: "teamId", rule: "team_not_found" }],
      });
    }
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      username,
      passwordHash,
      displayName: input.displayName ?? null,
      teamId: input.teamId ?? null,
      locale: input.locale,
      ageConfirmedAt: input.ageConfirmed ? new Date() : null,
    },
  });

  await createVerificationToken(user, parseLocale(input.locale));
  return toPublicUser(user);
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

async function issueTokens(user: User, request: FastifyRequest): Promise<TokenPair> {
  const accessToken = await signAccessToken(user.id, user.role);
  const refreshToken = randomToken();
  const refreshExpiresAt = addDays(new Date(), config.REFRESH_TOKEN_TTL_DAYS);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt,
      userAgent: String(request.headers["user-agent"] ?? "").slice(0, 300) || null,
      ipHash: hashIp(request.ip),
    },
  });
  return { accessToken, refreshToken, refreshExpiresAt };
}

export async function login(
  input: LoginInput,
  request: FastifyRequest,
): Promise<{ user: User; tokens: TokenPair }> {
  const emailKey = rateLimitKey("login:email", input.email);
  const ipKey = rateLimitKey("login:ip", request.ip);
  await enforceScopedLimit(emailKey, 5, 60);
  await enforceScopedLimit(ipKey, 20, 60 * 60);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user?.passwordHash) throw new AppError("INVALID_CREDENTIALS");
  if (user.deletedAt) throw new AppError("ACCOUNT_DELETED");
  if (user.blockedAt) throw new AppError("ACCOUNT_BLOCKED");

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw new AppError("INVALID_CREDENTIALS");
  if (!user.emailVerifiedAt) throw new AppError("EMAIL_NOT_VERIFIED");

  return { user, tokens: await issueTokens(user, request) };
}

export async function refresh(
  rawToken: string | undefined,
  request: FastifyRequest,
): Promise<{ user: User; tokens: TokenPair }> {
  if (!rawToken) throw new AppError("UNAUTHENTICATED");
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!stored) throw new AppError("TOKEN_INVALID");

  if (stored.revokedAt) {
    // Multi-tab race: a token rotated milliseconds ago in another tab is not theft.
    // Güzəşt YALNIZ yeni tokenlə əvəzlənmiş (rotasiya olunmuş) token üçündür.
    // Logout, "bütün cihazlardan çıx", şifrə sıfırlama və s. tokeni replacedByTokenHash
    // olmadan ləğv edir — belə tokenlə yenidən sessiya almaq olmaz.
    const graceMs = 30_000;
    const withinGrace = Date.now() - stored.revokedAt.getTime() <= graceMs;
    const replacement =
      withinGrace && stored.replacedByTokenHash
        ? await prisma.refreshToken.findUnique({ where: { tokenHash: stored.replacedByTokenHash } })
        : null;
    // Əvəz edən token hələ aktivdirsə (və ya o da sadəcə rotasiya olunubsa) — bu, çox tab yarışıdır.
    const rotationOnly =
      replacement && (!replacement.revokedAt || Boolean(replacement.replacedByTokenHash));
    if (
      rotationOnly &&
      stored.expiresAt.getTime() > Date.now() &&
      !stored.user.deletedAt &&
      !stored.user.blockedAt
    ) {
      const accessToken = await signAccessToken(stored.user.id, stored.user.role);
      const replacement = randomToken();
      const replacementHash = hashToken(replacement);
      const replacementExpiresAt = addDays(new Date(), config.REFRESH_TOKEN_TTL_DAYS);
      await prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: replacementHash,
          expiresAt: replacementExpiresAt,
          userAgent: String(request.headers["user-agent"] ?? "").slice(0, 300) || null,
          ipHash: hashIp(request.ip),
        },
      });
      return {
        user: stored.user,
        tokens: {
          accessToken,
          refreshToken: replacement,
          refreshExpiresAt: replacementExpiresAt,
        },
      };
    }
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError("TOKEN_INVALID");
  }

  if (stored.expiresAt.getTime() <= Date.now()) throw new AppError("TOKEN_INVALID");
  if (stored.user.deletedAt) throw new AppError("ACCOUNT_DELETED");
  if (stored.user.blockedAt) throw new AppError("ACCOUNT_BLOCKED");

  const accessToken = await signAccessToken(stored.user.id, stored.user.role);
  const nextToken = randomToken();
  const nextHash = hashToken(nextToken);
  const nextExpiresAt = addDays(new Date(), config.REFRESH_TOKEN_TTL_DAYS);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenHash: nextHash },
    }),
    prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: nextHash,
        expiresAt: nextExpiresAt,
        userAgent: String(request.headers["user-agent"] ?? "").slice(0, 300) || null,
        ipHash: hashIp(request.ip),
      },
    }),
  ]);

  return {
    user: stored.user,
    tokens: { accessToken, refreshToken: nextToken, refreshExpiresAt: nextExpiresAt },
  };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !record ||
    record.type !== "verify" ||
    record.usedAt ||
    record.expiresAt.getTime() <= Date.now()
  ) {
    throw new AppError("TOKEN_INVALID");
  }
  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);
}

export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt || user.blockedAt || user.emailVerifiedAt) return;
  await prisma.emailToken.updateMany({
    where: { userId: user.id, type: "verify", usedAt: null },
    data: { usedAt: new Date() },
  });
  await createVerificationToken(user, parseLocale(user.locale));
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt || user.blockedAt) return;

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.emailToken.updateMany({
      where: { userId: user.id, type: "reset", usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.emailToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), type: "reset", expiresAt },
    }),
  ]);
  try {
    await sendPasswordResetEmail(user.email, parseLocale(user.locale), token);
  } catch (error) {
    logger.error({ err: error, userId: user.id }, "failed to send password reset email");
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !record ||
    record.type !== "reset" ||
    record.usedAt ||
    record.expiresAt.getTime() <= Date.now()
  ) {
    throw new AppError("TOKEN_INVALID");
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function findOrCreateGoogleUser(input: {
  providerAccountId: string;
  email: string;
  name?: string;
}): Promise<User> {
  const existingOauth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: input.providerAccountId,
      },
    },
    include: { user: true },
  });
  if (existingOauth) return existingOauth.user;

  const email = input.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const base =
      email
        .split("@")[0]
        ?.replace(/[^A-Za-z0-9_]/g, "_")
        .slice(0, 14) || "player";
    let username = base;
    let suffix = 0;
    while (await prisma.user.findUnique({ where: { username } })) {
      suffix++;
      username = `${base.slice(0, 14)}_${suffix}`;
    }
    user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: input.name?.slice(0, 40) ?? null,
        emailVerifiedAt: new Date(),
        ageConfirmedAt: new Date(),
        locale: "az",
      },
    });
  }
  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: input.providerAccountId,
      },
    },
    update: { email },
    create: {
      userId: user.id,
      provider: "google",
      providerAccountId: input.providerAccountId,
      email,
    },
  });
  return user;
}

export async function oauthIssueTokens(user: User, request: FastifyRequest): Promise<TokenPair> {
  return issueTokens(user, request);
}

export { createVerificationToken };
