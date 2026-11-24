import { afterAll, describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import { hashToken, randomToken } from "../src/lib/crypto.js";
import { prisma } from "../src/lib/prisma.js";
import { logout, logoutAll, refresh } from "../src/modules/auth/service.js";

const request = { headers: {}, ip: "127.0.0.1" } as unknown as FastifyRequest;
let n = 0;

async function session() {
  n += 1;
  const stamp = `${Date.now()}${n}`;
  const user = await prisma.user.create({
    data: { email: `refresh${stamp}@test.az`, username: `rt${stamp.slice(-10)}`, locale: "az" },
  });
  const token = randomToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  return { user, token };
}

const tries = async (token: string) => {
  try {
    await refresh(token, request);
    return true;
  } catch {
    return false;
  }
};

afterAll(async () => {
  await prisma.$disconnect();
});

describe("refresh token grace window", () => {
  it("lets a second tab reuse a just-rotated token", async () => {
    const { token } = await session();
    const first = await refresh(token, request);
    expect(first.tokens.refreshToken).toBeTruthy();
    expect(await tries(token)).toBe(true);
  });

  it("does not revive a token after logout", async () => {
    const { token } = await session();
    await logout(token);
    expect(await tries(token)).toBe(false);
  });

  it("does not revive a rotated token after the new one was logged out", async () => {
    const { token } = await session();
    const rotated = await refresh(token, request);
    await logout(rotated.tokens.refreshToken);
    expect(await tries(token)).toBe(false);
  });

  it("does not revive tokens after 'log out everywhere' or for blocked users", async () => {
    const a = await session();
    await refresh(a.token, request);
    await logoutAll(a.user.id);
    expect(await tries(a.token)).toBe(false);

    const b = await session();
    await refresh(b.token, request);
    await prisma.user.update({ where: { id: b.user.id }, data: { blockedAt: new Date() } });
    expect(await tries(b.token)).toBe(false);
  });
});

describe("google sign-in redirects", () => {
  it("sends the user back to the account page instead of showing JSON errors", async () => {
    const { buildApp } = await import("../src/app.js");
    const app = await buildApp();
    const start = await app.inject({ method: "GET", url: "/v1/auth/google" });
    expect(start.statusCode).toBe(302);
    expect(start.headers.location).toMatch(/\/hesab\?oauth=error&reason=not_configured$/);
    const cancelled = await app.inject({
      method: "GET",
      url: "/v1/auth/google/callback?error=access_denied",
    });
    expect(cancelled.statusCode).toBe(302);
    expect(cancelled.headers.location).toMatch(/oauth=error&reason=(not_configured|cancelled)$/);
    await app.close();
  });
});
