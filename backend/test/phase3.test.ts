import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateSecret, generateSync } from "otplib";
import { buildApp } from "../src/app.js";
import { hashPassword } from "../src/lib/crypto.js";
import { prisma } from "../src/lib/prisma.js";
import { closeRedis, getRedis } from "../src/lib/redis.js";
import { bakuDateKey } from "../src/lib/time.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let adminCookie = "";
let adminTotp = "";
let adminSecret = "";

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

async function reset() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  const redis = await getRedis();
  await redis.flushdb();
}

async function createAdmin() {
  adminSecret = generateSecret();
  adminTotp = generateSync({ secret: adminSecret });
  const passwordHash = await hashPassword("admin password 123");
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      username: "admin",
      passwordHash,
      role: "admin",
      emailVerifiedAt: new Date(),
      ageConfirmedAt: new Date(),
      adminTotpSecret: adminSecret,
      adminTotpEnabled: true,
    },
  });
  const login = await app.inject({
    method: "POST",
    url: "/v1/auth/login",
    payload: { email: "admin@example.com", password: "admin password 123" },
  });
  expect(login.statusCode).toBe(200);
  adminCookie = (login.cookies ?? []).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

const adminHeaders = () => {
  adminTotp = generateSync({ secret: adminSecret });
  return {
    cookie: adminCookie,
    origin: "http://localhost:5173",
    "x-admin-totp": adminTotp,
  };
};

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

beforeEach(async () => {
  await reset();
  await createAdmin();
});

afterAll(async () => {
  await app.close();
  await closeRedis();
  await prisma.$disconnect();
});

describe("admin security", () => {
  it("requires role and TOTP", async () => {
    const missing = await app.inject({
      method: "GET",
      url: "/v1/admin/overview",
      headers: { cookie: adminCookie, origin: "http://localhost:5173" },
    });
    expect(missing.statusCode).toBe(403);
    const ok = await app.inject({
      method: "GET",
      url: "/v1/admin/overview",
      headers: adminHeaders(),
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().users).toBe(1);
  });
});

describe("admin operations", () => {
  it("blocks users, manages games, and writes audit entries", async () => {
    const target = await prisma.user.create({
      data: {
        email: `target-${randomUUID()}@example.com`,
        username: `target_${randomUUID().slice(0, 8)}`,
        emailVerifiedAt: new Date(),
      },
    });
    const block = await app.inject({
      method: "PATCH",
      url: `/v1/admin/users/${target.id}/block`,
      headers: adminHeaders(),
      payload: { blocked: true },
    });
    expect(block.statusCode).toBe(200);
    expect(block.json().blocked).toBe(true);

    const game = await app.inject({
      method: "PATCH",
      url: "/v1/admin/games/xox",
      headers: adminHeaders(),
      payload: { isNew: true },
    });
    expect(game.statusCode).toBe(404);

    await prisma.game.create({ data: { id: "xox", name: "X0X" } });
    const updated = await app.inject({
      method: "PATCH",
      url: "/v1/admin/games/xox",
      headers: adminHeaders(),
      payload: { isNew: true },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().isNew).toBe(true);

    const log = await app.inject({
      method: "GET",
      url: "/v1/admin/audit-log?limit=20",
      headers: adminHeaders(),
    });
    expect(log.statusCode).toBe(200);
    expect(log.json().entries.length).toBeGreaterThanOrEqual(2);
  });

  it("manages contact messages and player overrides", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/contact",
      payload: { name: "Test", email: "test@example.com", message: "Hello there" },
    });
    const messages = await app.inject({
      method: "GET",
      url: "/v1/admin/contact-messages",
      headers: adminHeaders(),
    });
    expect(messages.statusCode).toBe(200);
    const id = messages.json().entries[0].id;
    const updated = await app.inject({
      method: "PATCH",
      url: `/v1/admin/contact-messages/${id}`,
      headers: adminHeaders(),
      payload: { status: "read" },
    });
    expect(updated.json().status).toBe("read");

    await prisma.playerRecord.create({ data: { id: 999, name: "Test Player" } });
    const market = await app.inject({
      method: "POST",
      url: "/v1/admin/market-values",
      headers: adminHeaders(),
      payload: { csv: "player_id,market_value_eur\n999,123456" },
    });
    expect(market.statusCode).toBe(200);
    expect(market.json().applied).toBe(1);
    const player = await prisma.playerRecord.findUnique({ where: { id: 999 } });
    expect(player?.marketValueEur).toBe(123456);
    expect(await prisma.dataOverride.count()).toBe(1);
  });

  it("regenerates daily puzzles and builds data releases", async () => {
    await app.inject({
      method: "GET",
      url: "/v1/daily/xox?difficulty=normal",
      headers: { "x-guest-id": randomUUID() },
    });
    const before = await prisma.dailyPuzzle.findUnique({
      where: { game_date_difficulty: { game: "xox", date: bakuDateKey(), difficulty: "normal" } },
    });
    expect(before).toBeTruthy();
    const regenerated = await app.inject({
      method: "POST",
      url: `/v1/admin/daily-puzzles/${before!.id}/regenerate`,
      headers: adminHeaders(),
    });
    expect(regenerated.statusCode).toBe(200);
    expect(regenerated.json().seed).not.toBe(Number(before!.seed));

    const build = await app.inject({
      method: "POST",
      url: "/v1/admin/data-releases/build",
      headers: adminHeaders(),
    });
    expect(build.statusCode).toBe(200);
    expect(build.json().version).toMatch(/^v/);
    const release = await prisma.dataRelease.findUnique({ where: { id: build.json().id } });
    expect(release?.status).toBe("built");
    expect(release?.report).toBeTruthy();
  });

  it("rejects Wikimedia media without license and author", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/admin/media",
      headers: adminHeaders(),
      payload: {
        entityType: "player",
        entityId: "999",
        kind: "portrait",
        sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/test.jpg",
      },
    });
    expect(response.statusCode).toBe(400);
  });
});
