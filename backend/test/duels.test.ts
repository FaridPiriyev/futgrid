import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import { buildPuzzle, commonPlayers, entityIndex, hasLetters } from "@futgrid/game-core";
import { buildApp } from "../src/app.js";
import { setupDuels } from "../src/modules/duel/socket.js";
import { getGameData } from "../src/lib/data.js";
import { prisma } from "../src/lib/prisma.js";
import { closeRedis, getRedis } from "../src/lib/redis.js";
import { QUESTION_TESTS } from "../src/modules/duel/questions.js";

process.env.DUEL_FORFEIT_MS = "1500";

let app: Awaited<ReturnType<typeof buildApp>>;
let duels: ReturnType<typeof setupDuels>;
let url = "";
const sockets: Socket[] = [];

type State = {
  code: string;
  status: string;
  winnerId: string | null;
  endedReason: string | null;
  players: { id: string; connected: boolean }[];
  settings: Record<string, unknown>;
  serverNow: number;
  state: Record<string, any>;
};

function client(guestId = randomUUID()): Socket {
  const socket = connect(url, {
    auth: { guestId },
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });
  sockets.push(socket);
  return socket;
}

const connected = (socket: Socket) =>
  new Promise<void>((resolve) =>
    socket.connected ? resolve() : socket.once("connect", () => resolve()),
  );

function ack<T = any>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(5000)
      .emit(event, payload, (error: Error | null, value: T) =>
        error ? reject(error) : resolve(value),
      );
  });
}

function next(
  socket: Socket,
  events: string[],
  predicate: (state: State) => boolean = () => true,
  timeout = 6000,
): Promise<State> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      for (const event of events) socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${events.join("/")}`));
    }, timeout);
    const handler = (state: State) => {
      if (!predicate(state)) return;
      clearTimeout(timer);
      for (const event of events) socket.off(event, handler);
      resolve(state);
    };
    for (const event of events) socket.on(event, handler);
  });
}

async function pair(game: string, settings?: Record<string, unknown>) {
  const a = client();
  const b = client();
  await Promise.all([connected(a), connected(b)]);
  const created = await ack(a, "room:create", { game, settings });
  const code = created.room.code as string;
  const started = next(a, ["game:state"], (state) => state.status === "playing");
  const joined = await ack(b, "room:join", { code, game });
  if (game === "auction") await ack(a, "game:start", { code, game });
  const state = await started;
  return { a, b, code, aSeat: created.youId as string, bSeat: joined.youId as string, state };
}

async function rawRoom(code: string) {
  const redis = await getRedis();
  return JSON.parse((await redis.get(`duel:room:${code}`)) as string);
}

/** Taymeri dərhal bitirir (sweeper 0.5 saniyəyə işləyir). */
async function expire(code: string) {
  const redis = await getRedis();
  const room = await rawRoom(code);
  room.state.deadline = Date.now() - 1;
  await redis.set(`duel:room:${code}`, JSON.stringify(room), "EX", 600);
  await redis.zadd("duel:timers", Date.now() - 1, code);
}

/** Ortaq oyunçusu olan iki klub tapır (Ortaq oyunçu testləri üçün). */
function clubPair() {
  const data = getGameData();
  const index = entityIndex(data);
  const big = index.clubs.filter((club) => club.ids.size > 200);
  for (const a of big)
    for (const b of big) {
      if (a.key === b.key) continue;
      const common = commonPlayers(data, a, b);
      if (common.length >= 2) return { a, b, common };
    }
  throw new Error("no club pair");
}

beforeAll(async () => {
  app = await buildApp();
  await app.listen({ host: "127.0.0.1", port: 0 });
  url = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  duels = setupDuels(app.server);
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "duel_matches", "user_ratings" RESTART IDENTITY CASCADE`,
  );
  const redis = await getRedis();
  await redis.flushdb();
});

afterAll(async () => {
  for (const socket of sockets) socket.disconnect();
  await duels.close();
  await app.close();
  await closeRedis();
  await prisma.$disconnect();
});

