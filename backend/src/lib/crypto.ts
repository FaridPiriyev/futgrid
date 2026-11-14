import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";

const jwtSecret = new TextEncoder().encode(config.JWT_ACCESS_SECRET);

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(`${config.TOKEN_PEPPER}:${token}`).digest("hex");
}

export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${config.IP_HASH_SALT}:${ip}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export interface AccessClaims {
  sub: string;
  role: string;
  type: "access";
}

export async function signAccessToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ role, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${config.ACCESS_TOKEN_TTL_MINUTES}m`)
    .setIssuer("futgrid")
    .setAudience("futgrid-api")
    .sign(jwtSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret, {
      issuer: "futgrid",
      audience: "futgrid-api",
    });
    if (payload.type !== "access" || !payload.sub) return null;
    return { sub: payload.sub, role: String(payload.role ?? "user"), type: "access" };
  } catch {
    return null;
  }
}

export function newGuestId(): string {
  return randomUUID();
}

export function isUuid(value: string | undefined): boolean {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}
