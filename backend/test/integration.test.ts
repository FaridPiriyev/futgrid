import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildPuzzle, type Puzzle } from "@futgrid/game-core";
import { buildApp } from "../src/app.js";
import { getGameData } from "../src/lib/data.js";
import { hashToken } from "../src/lib/crypto.js";
import { prisma } from "../src/lib/prisma.js";
import { closeRedis, getRedis } from "../src/lib/redis.js";

let app: Awaited<ReturnType<typeof buildApp>>;

const TABLES = [
  "audit_log",
  "media",
  "data_releases",
  "data_overrides",
  "player_trophies",
  "player_stints",
  "players",
  "clubs",
  "coaches",
  "countries",
  "famous_matches",
  "contact_messages",
  "goat_pair_stats",
  "goat_player_stats",
  "goat_votes",
  "daily_streaks",
  "daily_answer_counts",
  "daily_attempts",
  "daily_puzzles",
  "events",
  "leaderboard_snapshots",
  "points_ledger",
  "user_game_stats",
  "game_sessions",
  "guest_links",
  "user_settings",
  "email_tokens",
  "refresh_tokens",
  "oauth_accounts",
  "users",
  "games",
  "teams",
];

async function reset(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  const redis = await getRedis();
  await redis.flushdb();
}

function cookieHeader(response: { cookies?: { name: string; value: string }[] }): string {
  return (response.cookies ?? []).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

function cookieValue(
  response: { cookies?: { name: string; value: string }[] },
  name: string,
): string | undefined {
  return response.cookies?.find((cookie) => cookie.name === name)?.value;
}

async function registerAndVerify(email: string, username: string) {
  const register = await app.inject({
    method: "POST",
    url: "/v1/auth/register",
    payload: {
      email,
      password: "correct horse battery",
      username,
      displayName: "Test Player",
      locale: "en",
      ageConfirmed: true,
    },
  });
  expect(register.statusCode, register.body).toBe(201);
  const user = await prisma.user.findUnique({ where: { email } });
  expect(user).toBeTruthy();
  const token = `verify-${randomUUID()}-${randomUUID()}`;
  await prisma.emailToken.create({
    data: {
      userId: user!.id,
      tokenHash: hashToken(token),
      type: "verify",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  const verify = await app.inject({
    method: "POST",
    url: "/v1/auth/verify-email",
    payload: { token },
  });
  expect(verify.statusCode).toBe(200);
  const login = await app.inject({
    method: "POST",
    url: "/v1/auth/login",
    payload: { email, password: "correct horse battery" },
  });
  expect(login.statusCode).toBe(200);
  return { user: user!, login };
}

function firstXoxAnswer(puzzle: Puzzle) {
  const grid = puzzle.grid as {
    rows: { ids: Set<number> }[];
    cols: { ids: Set<number> }[];
  };
  const row = grid.rows[0]!;
  const column = grid.cols[0]!;
  const playerId = [...row.ids].find((id) => column.ids.has(id));
  expect(playerId).toBeTruthy();
  return { round: 0, playerId, ms: 1500 };
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  await reset();
});

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await app.close();
  await closeRedis();
  await prisma.$disconnect();
});

describe("auth", () => {
  it("registers, verifies, logs in, rotates refresh tokens and rejects reuse", async () => {
    const email = `auth-${randomUUID()}@example.com`;
    const { login } = await registerAndVerify(email, `user_${randomUUID().slice(0, 8)}`);

    const me = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie: cookieHeader(login), origin: "http://localhost:5173" },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe(email);

    const refreshCookie = `futgrid_refresh=${cookieValue(login, "futgrid_refresh")}`;
    const rotated = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      headers: { cookie: refreshCookie },
      payload: {},
    });
    expect(rotated.statusCode).toBe(200);
    expect(cookieValue(rotated, "futgrid_refresh")).toBeTruthy();

    const reuse = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      headers: { cookie: refreshCookie },
      payload: {},
    });
    expect(reuse.statusCode).toBe(401);

    const afterReuse = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      headers: { cookie: `futgrid_refresh=${cookieValue(rotated, "futgrid_refresh")}` },
      payload: {},
    });
    expect(afterReuse.statusCode).toBe(401);
  });

  it("does not reveal whether a forgot-password email exists", async () => {
    const missing = await app.inject({
      method: "POST",
      url: "/v1/auth/forgot-password",
      payload: { email: "missing@example.com" },
    });
    const email = `forgot-${randomUUID()}@example.com`;
    await registerAndVerify(email, `forgot_${randomUUID().slice(0, 8)}`);
    const existing = await app.inject({
      method: "POST",
      url: "/v1/auth/forgot-password",
      payload: { email },
    });
    expect(missing.statusCode).toBe(200);
    expect(existing.statusCode).toBe(200);
    expect(existing.json().message).toBe(missing.json().message);
  });
  it("resets a password with a single-use token", async () => {
    const email = `reset-${randomUUID()}@example.com`;
    const { user } = await registerAndVerify(email, `reset_${randomUUID().slice(0, 8)}`);
    const token = `reset-${randomUUID()}-${randomUUID()}`;
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        type: "reset",
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const reset = await app.inject({
      method: "POST",
      url: "/v1/auth/reset-password",
      payload: { token, password: "new password 123" },
    });
    expect(reset.statusCode).toBe(200);

    const oldLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email, password: "correct horse battery" },
    });
    expect(oldLogin.statusCode).toBe(401);
    const newLogin = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: { email, password: "new password 123" },
    });
    expect(newLogin.statusCode).toBe(200);

    const reuse = await app.inject({
      method: "POST",
      url: "/v1/auth/reset-password",
      payload: { token, password: "another password" },
    });
    expect(reuse.statusCode).toBe(401);
  });
});

