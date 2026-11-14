import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildPuzzle } from "@futgrid/game-core";
import { buildApp } from "../src/app.js";
import { getGameData } from "../src/lib/data.js";
import { goatPlayers } from "../src/lib/goatData.js";
import { bakuDateKey } from "../src/lib/time.js";
import { generateDailyPuzzles } from "../src/modules/daily/service.js";
import { recomputeGoat } from "../src/modules/goat/service.js";
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

async function reset() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  const redis = await getRedis();
  await redis.flushdb();
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await app.close();
  await closeRedis();
  await prisma.$disconnect();
});

describe("daily games", () => {
  it("generates all daily puzzles", async () => {
    await expect(generateDailyPuzzles()).resolves.toBeUndefined();
    const count = await prisma.dailyPuzzle.count();
    expect(count).toBe(6);
  });

  it("plays and resumes a daily XOX attempt", async () => {
    const guestId = randomUUID();
    const headers = { "x-guest-id": guestId };
    const start = await app.inject({
      method: "GET",
      url: "/v1/daily/xox?difficulty=normal",
      headers,
    });
    expect(start.statusCode).toBe(200);
    expect(start.json().rows).toHaveLength(3);

    const stored = await prisma.dailyPuzzle.findUnique({
      where: {
        game_date_difficulty: { game: "xox", date: bakuDateKey(), difficulty: "normal" },
      },
    });
    expect(stored).toBeTruthy();
    const puzzle = buildPuzzle("xox", getGameData(), Number(stored!.seed), {
      difficulty: "normal",
      categories: { country: true, trophy: true, coach: false },
    });
    const grid = puzzle.grid as { rows: { ids: Set<number> }[]; cols: { ids: Set<number> }[] };
    const playerId = [...grid.rows[0]!.ids].find((id) => grid.cols[0]!.ids.has(id));
    expect(playerId).toBeTruthy();

    const answer = await app.inject({
      method: "POST",
      url: "/v1/daily/xox/answer",
      headers,
      payload: { cell: 0, playerId, difficulty: "normal" },
    });
    expect(answer.statusCode).toBe(200);
    expect(answer.json().correct).toBe(true);
    expect(answer.json().board[0]).toBe(playerId);

    const duplicate = await app.inject({
      method: "POST",
      url: "/v1/daily/xox/answer",
      headers,
      payload: { cell: 0, playerId, difficulty: "normal" },
    });
    expect(duplicate.statusCode).toBe(409);

    const resumed = await app.inject({
      method: "GET",
      url: "/v1/daily/xox?difficulty=normal",
      headers,
    });
    expect(resumed.json().attempt.board[0]).toBe(playerId);

    const stats = await app.inject({ method: "GET", url: "/v1/daily/xox/stats" });
    expect(stats.statusCode).toBe(200);
    expect(stats.json().played).toBe(1);
  });

  it("answers daily Wordle without leaking the answer", async () => {
    const guestId = randomUUID();
    const headers = { "x-guest-id": guestId };
    const start = await app.inject({
      method: "GET",
      url: "/v1/daily/wordle?difficulty=normal",
      headers,
    });
    expect(start.statusCode).toBe(200);
    expect(start.json().answer).toBeUndefined();

    const stored = await prisma.dailyPuzzle.findUnique({
      where: {
        game_date_difficulty: { game: "wordle", date: bakuDateKey(), difficulty: "normal" },
      },
    });
    const puzzle = buildPuzzle("wordle", getGameData(), Number(stored!.seed), {
      difficulty: "normal",
    });
    const word = String((stored!.puzzle as { word: string }).word);
    const dict = puzzle.dict as string[];
    const wrong = dict.find((entry) => entry !== word && entry.length === word.length);
    expect(wrong).toBeTruthy();

    const wrongGuess = await app.inject({
      method: "POST",
      url: "/v1/daily/wordle/guess",
      headers,
      payload: { guess: wrong, difficulty: "normal" },
    });
    expect(wrongGuess.statusCode).toBe(200);
    expect(wrongGuess.json().solved).toBe(false);
    expect(wrongGuess.json().answer).toBeUndefined();

    const solved = await app.inject({
      method: "POST",
      url: "/v1/daily/wordle/guess",
      headers,
      payload: { guess: word, difficulty: "normal" },
    });
    expect(solved.statusCode).toBe(200);
    expect(solved.json().solved).toBe(true);
    expect(solved.json().answer).toBe(word);

    const stats = await app.inject({ method: "GET", url: "/v1/daily/wordle/stats" });
    expect(stats.json().played).toBe(1);
    expect(stats.json().solved).toBe(1);
  });
});

describe("goat voting", () => {
  it("validates and counts a bracket vote", async () => {
    const guestId = randomUUID();
    const players = goatPlayers().slice(0, 16);
    const champion = players[0]!;
    const picks = players.slice(1).map((player) => ({
      winner: champion.id,
      loser: player.id,
    }));
    const vote = {
      size: 16,
      champion: champion.id,
      final: [champion.id, players[1]!.id],
      semi: [champion.id, players[1]!.id, players[2]!.id, players[3]!.id],
      picks,
    };
    const response = await app.inject({
      method: "POST",
      url: "/v1/goat/votes",
      headers: { "x-guest-id": guestId },
      payload: vote,
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().counted).toBe(true);

    await recomputeGoat(16);
    const ranking = await app.inject({ method: "GET", url: "/v1/goat/ranking?size=16" });
    expect(ranking.statusCode).toBe(200);
    const top = ranking.json().entries[0];
    expect(top.playerId).toBe(champion.id);
    expect(top.championCount).toBe(1);

    const invalid = await app.inject({
      method: "POST",
      url: "/v1/goat/votes",
      headers: { "x-guest-id": randomUUID() },
      payload: { ...vote, picks: picks.slice(1) },
    });
    expect(invalid.statusCode).toBe(400);
  });
});

describe("contact and stats", () => {
  it("stores a contact message but ignores honeypot submissions", async () => {
    const real = await app.inject({
      method: "POST",
      url: "/v1/contact",
      headers: { "accept-language": "en" },
      payload: { name: "Test", email: "test@example.com", message: "Hello" },
    });
    expect(real.statusCode).toBe(201);
    expect(await prisma.contactMessage.count()).toBe(1);

    const bot = await app.inject({
      method: "POST",
      url: "/v1/contact",
      payload: {
        name: "Bot",
        email: "bot@example.com",
        message: "spam",
        honeypot: "filled",
      },
    });
    expect(bot.statusCode).toBe(201);
    expect(await prisma.contactMessage.count()).toBe(1);
  });

  it("returns homepage stats", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/stats" });
    expect(response.statusCode).toBe(200);
    expect(response.json().players).toBeGreaterThan(1000);
    expect(response.json().games).toBe(12);
  });
});