describe("matchmaking", () => {
  it("puts two searching players into the same room and starts the game", async () => {
    const a = client();
    const b = client();
    await Promise.all([connected(a), connected(b)]);
    const foundA = new Promise<any>((resolve) => a.once("match:found", resolve));
    const foundB = new Promise<any>((resolve) => b.once("match:found", resolve));
    const playing = next(a, ["game:state"], (state) => state.status === "playing");
    const first = await ack(a, "queue:join", { game: "xox" });
    expect(first.ok).toBe(true);
    await ack(b, "queue:join", { game: "xox" });
    const [matchA, matchB] = await Promise.all([foundA, foundB]);
    expect(matchA.code).toBe(matchB.code);
    expect(matchA.youId).not.toBe(matchB.youId);
    const state = await playing;
    expect(state.code).toBe(matchA.code);
    expect(state.players).toHaveLength(2);
    const redis = await getRedis();
    expect(await redis.hlen("mm:q:xox")).toBe(0);
  });

  it("does not match players from different games and lets them cancel", async () => {
    const a = client();
    const b = client();
    await Promise.all([connected(a), connected(b)]);
    let matched = false;
    a.once("match:found", () => (matched = true));
    await ack(a, "queue:join", { game: "xox" });
    await ack(b, "queue:join", { game: "orta" });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(matched).toBe(false);
    await ack(a, "queue:leave", {});
    const redis = await getRedis();
    expect(await redis.hlen("mm:q:xox")).toBe(0);
  });

  it("removes a player from the queue when the socket disconnects", async () => {
    const a = client();
    await connected(a);
    await ack(a, "queue:join", { game: "sual" });
    a.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const redis = await getRedis();
    expect(await redis.hlen("mm:q:sual")).toBe(0);
  });
});

