import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import { buildPuzzle, commonPlayers, entityIndex, hasLetters } from "@futgrid/game-core";
import { buildApp } from "../src/app.js";
import { setupDuels } from "../src/modules/duel/socket.js";
import { getGameData } from "../src/lib/data.js";
import { hashPassword } from "../src/lib/crypto.js";
import { prisma } from "../src/lib/prisma.js";
import { closeRedis, getRedis } from "../src/lib/redis.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let duels: ReturnType<typeof setupDuels>;
let url = "";
const sockets: Socket[] = [];

const TABLES = [
  "duel_matches",
  "push_tokens",
  "user_ratings",
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

function waitFor<T = unknown>(socket: Socket, event: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeout);
    const handler = (value: T) => {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(value);
    };
    socket.on(event, handler);
  });
}

function makeClient(guestId: string): Socket {
  const socket = connect(url, {
    auth: { guestId },
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });
  sockets.push(socket);
  return socket;
}

function emitAck<T = unknown>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (error: Error | null, value: T) => {
      if (error) reject(error);
      else resolve(value);
    });
  });
}

beforeAll(async () => {
  app = await buildApp();
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address() as AddressInfo;
  url = `http://127.0.0.1:${address.port}`;
  duels = setupDuels(app.server);
});

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  for (const socket of sockets) socket.disconnect();
  await duels.close();
  await app.close();
  await closeRedis();
  await prisma.$disconnect();
});

