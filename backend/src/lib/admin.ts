import type { FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { generateSecret, generateURI, verifySync } from "otplib";
import { config } from "../config.js";
import { requireUser } from "./auth.js";
import { AppError } from "./errors.js";
import { hashToken, randomToken } from "./crypto.js";
import { prisma } from "./prisma.js";
import { getRedis } from "./redis.js";

export interface AdminUser {
  id: string;
  role: string;
}

export type StaffRole = "admin" | "moderator";

const SESSION_TTL_SECONDS = 45 * 60;
const FAIL_LIMIT = 10;
const FAIL_WINDOW_SECONDS = 10 * 60;
const sessionKey = (token: string) => `admin:sess:${hashToken(token)}`;
const failKey = (userId: string) => `admin:totp-fail:${userId}`;

async function checkTotp(userId: string, secret: string, token: string): Promise<boolean> {
  if (!token) return false;
  const redis = await getRedis();
  const fails = Number((await redis.get(failKey(userId))) ?? 0);
  if (fails >= FAIL_LIMIT) throw new AppError("RATE_LIMITED");
  const ok = verifySync({ token, secret }).valid;
  if (!ok) {
    const count = await redis.incr(failKey(userId));
    if (count === 1) await redis.expire(failKey(userId), FAIL_WINDOW_SECONDS);
  }
  return ok;
}

/**
 * Staff gate. Accepts either a short-lived admin session (X-Admin-Session, issued once
 * after a TOTP check — so the panel doesn't break every 30 seconds) or a TOTP code (X-Admin-TOTP).
 * Moderators only pass where `allow` includes "moderator".
 */
export async function requireAdminTotp(
  request: FastifyRequest,
  allow: StaffRole[] = ["admin"],
): Promise<AdminUser> {
  const user = requireUser(request);
  if (!allow.includes(user.role as StaffRole)) throw new AppError("FORBIDDEN");

  const session = String(request.headers["x-admin-session"] ?? "");
  if (session) {
    const redis = await getRedis();
    const owner = await redis.get(sessionKey(session));
    if (owner === user.id) {
      await redis.expire(sessionKey(session), SESSION_TTL_SECONDS);
      return { id: user.id, role: user.role };
    }
    if (!request.headers["x-admin-totp"]) {
      throw new AppError("FORBIDDEN", { details: [{ rule: "admin_session_expired" }] });
    }
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { adminTotpSecret: true, adminTotpEnabled: true },
  });
  if (!record?.adminTotpEnabled || !record.adminTotpSecret) {
    throw new AppError("FORBIDDEN", { details: [{ rule: "totp_not_enabled" }] });
  }
  const token = String(request.headers["x-admin-totp"] ?? "");
  if (!(await checkTotp(user.id, record.adminTotpSecret, token))) {
    throw new AppError("FORBIDDEN", { details: [{ rule: "invalid_totp" }] });
  }
  return { id: user.id, role: user.role };
}

/** One TOTP check → a 45-minute (sliding) admin session token. Each code works once. */
export async function createAdminSession(userId: string, token: string) {
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: { adminTotpSecret: true, adminTotpEnabled: true },
  });
  if (!record?.adminTotpEnabled || !record.adminTotpSecret) {
    throw new AppError("FORBIDDEN", { details: [{ rule: "totp_not_enabled" }] });
  }
  const redis = await getRedis();
  const used = await redis.set(`admin:totp-used:${userId}:${token}`, "1", "EX", 120, "NX");
  if (used !== "OK" || !(await checkTotp(userId, record.adminTotpSecret, token))) {
    throw new AppError("FORBIDDEN", { details: [{ rule: "invalid_totp" }] });
  }
  await redis.del(failKey(userId));
  const session = randomToken(32);
  await redis.set(sessionKey(session), userId, "EX", SESSION_TTL_SECONDS);
  return { session, expiresIn: SESSION_TTL_SECONDS };
}

export async function endAdminSession(token: string) {
  if (!token) return;
  const redis = await getRedis();
  await redis.del(sessionKey(token));
}

export async function setupAdminTotp(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("NOT_FOUND");
  if (user.adminTotpEnabled) throw new AppError("CONFLICT", { message: "TOTP already enabled" });
  const secret = generateSecret();
  await prisma.user.update({ where: { id: userId }, data: { adminTotpSecret: secret } });
  const otpauthUrl = generateURI({
    strategy: "totp",
    issuer: config.ADMIN_TOTP_ISSUER,
    label: user.email,
    secret,
  });
  return { secret, otpauthUrl };
}

export async function enableAdminTotp(userId: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { adminTotpSecret: true },
  });
  if (!user?.adminTotpSecret) throw new AppError("CONFLICT", { message: "Run setup first" });
  if (!verifySync({ token, secret: user.adminTotpSecret }).valid) {
    throw new AppError("FORBIDDEN", { details: [{ rule: "invalid_totp" }] });
  }
  await prisma.user.update({ where: { id: userId }, data: { adminTotpEnabled: true } });
  return { ok: true };
}

export async function audit(
  adminId: string,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      adminId,
      action,
      entity,
      entityId,
      before: (before ?? null) as Prisma.InputJsonValue,
      after: (after ?? null) as Prisma.InputJsonValue,
    },
  });
}
