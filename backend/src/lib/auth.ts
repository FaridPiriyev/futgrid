import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { AppError } from "./errors.js";
import { parseLocale } from "./i18n.js";
import { isUuid, verifyAccessToken } from "./crypto.js";
import { prisma } from "./prisma.js";

export const ACCESS_COOKIE = "futgrid_access";
export const REFRESH_COOKIE = "futgrid_refresh";

export interface SessionUser {
  id: string;
  role: string;
  locale: string;
}

export async function resolveIdentity(request: FastifyRequest): Promise<void> {
  const headerLocale = parseLocale(request.headers["accept-language"] as string | undefined);
  request.identity = {
    locale: headerLocale,
    transport: "anonymous",
  };

  const bearer = request.headers.authorization?.startsWith("Bearer ")
    ? request.headers.authorization.slice("Bearer ".length)
    : null;
  const cookieToken = request.cookies[ACCESS_COOKIE];
  const token = bearer ?? cookieToken ?? null;

  if (token) {
    const claims = await verifyAccessToken(token);
    if (claims) {
      const user = await prisma.user.findUnique({
        where: { id: claims.sub },
        select: { id: true, role: true, locale: true, blockedAt: true, deletedAt: true },
      });
      if (user && user.deletedAt) throw new AppError("ACCOUNT_DELETED");
      if (user && user.blockedAt) throw new AppError("ACCOUNT_BLOCKED");
      if (user) {
        request.identity = {
          userId: user.id,
          role: user.role,
          locale: parseLocale(user.locale),
          transport: bearer ? "bearer" : "cookie",
        };
      }
    }
  }

  if (!request.identity.userId) {
    const guestHeader = request.headers["x-guest-id"];
    const guest = Array.isArray(guestHeader) ? guestHeader[0] : guestHeader;
    if (guest && isUuid(guest)) {
      request.identity.guestId = guest;
      request.identity.transport = "guest";
    }
  }
}

export function requireUser(request: FastifyRequest): SessionUser {
  if (!request.identity?.userId) throw new AppError("UNAUTHENTICATED");
  return {
    id: request.identity.userId,
    role: request.identity.role ?? "user",
    locale: request.identity.locale,
  };
}

export function requireAdmin(request: FastifyRequest): SessionUser {
  const user = requireUser(request);
  if (user.role !== "admin" && user.role !== "moderator") throw new AppError("FORBIDDEN");
  return user;
}

export function requirePlayer(request: FastifyRequest): { userId?: string; guestId?: string } {
  if (request.identity?.userId) return { userId: request.identity.userId };
  if (request.identity?.guestId) return { guestId: request.identity.guestId };
  throw new AppError("UNAUTHENTICATED", {
    message: "Authentication or X-Guest-Id header required",
  });
}

export function assertCsrf(request: FastifyRequest): void {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return;
  if (request.identity?.transport !== "cookie") return;
  const origin = request.headers.origin;
  if (!origin || !config.corsOrigins.includes(origin)) {
    throw new AppError("FORBIDDEN", { message: "Invalid origin" });
  }
}

export function setAuthCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const common = {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "lax" as const,
    path: "/",
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };
  reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
    ...common,
    maxAge: config.ACCESS_TOKEN_TTL_MINUTES * 60,
  });
  reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...common,
    path: "/v1/auth",
    maxAge: config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  const common = {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "lax" as const,
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };
  reply.clearCookie(ACCESS_COOKIE, { ...common, path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { ...common, path: "/v1/auth" });
}

export function isMobileClient(request: FastifyRequest): boolean {
  return String(request.headers["x-client"] ?? "").toLowerCase() === "mobile";
}