describe("online duels", () => {
  it("creates a room, joins a second player and validates XOX moves", async () => {
    const a = makeClient(randomUUID());
    const b = makeClient(randomUUID());
    await Promise.all([waitFor(a, "connect"), waitFor(b, "connect")]);

    const created = await emitAck<{ room: { code: string } }>(a, "room:create", { game: "xox" });
    const code = created.room.code;
    expect(code).toHaveLength(6);

    const statePromise = waitFor<{ status: string }>(b, "game:state");
    await emitAck(b, "room:join", { code, game: "xox" });
    const state = await statePromise;
    expect(state.status).toBe("playing");

    const redis = await getRedis();
    const raw = await redis.get(`duel:room:${code}`);
    expect(raw).toBeTruthy();
    const room = JSON.parse(raw as string) as { seed: number };
    // Onlayn X0X raundlarla oynanılır: 1-ci raundun cədvəli seed + 7919 ilə qurulur.
    const puzzle = buildPuzzle("xox", getGameData(), (room.seed + 7_919) >>> 0, {
      difficulty: "normal",
      categories: { country: true, trophy: true, coach: true },
    });
    const grid = puzzle.grid as { rows: { ids: Set<number> }[]; cols: { ids: Set<number> }[] };
    const playerId = [...grid.rows[0]!.ids].find((id) => grid.cols[0]!.ids.has(id));
    expect(playerId).toBeTruthy();

    const moveState = waitFor<{ state: { cells: ({ mark: string } | null)[] } }>(b, "game:state");
    await emitAck(a, "game:move", { code, cell: 0, playerId });
    const moved = await moveState;
    expect(moved.state.cells[0]?.mark).toBe("X");
  });

  it("plays an online Ortaq Oyunçu round", async () => {
    const a = makeClient(randomUUID());
    const b = makeClient(randomUUID());
    await Promise.all([waitFor(a, "connect"), waitFor(b, "connect")]);
    const created = await emitAck<{ room: { code: string } }>(a, "room:create", {
      game: "orta",
      settings: { era: "all" },
    });
    const code = created.room.code;
    const statePromise = waitFor<{ status: string }>(b, "game:state");
    await emitAck(b, "room:join", { code, game: "orta" });
    await statePromise;

    // Hər oyunçu öz kartını seçir; kartlar açılandan sonra ortaq oyunçunu yazan xal alır.
    const data = getGameData();
    const clubs = entityIndex(data).clubs.filter((club) => club.ids.size > 200);
    let pair: { a: (typeof clubs)[number]; b: (typeof clubs)[number]; id: number } | null = null;
    for (const x of clubs) {
      for (const y of clubs) {
        if (x.key === y.key) continue;
        const common = commonPlayers(data, x, y);
        if (common[0]) {
          pair = { a: x, b: y, id: common[0].id };
          break;
        }
      }
      if (pair) break;
    }
    expect(pair).toBeTruthy();
    // Kartlar ikisi də seçiləndə açılır — "answer" mərhələsini gözləyirik.
    const revealed = new Promise<{ state: { phase: string } }>((resolve) => {
      const handler = (payload: { state: { phase: string } }) => {
        if (payload.state.phase !== "answer") return;
        b.off("game:state", handler);
        resolve(payload);
      };
      b.on("game:state", handler);
    });
    await emitAck(a, "game:move", { code, action: "pick", key: pair!.a.key });
    await emitAck(b, "game:move", { code, action: "pick", key: pair!.b.key });
    expect((await revealed).state.phase).toBe("answer");

    const moveState = waitFor<{ state: { round: number; scores: Record<string, number> } }>(
      b,
      "game:state",
    );
    await emitAck(a, "game:move", { code, action: "answer", playerId: pair!.id });
    const moved = await moveState;
    expect(moved.state.round).toBe(1);
    expect(Object.values(moved.state.scores)).toContain(1);
  });

  it("plays online Higher/Lower and Two Letters rounds", async () => {
    const a = makeClient(randomUUID());
    const b = makeClient(randomUUID());
    await Promise.all([waitFor(a, "connect"), waitFor(b, "connect")]);

    const hl = await emitAck<{ room: { code: string } }>(a, "room:create", { game: "higherLower" });
    const hlCode = hl.room.code;
    const hlStarted = waitFor(b, "game:state");
    await emitAck(b, "room:join", { code: hlCode, game: "higherLower" });
    await hlStarted;
    const redis = await getRedis();
    const hlRoom = JSON.parse((await redis.get(`duel:room:${hlCode}`)) as string) as {
      seed: number;
    };
    const hlPuzzle = buildPuzzle("higherLower", getGameData(), hlRoom.seed, {
      difficulty: "normal",
      rounds: 10,
    });
    const first = (hlPuzzle.sequence as { aValue: number; bValue: number }[])[0]!;
    const direction = first.bValue >= first.aValue ? "up" : "down";
    const hlNext = waitFor<{ state: { index: number } }>(b, "game:state");
    await emitAck(a, "game:move", { code: hlCode, direction });
    const afterFirst = await hlNext;
    expect(afterFirst.state.index).toBe(0);
    const hlMoved = waitFor<{ state: { index: number } }>(b, "game:state");
    await emitAck(b, "game:move", { code: hlCode, direction });
    const afterSecond = await hlMoved;
    expect(afterSecond.state.index).toBe(1);

    const tl = await emitAck<{ room: { code: string } }>(a, "room:create", { game: "twoLetters" });
    const tlCode = tl.room.code;
    const tlStarted = waitFor(b, "game:state");
    await emitAck(b, "room:join", { code: tlCode, game: "twoLetters" });
    await tlStarted;
    // Hərfləri oyunçular seçir: əvvəl otağı quran, sonra rəqib.
    const playing = new Promise<{ state: { phase: string; letters: string[] } }>((resolve) => {
      const handler = (payload: { state: { phase: string; letters: string[] } }) => {
        if (payload.state.phase !== "play") return;
        b.off("game:state", handler);
        resolve(payload);
      };
      b.on("game:state", handler);
    });
    await emitAck(a, "game:move", { code: tlCode, action: "letter", letter: "A" });
    await emitAck(b, "game:move", { code: tlCode, action: "letter", letter: "N" });
    const tlPlay = await playing;
    expect(tlPlay.state.letters).toEqual(["A", "N"]);
    const player = getGameData().players.find((entry) =>
      hasLetters(getGameData(), entry, "A", "N"),
    );
    expect(player).toBeTruthy();
    const tlMoved = waitFor<{ state: { used: { playerId: number }[] } }>(b, "game:state");
    await emitAck(a, "game:move", { code: tlCode, action: "answer", playerId: player!.id });
    const tlState = await tlMoved;
    expect(tlState.state.used[0]?.playerId).toBe(player!.id);
  });

  it("rejects joining a room from a different game", async () => {
    const a = makeClient(randomUUID());
    const b = makeClient(randomUUID());
    await Promise.all([waitFor(a, "connect"), waitFor(b, "connect")]);
    const created = await emitAck<{ room: { code: string } }>(a, "room:create", { game: "xox" });
    const response = await emitAck<{ error?: { code: string } }>(b, "room:join", {
      code: created.room.code,
      game: "orta",
    });
    expect(response.error?.code).toBe("ROOM_GAME_MISMATCH");
  });

  it("stores mobile push tokens", async () => {
    const passwordHash = await hashPassword("push password 123");
    await prisma.user.create({
      data: {
        email: "push@example.com",
        username: "push_user",
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    const login = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      headers: { "x-client": "mobile" },
      payload: { email: "push@example.com", password: "push password 123" },
    });
    expect(login.statusCode).toBe(200);
    const token = String(login.json().accessToken);
    const registered = await app.inject({
      method: "POST",
      url: "/v1/me/push-tokens",
      headers: { authorization: `Bearer ${token}` },
      payload: { token: "fcm-token-12345678901234567890", platform: "android" },
    });
    expect(registered.statusCode).toBe(201);
    expect(await prisma.pushToken.count()).toBe(1);
    const removed = await app.inject({
      method: "DELETE",
      url: "/v1/me/push-tokens",
      headers: { authorization: `Bearer ${token}` },
      payload: { token: "fcm-token-12345678901234567890" },
    });
    expect(removed.statusCode).toBe(200);
    expect(await prisma.pushToken.count()).toBe(0);
  });
});