describe("sessions", () => {
  it("creates and finishes a guest XOX session", async () => {
    const guestId = randomUUID();
    const created = await app.inject({
      method: "POST",
      url: "/v1/sessions",
      headers: { "x-guest-id": guestId },
      payload: {
        game: "xox",
        mode: "ranked",
        difficulty: "normal",
        settings: { categories: { country: true, trophy: true, coach: false } },
      },
    });
    expect(created.statusCode).toBe(201);
    const body = created.json();
    const puzzle = buildPuzzle("xox", getGameData(), body.seed, {
      difficulty: "normal",
      categories: { country: true, trophy: true, coach: false },
    });
    const answer = firstXoxAnswer(puzzle);

    const finish = await app.inject({
      method: "POST",
      url: `/v1/sessions/${body.sessionId}/finish`,
      headers: { "x-guest-id": guestId },
      payload: { answers: [answer] },
    });
    expect(finish.statusCode).toBe(200);
    expect(finish.json().points).toBeGreaterThan(0);
    expect(finish.json().counted).toBe(true);

    const ledger = await prisma.pointsLedger.findMany({ where: { guestId } });
    expect(ledger).toHaveLength(1);

    const second = await app.inject({
      method: "POST",
      url: `/v1/sessions/${body.sessionId}/finish`,
      headers: { "x-guest-id": guestId },
      payload: { answers: [answer] },
    });
    expect(second.statusCode).toBe(409);
  });

  it("rejects invalid answers and expired sessions", async () => {
    const guestId = randomUUID();
    const created = await app.inject({
      method: "POST",
      url: "/v1/sessions",
      headers: { "x-guest-id": guestId },
      payload: {
        game: "xox",
        mode: "ranked",
        difficulty: "normal",
        settings: { categories: { country: true, trophy: true, coach: false } },
      },
    });
    const body = created.json();
    const invalid = await app.inject({
      method: "POST",
      url: `/v1/sessions/${body.sessionId}/finish`,
      headers: { "x-guest-id": guestId },
      payload: { answers: [{ round: 0, playerId: -1, ms: 1500 }] },
    });
    expect(invalid.statusCode).toBe(422);

    const expired = await app.inject({
      method: "POST",
      url: "/v1/sessions",
      headers: { "x-guest-id": guestId },
      payload: {
        game: "xox",
        mode: "ranked",
        difficulty: "normal",
        settings: { categories: { country: true, trophy: true, coach: false } },
      },
    });
    const expiredBody = expired.json();
    await prisma.gameSession.update({
      where: { id: expiredBody.sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expiredFinish = await app.inject({
      method: "POST",
      url: `/v1/sessions/${expiredBody.sessionId}/finish`,
      headers: { "x-guest-id": guestId },
      payload: { answers: [] },
    });
    expect(expiredFinish.statusCode).toBe(410);
  });

  it("counts only the first five ranked sessions per game per day", async () => {
    const guestId = randomUUID();
    const results: { counted: boolean; points: number }[] = [];
    for (let index = 0; index < 6; index++) {
      const created = await app.inject({
        method: "POST",
        url: "/v1/sessions",
        headers: { "x-guest-id": guestId },
        payload: {
          game: "xox",
          mode: "ranked",
          difficulty: "normal",
          settings: { categories: { country: true, trophy: true, coach: false } },
        },
      });
      expect(created.statusCode).toBe(201);
      const body = created.json();
      const puzzle = buildPuzzle("xox", getGameData(), body.seed, {
        difficulty: "normal",
        categories: { country: true, trophy: true, coach: false },
      });
      const finish = await app.inject({
        method: "POST",
        url: `/v1/sessions/${body.sessionId}/finish`,
        headers: { "x-guest-id": guestId },
        payload: { answers: [firstXoxAnswer(puzzle)] },
      });
      expect(finish.statusCode).toBe(200);
      results.push({ counted: finish.json().counted, points: finish.json().points });
    }
    expect(results.slice(0, 5).every((result) => result.counted)).toBe(true);
    expect(results[5]?.counted).toBe(false);
    expect(results[5]?.points).toBe(0);
    const ledger = await prisma.pointsLedger.findMany({ where: { guestId } });
    expect(ledger).toHaveLength(6);
    expect(ledger.filter((row) => row.reason === "daily_limit")).toHaveLength(1);
  });
});

describe("leaderboard", () => {
  it("places a verified user on the leaderboard after a scored session", async () => {
    const email = `lb-${randomUUID()}@example.com`;
    const { user, login } = await registerAndVerify(email, `lb_${randomUUID().slice(0, 8)}`);
    const created = await app.inject({
      method: "POST",
      url: "/v1/sessions",
      headers: { cookie: cookieHeader(login), origin: "http://localhost:5173" },
      payload: {
        game: "xox",
        mode: "ranked",
        difficulty: "normal",
        settings: { categories: { country: true, trophy: true, coach: false } },
      },
    });
    expect(created.statusCode).toBe(201);
    const body = created.json();
    const puzzle = buildPuzzle("xox", getGameData(), body.seed, {
      difficulty: "normal",
      categories: { country: true, trophy: true, coach: false },
    });
    const finish = await app.inject({
      method: "POST",
      url: `/v1/sessions/${body.sessionId}/finish`,
      headers: { cookie: cookieHeader(login), origin: "http://localhost:5173" },
      payload: { answers: [firstXoxAnswer(puzzle)] },
    });
    expect(finish.statusCode).toBe(200);
    expect(finish.json().points).toBeGreaterThan(0);

    const leaderboard = await app.inject({
      method: "GET",
      url: "/v1/leaderboard?period=week&game=xox&limit=10",
    });
    expect(leaderboard.statusCode).toBe(200);
    const entries = leaderboard.json().entries;
    expect(entries.some((entry: { userId: string }) => entry.userId === user.id)).toBe(true);

    const mine = await app.inject({
      method: "GET",
      url: "/v1/leaderboard/me?period=week&game=xox",
      headers: { cookie: cookieHeader(login), origin: "http://localhost:5173" },
    });
    expect(mine.statusCode).toBe(200);
    expect(mine.json().rank).toBe(1);
  });
});

describe("users", () => {
  it("imports guest records without ranked points, exports, and soft deletes", async () => {
    const email = `user-${randomUUID()}@example.com`;
    const { user, login } = await registerAndVerify(email, `me_${randomUUID().slice(0, 8)}`);
    const guestId = randomUUID();
    const headers = { cookie: cookieHeader(login), origin: "http://localhost:5173", "x-guest-id": guestId };

    const imported = await app.inject({
      method: "POST",
      url: "/v1/me/import-guest",
      headers,
      payload: {
        guestId,
        records: [{ gameKey: "xox", bestScore: 0.75, played: 4, wins: 2, bestStreak: 3 }],
      },
    });
    expect(imported.statusCode).toBe(200);
    expect(imported.json().rankedPointsAwarded).toBe(0);

    const me = await app.inject({ method: "GET", url: "/v1/me", headers });
    expect(me.statusCode).toBe(200);
    const xox = me.json().stats.find((row: { gameId: string }) => row.gameId === "xox");
    expect(xox.bestScore).toBe(0.75);
    expect(xox.totalPoints).toBe(0);

    const again = await app.inject({
      method: "POST",
      url: "/v1/me/import-guest",
      headers,
      payload: { guestId, records: [] },
    });
    expect(again.statusCode).toBe(409);

    const exported = await app.inject({ method: "GET", url: "/v1/me/export", headers });
    expect(exported.statusCode).toBe(200);
    expect(exported.json().user.email).toBe(email);

    const deleted = await app.inject({ method: "DELETE", url: "/v1/me", headers });
    expect(deleted.statusCode).toBe(204);
    const after = await app.inject({ method: "GET", url: "/v1/me", headers });
    expect(after.statusCode).toBe(403);
    const stored = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stored?.deletedAt).toBeTruthy();
    expect(stored?.displayName).toBe("Deleted user");
  });
});