describe("duel server", () => {
  it("finishes a guest-vs-guest match without crashing and records it", async () => {
    const { a, b, code, aSeat } = await pair("orta", { era: "all", target: 1 });
    const { a: clubA, b: clubB, common } = clubPair();
    await ack(a, "game:move", { code, action: "pick", key: clubA.key });
    const revealed = next(a, ["game:state"], (s) => s.state.phase === "answer");
    await ack(b, "game:move", { code, action: "pick", key: clubB.key });
    await revealed;
    const result = next(a, ["game:result"]);
    await ack(a, "game:move", { code, action: "answer", playerId: common[0]!.id });
    const finished = await result;
    expect(finished.status).toBe("finished");
    expect(finished.winnerId).toBe(aSeat);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(await prisma.duelMatch.count()).toBe(1);
    expect(await prisma.userRating.count()).toBe(0);
  });

  it("keeps Ortaq picks secret until both cards are chosen, then scores answers", async () => {
    const { a, b, code, aSeat, bSeat, state } = await pair("orta", { era: "all", target: 5 });
    expect(state.settings).toEqual({ era: "all", target: 5 });
    const { a: clubA, b: clubB, common } = clubPair();
    const country = entityIndex(getGameData()).countries[0]!;
    const clubOnly = await ack(a, "game:move", { code, action: "pick", key: country.key });
    expect(clubOnly.error?.code).toBe("CLUB_ONLY");
    const picked = next(b, ["game:state"], (s) => s.state.picked[aSeat] === true);
    await ack(a, "game:move", { code, action: "pick", key: clubA.key });
    const half = await picked;
    expect(half.state.picks).toBeNull();
    expect(JSON.stringify(half.state)).not.toContain(clubA.key);
    const revealed = next(a, ["game:state"], (s) => s.state.phase === "answer");
    await ack(b, "game:move", { code, action: "pick", key: clubB.key });
    const open = await revealed;
    expect(open.state.picks[aSeat]).toBe(clubA.key);
    expect(open.state.answers).toBe(common.length);
    const wrongId = getGameData().players.find((p) => !common.some((c) => c.id === p.id))!.id;
    const minus = next(a, ["game:state"], (s) => s.state.scores[bSeat] === -1);
    await ack(b, "game:move", { code, action: "answer", playerId: wrongId });
    await minus;
    const done = next(a, ["game:state"], (s) => s.state.phase === "done");
    await ack(a, "game:move", { code, action: "answer", playerId: common[0]!.id });
    const after = await done;
    expect(after.state.scores[aSeat]).toBe(1);
    expect(after.state.result.seat).toBe(aSeat);
    const nextRound = next(a, ["game:state"], (s) => s.state.round === 2);
    await ack(a, "game:move", { code, action: "next" });
    await ack(b, "game:move", { code, action: "next" });
    const round2 = await nextRound;
    expect(round2.state.starter).toBe(bSeat);
    expect(round2.state.phase).toBe("pick");
  });

  it("never exposes real guest ids to the opponent", async () => {
    const guest = randomUUID();
    const a = client(guest);
    await connected(a);
    const created = await ack(a, "room:create", { game: "xox" });
    expect(JSON.stringify(created)).not.toContain(guest);
  });

  it("does not lose simultaneous answers", async () => {
    const { a, b, code } = await pair("higherLower");
    const both = next(a, ["game:state"], (state) => state.state.index === 1);
    await Promise.all([
      ack(a, "game:move", { code, direction: "up" }),
      ack(b, "game:move", { code, direction: "down" }),
    ]);
    const state = await both;
    expect(state.state.index).toBe(1);
  });

  it("marks a dropped player and forfeits them", async () => {
    const { a, b, bSeat, aSeat } = await pair("xox");
    const marked = next(a, ["room:state"], (state) =>
      state.players.some((p) => p.id === bSeat && !p.connected),
    );
    b.disconnect();
    await marked;
    const result = await next(a, ["game:result"], () => true, 5000);
    expect(result.endedReason).toBe("disconnect");
    expect(result.winnerId).toBe(aSeat);
  });

  it("lets a player reconnect to the same seat", async () => {
    const guest = randomUUID();
    const a = client(guest);
    const b = client();
    await Promise.all([connected(a), connected(b)]);
    const created = await ack(a, "room:create", { game: "xox" });
    const code = created.room.code;
    await ack(b, "room:join", { code, game: "xox" });
    a.disconnect();
    const again = client(guest);
    await connected(again);
    const rejoined = await ack(again, "room:join", { code, game: "xox" });
    expect(rejoined.youId).toBe(created.youId);
    expect(rejoined.room.status).toBe("playing");
    expect(rejoined.room.players.every((p: { connected: boolean }) => p.connected)).toBe(true);
  });

  it("surrender finishes the game but keeps both players for a rematch", async () => {
    const { a, b, code, bSeat } = await pair("orta");
    const finished = next(b, ["game:result"], (s) => s.status === "finished");
    await ack(a, "game:surrender", { code });
    const state = await finished;
    expect(state.winnerId).toBe(bSeat);
    expect(state.endedReason).toBe("surrender");
    expect(state.players).toHaveLength(2);
    const restarted = next(a, ["game:state"], (s) => s.status === "playing");
    await ack(a, "game:rematch", { code });
    await ack(b, "game:rematch", { code });
    expect((await restarted).status).toBe("playing");
  });

  it("passes the XOX turn on timeout", async () => {
    const { a, code, aSeat, bSeat, state } = await pair("xox");
    expect(state.state.turn).toBe(aSeat);
    const passed = next(a, ["game:state"], (s) => s.state.turn === bSeat);
    await expire(code);
    const after = await passed;
    expect(after.state.lastEvent.type).toBe("timeout");
  });

  it("plays İki hərf: letters are picked, wrong answers cost 3 seconds, a timeout loses the round", async () => {
    const { a, b, code, aSeat, bSeat, state } = await pair("twoLetters", {
      seconds: 10,
      target: 3,
      difficulty: "normal",
    });
    expect(state.state.picker).toBe(aSeat);
    const early = await ack(b, "game:move", { code, action: "letter", letter: "E" });
    expect(early.error?.code).toBe("NOT_YOUR_TURN");
    await ack(a, "game:move", { code, action: "letter", letter: "E" });
    const same = await ack(b, "game:move", { code, action: "letter", letter: "E" });
    expect(same.error?.code).toBe("INVALID_LETTER");
    const playing = next(a, ["game:state"], (s) => s.state.phase === "play");
    await ack(b, "game:move", { code, action: "letter", letter: "R" });
    const play = await playing;
    expect(play.state.letters).toEqual(["E", "R"]);
    expect(play.state.turn).toBe(aSeat);
    const data = getGameData();
    const good = data.players.filter((p) => hasLetters(data, p, "E", "R"));
    const bad = data.players.find((p) => !hasLetters(data, p, "E", "R"))!;
    const before = play.state.deadline as number;
    const penalised = next(a, ["game:state"], (s) => s.state.penalties === 1);
    await ack(a, "game:move", { code, action: "answer", playerId: bad.id });
    expect((await penalised).state.deadline).toBeLessThan(before);
    const passed = next(a, ["game:state"], (s) => s.state.turn === bSeat);
    await ack(a, "game:move", { code, action: "answer", playerId: good[0]!.id });
    await passed;
    const used = await ack(b, "game:move", { code, action: "answer", playerId: good[0]!.id });
    expect(used.error?.code).toBe("PLAYER_USED");
    const lost = next(a, ["game:state"], (s) => s.state.phase === "round");
    await expire(code);
    const round = await lost;
    expect(round.state.result).toMatchObject({ winner: aSeat, loser: bSeat, reason: "time" });
    expect(round.state.scores[aSeat]).toBe(1);
  });

  it("plays 20 questions: secrets are picked by players and the fewest questions wins", async () => {
    const { a, b, code, aSeat, bSeat } = await pair("sual", {
      maxQuestions: 10,
      era: "all",
      difficulty: "easy",
    });
    const data = getGameData();
    const secretForB = data.players.find((p) => p.is_active !== false && p.club_history?.length)!;
    await ack(a, "game:move", { code, action: "secret", playerId: secretForB.id });
    const started = next(a, ["game:state"], (s) => s.state.phase === "play");
    await ack(b, "game:move", { code, action: "secret", random: true });
    const play = await started;
    expect(play.state.secrets).toBeNull();
    expect(play.state.turn).toBe(aSeat);
    const room = await rawRoom(code);
    const secretForA = data.playersById.get(room.state.secrets[bSeat])!;
    const asked = next(b, ["game:state"], (s) => s.state.items[aSeat].length === 1);
    await ack(a, "game:move", { code, action: "ask", questionId: "active" });
    const afterAsk = await asked;
    expect(afterAsk.state.items[aSeat][0].answer).toBe(QUESTION_TESTS.active!(secretForA, data));
    expect(afterAsk.state.turn).toBe(bSeat);
    const again = await ack(b, "game:move", { code, action: "ask", questionId: "active" });
    expect(again.error).toBeUndefined();
    const wrongId = data.players.find((p) => p.id !== secretForB.id && p.id !== secretForA.id)!.id;
    const found = next(b, ["game:state"], (s) => s.state.found[aSeat] === 2);
    await ack(a, "game:move", { code, action: "guess", playerId: secretForA.id });
    const lastChance = await found;
    expect(lastChance.state.lastChance).toBe(true);
    expect(lastChance.state.turn).toBe(bSeat);
    const result = next(a, ["game:result"]);
    await ack(b, "game:move", { code, action: "guess", playerId: wrongId });
    const finished = await result;
    expect(finished.winnerId).toBe(aSeat);
    expect(finished.state.secrets[aSeat]).toBe(secretForB.id);
  });

  it("Kimdir bu: buzzing pauses the tiles, a wrong answer locks the player for 4 tiles", async () => {
    const { a, b, code, aSeat, state } = await pair("sekil", { grid: 24, speed: 2, target: 3 });
    expect(state.state.size).toBe(24);
    expect(state.state.order).toHaveLength(24);
    expect(JSON.stringify(state.state)).not.toContain(`"playerId"`);
    const early = await ack(a, "game:move", { code, action: "buzz" });
    expect(early.error?.code).toBe("NOT_STARTED");
    await new Promise((resolve) => setTimeout(resolve, 1700));
    const buzzed = next(b, ["game:state"], (s) => s.state.answering === aSeat);
    await ack(a, "game:move", { code, action: "buzz" });
    await buzzed;
    const other = await ack(b, "game:move", { code, action: "buzz" });
    expect(other.error?.code).toBe("NOT_YOUR_TURN");
    const room = await rawRoom(code);
    const wrongId = getGameData().players.find((p) => p.id !== room.state.playerId)!.id;
    const locked = next(a, ["game:state"], (s) => s.state.answering === null);
    await ack(a, "game:move", { code, action: "answer", playerId: wrongId });
    const after = await locked;
    expect(after.state.lockUntil[aSeat]).toBe(after.state.opened + 4);
    const blocked = await ack(a, "game:move", { code, action: "buzz" });
    expect(blocked.error?.code).toBe("LOCKED");
    await ack(b, "game:move", { code, action: "buzz" });
    const won = next(a, ["game:state"], (s) => s.state.phase === "round");
    await ack(b, "game:move", { code, action: "answer", playerId: room.state.playerId });
    const round = await won;
    expect(round.state.result.playerId).toBe(room.state.playerId);
  });

  it("XOX uses the host's settings: steals, timer and rounds to win", async () => {
    const { a, code, aSeat, state } = await pair("xox", {
      steals: 3,
      timer: 15,
      target: 1,
      difficulty: "easy",
      categories: { country: true, trophy: false, coach: false },
    });
    expect(state.state.steals[aSeat]).toBe(3);
    expect(state.state.deadline - state.serverNow).toBeLessThanOrEqual(15_000);
    const room = await rawRoom(code);
    const puzzle = buildPuzzle("xox", getGameData(), (room.seed + 7_919) >>> 0, {
      difficulty: "easy",
      categories: { country: true, trophy: false, coach: false },
    });
    const grid = puzzle.grid as { rows: { ids: Set<number> }[]; cols: { ids: Set<number> }[] };
    const playerId = [...grid.rows[0]!.ids].find((id) => grid.cols[0]!.ids.has(id));
    const moved = next(a, ["game:state"], (s) => Boolean(s.state.cells[0]));
    await ack(a, "game:move", { code, cell: 0, playerId });
    expect((await moved).state.cells[0].mark).toBe("X");
  });

  it("hides the mystery auction player until the lot is sold", async () => {
    const { state } = await pair("auction", {
      mystery: true,
      formation: { ANY: 5 },
      timer: 10,
      pool: "wide",
    });
    expect(state.state.slots).toEqual(["ANY", "ANY", "ANY", "ANY", "ANY"]);
    expect(state.state.actionMs).toBe(10_000);
    if (state.state.lot.clue) {
      expect(state.state.lot.playerId).toBeNull();
      expect(state.state.lot.clue.key).toBeTruthy();
    }
  });

  it("runs an auction lot: opener bids, opponent passes, player is sold", async () => {
    const { a, b, code, state } = await pair("auction");
    const lot = state.state.lot;
    const opener = lot.opener === state.players[0]!.id ? a : b;
    const other = opener === a ? b : a;
    const early = await ack(other, "game:move", { code, action: "bid", amount: 2 });
    expect(early.error?.code).toBe("OPENER_FIRST");
    await ack(opener, "game:move", { code, action: "bid", amount: 6 });
    const sold = next(a, ["game:state"], (s) => s.state.phase === "sold");
    await ack(other, "game:move", { code, action: "pass" });
    const after = await sold;
    expect(after.state.outcome.price).toBe(6);
    const winnerTeam = after.state.teams[after.state.outcome.seat];
    expect(winnerTeam.money).toBe(34);
  });

  it("finishes an auction when every lot is passed", async () => {
    const { a, b, code } = await pair("auction");
    const result = next(a, ["game:result"], () => true, 30_000);
    for (let i = 0; i < 40; i++) {
      const room = await rawRoom(code);
      if (room.status === "finished") break;
      if (room.state.phase === "sold") {
        await expire(code);
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
      const lot = room.state.lot;
      const [seatA] = room.players.map((p: { seat: string }) => p.seat);
      const opener = lot.opener === seatA ? a : b;
      const other = opener === a ? b : a;
      if (!lot.leader) await ack(opener, "game:move", { code, action: "bid", amount: 2 });
      await ack(other, "game:move", { code, action: "pass" });
    }
    const finished = await result;
    expect(finished.status).toBe("finished");
    const teams = Object.values(finished.state.teams) as { slots: { pick: unknown }[] }[];
    expect(teams.every((team) => team.slots.every((slot) => slot.pick))).toBe(true);
  });
});
