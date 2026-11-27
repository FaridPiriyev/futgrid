import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { closeRedis, getRedis } from "../src/lib/redis.js";
import { applyRatingChanges, applySoloResult, soloDelta } from "../src/modules/ratings/service.js";

let app: Awaited<ReturnType<typeof buildApp>>;

async function makeUser(username: string) {
  return prisma.user.create({
    data: { email: `${username}@example.com`, username, emailVerifiedAt: new Date() },
  });
}

async function rating(userId: string, gameId: string) {
  const row = await prisma.userRating.findUnique({ where: { userId_gameId: { userId, gameId } } });
  return row?.rating ?? null;
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "rating_events", "user_ratings", "users" RESTART IDENTITY CASCADE`);
  await (await getRedis()).flushdb();
});

afterAll(async () => {
  await app.close();
  await closeRedis();
  await prisma.$disconnect();
});

describe("unified rating", () => {
  it("solo deltas: bot win is +5 on normal, harder pays more", () => {
    expect(soloDelta(1, "normal")).toEqual({ delta: 5, result: "wins" });
    expect(soloDelta(0.9, "hard").delta).toBe(8);
    expect(soloDelta(0.9, "easy").delta).toBe(3);
    expect(soloDelta(0.5, "normal")).toEqual({ delta: 1, result: "draws" });
    expect(soloDelta(0.1, "normal").result).toBe("losses");
  });

  it("each game starts at 1000 and the overall rating sums every change", async () => {
    const user = await makeUser("rated");
    await applySoloResult(user.id, "xox", 1, "normal");
    expect(await rating(user.id, "xox")).toBe(1005);
    expect(await rating(user.id, "overall")).toBe(1005);

    await prisma.$transaction((tx) =>
      applyRatingChanges(tx, [{ userId: user.id, gameId: "auction", delta: 20, result: "wins", source: "duel" }]),
    );
    expect(await rating(user.id, "auction")).toBe(1020);
    expect(await rating(user.id, "xox")).toBe(1005);
    expect(await rating(user.id, "overall")).toBe(1025);
    expect(await prisma.ratingEvent.count({ where: { userId: user.id } })).toBe(2);
  });

  it("serves overall, per-game and weekly boards", async () => {
    const a = await makeUser("alpha");
    const b = await makeUser("bravo");
    await applySoloResult(a.id, "xox", 1, "hard");
    await applySoloResult(b.id, "wordle", 1, "normal");

    const all = await app.inject({ method: "GET", url: "/v1/ratings/leaderboard?period=all" });
    expect(all.statusCode, all.body).toBe(200);
    expect(all.json().entries.map((e: { username: string; rating: number }) => [e.username, e.rating])).toEqual([
      ["alpha", 1008],
      ["bravo", 1005],
    ]);

    const xox = await app.inject({ method: "GET", url: "/v1/ratings/leaderboard?period=all&game=xox" });
    expect(xox.json().entries.map((e: { username: string }) => e.username)).toEqual(["alpha"]);

    const week = await app.inject({ method: "GET", url: "/v1/ratings/leaderboard?period=week" });
    expect(week.json().entries[0]).toMatchObject({ username: "alpha", points: 8 });
  });
});
