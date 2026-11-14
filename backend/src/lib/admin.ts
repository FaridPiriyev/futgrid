import type { FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import { generateSecret, generateURI, verifySync } from "otplib";
import { config } from "../config.js";
import { requireUser } from "./auth.js";
import { AppError } from "./errors.js";
import { prisma } from "./prisma.js";

export interface AdminUser {
  id: string;
  role: string;
}

export async function requireAdminTotp(request: FastifyRequest): Promise<AdminUser> {
  const user = requireUser(request);
  if (user.role !== "admin") throw new AppError("FORBIDDEN");
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { adminTotpSecret: true, adminTotpEnabled: true },
  });
  if (!record?.adminTotpEnabled || !record.adminTotpSecret) {
    throw new AppError("FORBIDDEN", { details: [{ rule: "totp_not_enabled" }] });
  }
  const token = String(request.headers["x-admin-totp"] ?? "");
  if (!token || !verifySync({ token, secret: record.adminTotpSecret }).valid) {
    throw new AppError("FORBIDDEN", { details: [{ rule: "invalid_totp" }] });
  }
  return { id: user.id, role: user.role };
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
