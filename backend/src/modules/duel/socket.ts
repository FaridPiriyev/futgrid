import type { Server as HttpServer } from "node:http";
import { randomBytes, randomInt } from "node:crypto";
import Redis from "ioredis";
import { Server, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import {
  buildPuzzle,
  hasLetters,
  seeded,
  verifyAnswer,
  type Category,
} from "@futgrid/game-core";
import { config } from "../../config.js";
import { getGameData } from "../../lib/data.js";
import { isUuid, verifyAccessToken } from "../../lib/crypto.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { sendPushToUser } from "../../lib/push.js";

type DuelGame = "xox" | "higherLower" | "twoLetters" | "orta" | "sual" | "sekil" | "auction";

interface DuelPlayer {
  id: string;
  name: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  guest: boolean;
  socketId: string;
  connected: boolean;
}

interface BaseState {
  game: DuelGame;
  players: DuelPlayer[];
  hostId: string;
  status: "waiting" | "playing" | "finished";
  seed: number;
  startedAt?: number;
  rematch: string[];
  state: Record<string, unknown>;
  winnerId?: string;
  loserId?: string;
  endedReason?: string;
}

interface SocketIdentity {
  id: string;
  name: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  guest: boolean;
}

const roomKey = (code: string) => `duel:room:${code}`;
const disconnectTimers = new Map<string, NodeJS.Timeout>();
const auctionTimers = new Map<string, NodeJS.Timeout>();
const SUPPORTED_GAMES: DuelGame[] = ["xox", "higherLower", "twoLetters", "orta", "sual", "sekil", "auction"];

function code6(): string {
  return String(randomInt(100000, 1000000));
}

function serializeEntity(entity: { key: string; type: string; label: string; club?: { id: number; name: string }; code?: string; flag?: string; image?: string | null; images?: string[] }) {
  return {
    key: entity.key,
    type: entity.type,
    label: entity.label,
    ...(entity.club ? { club: { id: entity.club.id, name: entity.club.name } } : {}),
    ...(entity.code ? { code: entity.code } : {}),
    ...(entity.flag ? { flag: entity.flag } : {}),
    ...(entity.image ? { image: entity.image } : {}),
    ...(entity.images ? { images: entity.images } : {}),
  };
}

function serializeCategory(category: Category) {
  return {
    key: category.key,
    type: category.type,
    label: category.label,
    tier: category.tier,
    ...(category.club ? { club: { id: category.club.id, name: category.club.name } } : {}),
    ...(category.code ? { code: category.code } : {}),
    ...(category.flag ? { flag: category.flag } : {}),
    ...(category.trophyId ? { trophyId: category.trophyId } : {}),
    ...(category.min ? { min: category.min } : {}),
    ...(category.coach ? { coach: { id: category.coach.id, name: category.coach.name } } : {}),
    ...(category.image ? { image: category.image } : {}),
    ...(category.photo ? { photo: category.photo } : {}),
  };
}

async function readRoom(redis: Redis, code: string): Promise<BaseState | null> {
  const raw = await redis.get(roomKey(code));
  if (!raw) return null;
  return JSON.parse(raw) as BaseState;
}

function codeOf(room: BaseState): string {
  return String(room.state.code ?? "");
}

async function persistRoom(redis: Redis, room: BaseState): Promise<void> {
  await redis.set(roomKey(codeOf(room)), JSON.stringify(room), "EX", 3600);
}

function identityFromSocket(socket: Socket): Promise<SocketIdentity | null> {
  return (async () => {
    const auth = (socket.handshake.auth ?? {}) as { token?: string; guestId?: string };
    const header = socket.handshake.headers.authorization;
    const token = auth.token ?? (header?.startsWith("Bearer ") ? header.slice(7) : null);
    if (token) {
      const claims = await verifyAccessToken(token);
      if (claims) {
        const user = await prisma.user.findUnique({
          where: { id: claims.sub },
          select: { id: true, username: true, displayName: true, avatarUrl: true, blockedAt: true, deletedAt: true },
        });
        if (user && !user.blockedAt && !user.deletedAt) {
          return {
            id: user.id,
            name: user.displayName ?? user.username,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            guest: false,
          };
        }
      }
    }
    const guestId = auth.guestId ?? String(socket.handshake.headers["x-guest-id"] ?? "");
    if (isUuid(guestId)) {
      return { id: guestId, name: `Guest ${guestId.slice(0, 4)}`, guest: true };
    }
    const cookieHeader = socket.handshake.headers.cookie ?? "";
    const accessCookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("futgrid_access="))
      ?.slice("futgrid_access=".length);
    if (accessCookie) {
      const claims = await verifyAccessToken(decodeURIComponent(accessCookie));
      if (claims) {
        const user = await prisma.user.findUnique({
          where: { id: claims.sub },
          select: { id: true, username: true, displayName: true, avatarUrl: true, blockedAt: true, deletedAt: true },
        });
        if (user && !user.blockedAt && !user.deletedAt) {
          return {
            id: user.id,
            name: user.displayName ?? user.username,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            guest: false,
          };
        }
      }
    }
    return null;
  })();
}

const XOX_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function xoxWinner(board: (string | null)[]): string | null {
  for (const line of XOX_LINES) {
    const [a, b, c] = line as [number, number, number];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a] ?? null;
  }
  return null;
}

async function startGame(redis: Redis, io: Server, room: BaseState): Promise<BaseState> {
  room.status = "playing";
  room.startedAt = Date.now();
  room.rematch = [];
  room.winnerId = undefined;
  room.loserId = undefined;
  room.endedReason = undefined;
  const seed = randomBytes(4).readUInt32BE(0);
  room.seed = seed;
  if (room.game === "xox") {
    const puzzle = buildPuzzle("xox", getGameData(), seed, {
      difficulty: "normal",
      categories: { country: true, trophy: true, coach: false },
    });
    const grid = puzzle.grid as { rows: Category[]; cols: Category[] };
    room.state = {
      code: codeOf(room),
      grid: {
        rows: grid.rows.map(serializeCategory),
        cols: grid.cols.map(serializeCategory),
      },
      board: Array(9).fill(null),
      cells: Array(9).fill(null),
      turn: room.players[0]?.id,
      marks: { [room.players[0]?.id ?? ""]: "X", [room.players[1]?.id ?? ""]: "O" },
      usedPlayers: [],
    };
  } else if (room.game === "orta") {
    const puzzle = buildPuzzle("orta", getGameData(), seed, {
      difficulty: "normal",
      rounds: 10,
    });
    const pairs = puzzle.pairs as { key: string; a: any; b: any; answers: number }[];
    room.state = {
      code: codeOf(room),
      pairs: pairs.map((pair) => ({
        key: pair.key,
        a: serializeEntity(pair.a),
        b: serializeEntity(pair.b),
        answers: pair.answers,
      })),
      round: 0,
      scores: Object.fromEntries(room.players.map((player) => [player.id, 0])),
    };
  } else if (room.game === "sual") {
    const data = getGameData();
    const pool = data.players.filter((player) => player.position && player.nationality_code);
    const random = seeded(seed);
    const secret = pool[Math.floor(random() * pool.length)];
    room.state = {
      code: codeOf(room),
      round: 0,
      maxRounds: 5,
      scores: Object.fromEntries(room.players.map((player) => [player.id, 0])),
      secretId: secret?.id ?? 0,
    };
  } else if (room.game === "sekil") {
    const data = getGameData();
    const pool = data.players.filter((player) => player.photo_url);
    const random = seeded(seed);
    const secret = pool[Math.floor(random() * pool.length)];
    const order = Array.from({ length: 16 }, (_, index) => index);
    for (let index = order.length - 1; index > 0; index--) {
      const swap = Math.floor(random() * (index + 1));
      [order[index], order[swap]] = [order[swap] as number, order[index] as number];
    }
    room.state = {
      code: codeOf(room),
      round: 0,
      maxRounds: 5,
      scores: Object.fromEntries(room.players.map((player) => [player.id, 0])),
      playerId: secret?.id ?? 0,
      photoUrl: secret?.photo_url ?? "",
      order,
      opened: 0,
      grid: 16,
    };
  } else if (room.game === "auction") {
    const data = getGameData();
    const random = seeded(seed);
    const positions = ["GK", "DF", "MF", "FW", "FW"] as const;
    const pool = data.players.filter(
      (player) => player.is_active !== false && player.position && (player.market_value?.amount_eur ?? 0) > 0,
    );
    const lots = Array.from({ length: 12 }, (_, index) => {
      const free = pool.filter((player) => player.position === positions[index % 5]);
      const player = free[Math.floor(random() * free.length)];
      const value = player?.market_value?.amount_eur ?? 0;
      const rating = Math.max(60, Math.min(97, Math.round(70 + 9.13 * Math.log10(Math.max(1, value) / 1e6))));
      return player
        ? { playerId: player.id, pos: player.position ?? "MF", rating, start: rating >= 89 ? 4 : rating >= 85 ? 2 : 1 }
        : null;
    }).filter(Boolean) as { playerId: number; pos: string; rating: number; start: number }[];
    room.state = {
      code: codeOf(room),
      round: 0,
      maxLots: lots.length,
      phase: "lot",
      lots,
      lot: null,
      teams: Object.fromEntries(
        room.players.map((player) => [
          player.id,
          { money: 40, slots: positions.map((pos) => ({ pos, pick: null })) },
        ]),
      ),
    };
    await openAuctionLot(redis, io, room);
    return room;
  } else if (room.game === "higherLower") {
    const puzzle = buildPuzzle("higherLower", getGameData(), seed, {
      difficulty: "normal",
      rounds: 10,
    });
    const sequence = puzzle.sequence as { aId: number; bId: number; aValue: number; bValue: number }[];
    room.state = {
      code: codeOf(room),
      sequence,
      index: 0,
      scores: Object.fromEntries(room.players.map((player) => [player.id, 0])),
      answers: {},
      revealed: null,
    };
  } else {
    const puzzle = buildPuzzle("twoLetters", getGameData(), seed, {
      difficulty: "normal",
      rounds: 10,
    });
    room.state = {
      code: codeOf(room),
      pairs: puzzle.pairs,
      index: 0,
      scores: Object.fromEntries(room.players.map((player) => [player.id, 0])),
      turn: room.players[0]?.id,
      usedPlayers: [],
    };
  }
  await persistRoom(redis, room);
  io.to(codeOf(room)).emit("game:state", publicState(room));
  return room;
}

function publicState(room: BaseState) {
  let state = room.state;
  if (room.game === "sual") {
    const source = room.state as { code: string; round: number; scores: Record<string, number>; maxRounds: number };
    state = { code: source.code, round: source.round, scores: source.scores, maxRounds: source.maxRounds };
  }
  if (room.game === "sekil") {
    const source = room.state as {
      code: string;
      round: number;
      scores: Record<string, number>;
      photoUrl: string;
      opened: number;
      grid: number;
    };
    state = {
      code: source.code,
      round: source.round,
      scores: source.scores,
      photoUrl: source.photoUrl,
      opened: source.opened,
      grid: source.grid,
    };
  }
  if (room.game === "auction") {
    const source = room.state as {
      code: string;
      round: number;
      maxLots: number;
      phase: string;
      lot: { playerId: number; pos: string; rating: number; price: number; leader: string | null; deadline: number } | null;
      teams: Record<string, { money: number; slots: { pos: string; pick: { playerId: number; rating: number; price: number } | null }[] }>;
    };
    state = {
      code: source.code,
      round: source.round,
      maxLots: source.maxLots,
      phase: source.phase,
      lot: source.lot
        ? {
            ...source.lot,
            name: getGameData().playersById.get(source.lot.playerId)?.name ?? "",
          }
        : null,
      teams: source.teams,
    };
  }
  if (room.game === "higherLower" && Array.isArray((room.state as { sequence?: unknown }).sequence)) {
    const source = room.state as {
      code: string;
      sequence: { aId: number; bId: number; aValue: number; bValue: number }[];
      index: number;
      scores: Record<string, number>;
      answers: Record<string, "up" | "down">;
      revealed: unknown;
    };
    const current = source.sequence[source.index];
    state = {
      code: source.code,
      index: source.index,
      scores: source.scores,
      answers: source.answers,
      revealed: source.revealed,
      current: current
        ? { aId: current.aId, bId: current.bId, aValue: current.aValue }
        : null,
    };
  }
  return {
    code: codeOf(room),
    game: room.game,
    status: room.status,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      username: player.username,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      guest: player.guest,
      connected: player.connected,
    })),
    hostId: room.hostId,
    winnerId: room.winnerId ?? null,
    loserId: room.loserId ?? null,
    endedReason: room.endedReason ?? null,
    state,
  };
}

async function finishGame(
  redis: Redis,
  io: Server,
  room: BaseState,
  winnerId: string | null,
  reason: string,
): Promise<void> {
  if (room.status !== "playing") return;
  room.status = "finished";
  room.endedReason = reason;
  room.winnerId = winnerId ?? undefined;
  room.loserId = winnerId
    ? room.players.find((player) => player.id !== winnerId)?.id
    : undefined;
  await persistRoom(redis, room);
  await recordMatch(room, reason);
  io.to(codeOf(room)).emit("game:result", publicState(room));
  for (const player of room.players) {
    if (player.guest) continue;
    const won = player.id === room.winnerId;
    void sendPushToUser(
      player.id,
      won ? "Duel won" : room.winnerId ? "Duel lost" : "Duel draw",
      `${room.game} · room ${codeOf(room)}`,
      { type: "duel_result", code: codeOf(room), game: room.game },
    ).catch(() => {});
  }
}

async function recordMatch(room: BaseState, reason: string): Promise<void> {
  const playerIds = room.players.map((player) => player.id);
  await prisma.duelMatch.create({
    data: {
      gameId: room.game,
      roomCode: codeOf(room),
      winnerId: room.winnerId ?? null,
      loserId: room.loserId ?? null,
      playerIds,
      score: room.state as unknown as import("@prisma/client").Prisma.InputJsonValue,
      durationMs: room.startedAt ? Date.now() - room.startedAt : null,
      endedReason: reason,
    },
  });
  if (room.winnerId && room.loserId) {
    await updateRatings(room.game, room.winnerId, room.loserId);
  } else {
    for (const id of playerIds) {
      if (!isUuid(id)) continue;
      await prisma.userRating.upsert({
        where: { userId_gameId: { userId: id, gameId: room.game } },
        update: { games: { increment: 1 } },
        create: { userId: id, gameId: room.game, games: 1 },
      });
    }
  }
}

async function updateRatings(game: string, winnerId: string, loserId: string): Promise<void> {
  if (!isUuid(winnerId) || !isUuid(loserId)) return;
  const [winner, loser] = await Promise.all([
    prisma.userRating.upsert({
      where: { userId_gameId: { userId: winnerId, gameId: game } },
      update: {},
      create: { userId: winnerId, gameId: game },
    }),
    prisma.userRating.upsert({
      where: { userId_gameId: { userId: loserId, gameId: game } },
      update: {},
      create: { userId: loserId, gameId: game },
    }),
  ]);
  const expected = 1 / (1 + 10 ** ((loser.rating - winner.rating) / 400));
  const delta = 16 * (1 - expected);
  await prisma.$transaction([
    prisma.userRating.update({
      where: { id: winner.id },
      data: {
        rating: Math.round((winner.rating + delta) * 10) / 10,
        games: { increment: 1 },
        wins: { increment: 1 },
      },
    }),
    prisma.userRating.update({
      where: { id: loser.id },
      data: {
        rating: Math.round((loser.rating - delta) * 10) / 10,
        games: { increment: 1 },
        losses: { increment: 1 },
      },
    }),
  ]);
}


async function openAuctionLot(redis: Redis, io: Server, room: BaseState): Promise<void> {
  const state = room.state as {
    round: number;
    maxLots: number;
    lots: { playerId: number; pos: string; rating: number; start: number }[];
    lot: { playerId: number; pos: string; rating: number; start: number; price: number; leader: string | null; deadline: number; passed: string[] } | null;
    phase: string;
    teams: Record<string, { money: number; slots: { pos: string; pick: unknown }[] }>;
  };
  const timer = auctionTimers.get(codeOf(room));
  if (timer) clearTimeout(timer);
  const full = Object.values(state.teams).every((team) => team.slots.every((slot) => slot.pick));
  const definition = state.lots[state.round];
  if (!definition || full) {
    const scores = Object.entries(state.teams).map(([id, team]) => [
      id,
      team.slots.reduce((sum, slot) => {
        const pick = slot.pick as { rating?: number } | null;
        return sum + (pick?.rating ?? 0);
      }, 0),
    ]);
    const sorted = scores.sort((a, b) => Number(b[1]) - Number(a[1]));
    const winner = sorted[0] && sorted[1] && sorted[0][1] !== sorted[1][1] ? String(sorted[0][0]) : null;
    state.phase = "finished";
    await finishGame(redis, io, room, winner, winner ? "win" : "draw");
    return;
  }
  state.lot = { ...definition, price: definition.start, leader: null, deadline: Date.now() + 10_000, passed: [] };
  state.phase = "lot";
  await persistRoom(redis, room);
  io.to(codeOf(room)).emit("game:state", publicState(room));
  auctionTimers.set(
    codeOf(room),
    setTimeout(() => {
      void closeAuctionLotFor(redis, io, codeOf(room));
    }, 10_000),
  );
}

async function closeAuctionLotFor(redis: Redis, io: Server, code: string): Promise<void> {
  const room = await readRoom(redis, code);
  if (!room || room.game !== "auction" || room.status !== "playing") return;
  const state = room.state as {
    round: number;
    lot: { playerId: number; pos: string; rating: number; price: number; leader: string | null } | null;
    teams: Record<string, { money: number; slots: { pos: string; pick: { playerId: number; rating: number; price: number } | null }[] }>;
  };
  if (!state.lot) return;
  if (state.lot.leader) {
    const team = state.teams[state.lot.leader];
    const slot = team?.slots.find((entry) => !entry.pick && entry.pos === state.lot?.pos);
    if (team && slot) {
      slot.pick = { playerId: state.lot.playerId, rating: state.lot.rating, price: state.lot.price };
      team.money -= state.lot.price;
    }
  }
  state.lot = null;
  state.round += 1;
  await persistRoom(redis, room);
  io.to(code).emit("game:state", publicState(room));
  await openAuctionLot(redis, io, room);
}

async function handleSualMove(
  redis: Redis,
  io: Server,
  room: BaseState,
  player: DuelPlayer,
  payload: { playerId?: number },
): Promise<string | null> {
  const data = getGameData();
  const state = room.state as { round: number; maxRounds: number; scores: Record<string, number>; secretId: number };
  if (Number(payload.playerId) !== state.secretId) return "WRONG_ANSWER";
  state.scores[player.id] = (state.scores[player.id] ?? 0) + 1;
  state.round++;
  const leader = Object.entries(state.scores).sort((a, b) => b[1] - a[1])[0];
  if (state.round >= state.maxRounds || (leader && leader[1] >= 3)) {
    const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0] && sorted[1] && sorted[0][1] !== sorted[1][1] ? sorted[0][0] : null;
    await finishGame(redis, io, room, winner, winner ? "win" : "draw");
    return null;
  }
  const random = seeded(room.seed + state.round * 7919);
  const pool = data.players.filter((entry) => entry.position && entry.nationality_code);
  state.secretId = pool[Math.floor(random() * pool.length)]?.id ?? state.secretId;
  await persistRoom(redis, room);
  io.to(codeOf(room)).emit("game:state", publicState(room));
  return null;
}

async function handleSekilMove(
  redis: Redis,
  io: Server,
  room: BaseState,
  player: DuelPlayer,
  payload: { playerId?: number },
): Promise<string | null> {
  const data = getGameData();
  const state = room.state as {
    round: number;
    maxRounds: number;
    scores: Record<string, number>;
    playerId: number;
    photoUrl: string;
    order: number[];
    opened: number;
  };
  if (Number(payload.playerId) !== state.playerId) return "WRONG_ANSWER";
  state.scores[player.id] = (state.scores[player.id] ?? 0) + 1;
  state.round++;
  const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
  if (state.round >= state.maxRounds || (sorted[0] && sorted[0][1] >= 3)) {
    const winner = sorted[0] && sorted[1] && sorted[0][1] !== sorted[1][1] ? sorted[0][0] : null;
    await finishGame(redis, io, room, winner, winner ? "win" : "draw");
    return null;
  }
  const random = seeded(room.seed + state.round * 104729);
  const pool = data.players.filter((entry) => entry.photo_url);
  const secret = pool[Math.floor(random() * pool.length)];
  const order = Array.from({ length: 16 }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [order[index], order[swap]] = [order[swap] as number, order[index] as number];
  }
  state.playerId = secret?.id ?? state.playerId;
  state.photoUrl = String(secret?.photo_url ?? state.photoUrl);
  state.order = order;
  state.opened = 0;
  await persistRoom(redis, room);
  io.to(codeOf(room)).emit("game:state", publicState(room));
  return null;
}

async function handleAuctionMove(
  redis: Redis,
  io: Server,
  room: BaseState,
  player: DuelPlayer,
  payload: { action?: string; amount?: number },
): Promise<string | null> {
  const state = room.state as {
    lot: { price: number; leader: string | null; deadline: number; pos: string; passed: string[] } | null;
    teams: Record<string, { money: number; slots: { pos: string; pick: unknown }[] }>;
  };
  if (!state.lot || room.status !== "playing") return "GAME_NOT_ACTIVE";
  if (payload.action === "pass") {
    if (!state.lot.passed.includes(player.id)) state.lot.passed.push(player.id);
    await persistRoom(redis, room);
    io.to(codeOf(room)).emit("game:state", publicState(room));
    return null;
  }
  const amount = Math.floor(Number(payload.amount));
  const team = state.teams[player.id];
  if (!team) return "NOT_IN_ROOM";
  if (!Number.isFinite(amount) || amount <= state.lot.price) return "INVALID_BID";
  if (amount > team.money) return "NOT_ENOUGH_MONEY";
  if (!team.slots.some((slot) => !slot.pick && slot.pos === state.lot?.pos)) return "NO_SLOT";
  state.lot.price = amount;
  state.lot.leader = player.id;
  state.lot.deadline = Date.now() + 8_000;
  const timer = auctionTimers.get(codeOf(room));
  if (timer) clearTimeout(timer);
  auctionTimers.set(
    codeOf(room),
    setTimeout(() => {
      void closeAuctionLotFor(redis, io, codeOf(room));
    }, 8_000),
  );
  await persistRoom(redis, room);
  io.to(codeOf(room)).emit("game:state", publicState(room));
  return null;
}

async function handleXoxMove(
  redis: Redis,
  io: Server,
  room: BaseState,
  player: DuelPlayer,
  payload: { cell?: number; playerId?: number },
): Promise<string | null> {
  const state = room.state as {
    board: (string | null)[];
    cells: ({ mark: string; playerId: number; name: string } | null)[];
    turn: string;
    marks: Record<string, string>;
    usedPlayers: number[];
  };
  if (state.turn !== player.id) return "NOT_YOUR_TURN";
  const cell = Number(payload.cell);
  const playerId = Number(payload.playerId);
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) return "INVALID_CELL";
  if (state.board[cell]) return "CELL_TAKEN";
  if (!Number.isInteger(playerId) || state.usedPlayers.includes(playerId)) return "PLAYER_USED";
  const puzzle = buildPuzzle("xox", getGameData(), room.seed, {
    difficulty: "normal",
    categories: { country: true, trophy: true, coach: false },
  });
  const correct = verifyAnswer("xox", puzzle, { round: cell, playerId });
  if (!correct) {
    state.turn = room.players.find((entry) => entry.id !== player.id)?.id ?? state.turn;
    await persistRoom(redis, room);
    io.to(codeOf(room)).emit("game:state", publicState(room));
    return "WRONG_ANSWER";
  }
  state.board[cell] = state.marks[player.id] ?? "X";
  state.cells[cell] = {
    mark: state.marks[player.id] ?? "X",
    playerId,
    name: getGameData().playersById.get(playerId)?.name ?? String(playerId),
  };
  state.usedPlayers.push(playerId);
  const winnerMark = xoxWinner(state.board);
  if (winnerMark) {
    const winner = room.players.find((entry) => state.marks[entry.id] === winnerMark);
    await finishGame(redis, io, room, winner?.id ?? player.id, "win");
    return null;
  }
  if (state.board.every(Boolean)) {
    await finishGame(redis, io, room, null, "draw");
    return null;
  }
  state.turn = room.players.find((entry) => entry.id !== player.id)?.id ?? state.turn;
  await persistRoom(redis, room);
  io.to(codeOf(room)).emit("game:state", publicState(room));
  return null;
}

async function handleOrtaMove(
  redis: Redis,
  io: Server,
  room: BaseState,
  player: DuelPlayer,
  payload: { playerId?: number },
): Promise<string | null> {
  const state = room.state as {
    round: number;
    scores: Record<string, number>;
  };
  const puzzle = buildPuzzle("orta", getGameData(), room.seed, {
    difficulty: "normal",
    rounds: 10,
  });
  const pairs = puzzle.pairs as { a: { ids: Set<number> }; b: { ids: Set<number> } }[];
  const pair = pairs[state.round];
  if (!pair) return "GAME_OVER";
  const playerId = Number(payload.playerId);
  const correct =
    Number.isInteger(playerId) && pair.a.ids.has(playerId) && pair.b.ids.has(playerId);
  if (!correct) {
    state.scores[player.id] = (state.scores[player.id] ?? 0) - 1;
    await persistRoom(redis, room);
    io.to(codeOf(room)).emit("game:state", publicState(room));
    return "WRONG_ANSWER";
  }
  state.scores[player.id] = (state.scores[player.id] ?? 0) + 1;
  state.round++;
  const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
  const leader = sorted[0];
  if (state.round >= pairs.length || (leader && leader[1] >= 5)) {
    const winner =
      sorted[0] && sorted[1] && sorted[0][1] !== sorted[1][1] ? sorted[0][0] : null;
    await finishGame(redis, io, room, winner, winner ? "win" : "draw");
    return null;
  }
  await persistRoom(redis, room);
  io.to(codeOf(room)).emit("game:state", publicState(room));
  return null;
}

async function handleHigherLowerMove(
  redis: Redis,
  io: Server,
  room: BaseState,
  player: DuelPlayer,
  payload: { direction?: string },
): Promise<string | null> {
  const state = room.state as {
    sequence: { aId: number; bId: number; aValue: number; bValue: number }[];
    index: number;
    scores: Record<string, number>;
    answers: Record<string, "up" | "down">;
    revealed: unknown;
  };
  const round = state.sequence[state.index];
  if (!round) return "GAME_OVER";
  if (state.answers[player.id]) return "ALREADY_ANSWERED";
  if (payload.direction !== "up" && payload.direction !== "down") return "INVALID_DIRECTION";
  state.answers[player.id] = payload.direction;
  if (Object.keys(state.answers).length === room.players.length) {
    const correctDirection = round.bValue >= round.aValue ? "up" : "down";
    for (const [id, direction] of Object.entries(state.answers)) {
      if (direction === correctDirection) state.scores[id] = (state.scores[id] ?? 0) + 1;
    }
    state.revealed = {
      aId: round.aId,
      bId: round.bId,
      aValue: round.aValue,
      bValue: round.bValue,
      answers: state.answers,
      correctDirection,
    };
    state.answers = {};
    state.index++;
    const leader = Object.entries(state.scores).sort((a, b) => b[1] - a[1])[0];
    if (state.index >= state.sequence.length || (leader && leader[1] >= 5)) {
      const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
      const winner =
        sorted[0] && sorted[1] && sorted[0][1] !== sorted[1][1] ? sorted[0][0] : null;
      await finishGame(redis, io, room, winner, winner ? "win" : "draw");
      return null;
    }
  }
  await persistRoom(redis, room);
  io.to(codeOf(room)).emit("game:state", publicState(room));
  return null;
}

async function handleTwoLettersMove(
  redis: Redis,
  io: Server,
  room: BaseState,
  player: DuelPlayer,
  payload: { playerId?: number },
): Promise<string | null> {
  const state = room.state as {
    pairs: { a: string; b: string }[];
    index: number;
    scores: Record<string, number>;
    turn: string;
    usedPlayers: number[];
  };
  if (state.turn !== player.id) return "NOT_YOUR_TURN";
  const pair = state.pairs[state.index];
  if (!pair) return "GAME_OVER";
  const playerId = Number(payload.playerId);
  if (!Number.isInteger(playerId) || state.usedPlayers.includes(playerId)) return "PLAYER_USED";
  const data = getGameData();
  const entry = data.playersById.get(playerId);
  if (!entry || !hasLetters(data, entry, pair.a, pair.b)) return "WRONG_ANSWER";
  state.usedPlayers.push(playerId);
  state.scores[player.id] = (state.scores[player.id] ?? 0) + 1;
  state.index++;
  state.turn = room.players.find((item) => item.id !== player.id)?.id ?? state.turn;
  state.usedPlayers = [];
  const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
  if (state.index >= state.pairs.length || (sorted[0] && sorted[0][1] >= 3)) {
    const winner =
      sorted[0] && sorted[1] && sorted[0][1] !== sorted[1][1] ? sorted[0][0] : null;
    await finishGame(redis, io, room, winner, winner ? "win" : "draw");
    return null;
  }
  await persistRoom(redis, room);
  io.to(codeOf(room)).emit("game:state", publicState(room));
  return null;
}

function emitError(socket: Socket, code: string, message: string, ack?: (value: unknown) => void) {
  const payload = { error: { code, message } };
  socket.emit("error", payload);
  ack?.(payload);
}

export function setupDuels(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
    path: "/socket.io",
  });
  const pubClient = new Redis(config.REDIS_URL);
  const subClient = pubClient.duplicate();
  const redis = new Redis(config.REDIS_URL);
  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", async (socket) => {
    const identity = await identityFromSocket(socket);
    if (!identity) {
      socket.emit("error", { error: { code: "UNAUTHENTICATED", message: "Authentication required" } });
      socket.disconnect(true);
      return;
    }

    socket.on(
      "room:create",
      async (payload: { game?: string; settings?: Record<string, unknown> }, ack?: (value: unknown) => void) => {
        const game = payload?.game as DuelGame;
        if (!SUPPORTED_GAMES.includes(game)) {
          emitError(socket, "GAME_NOT_AVAILABLE", "This game is not available for online duels yet.", ack);
          return;
        }
        let code = code6();
        while (await redis.exists(roomKey(code))) code = code6();
        const room: BaseState = {
          game,
          players: [
            {
              id: identity.id,
              name: identity.name,
              username: identity.username,
              displayName: identity.displayName,
              avatarUrl: identity.avatarUrl,
              guest: identity.guest,
              socketId: socket.id,
              connected: true,
            },
          ],
          hostId: identity.id,
          status: "waiting",
          seed: 0,
          rematch: [],
          state: { code },
        };
        socket.join(code);
        await persistRoom(redis, room);
        ack?.({ room: publicState(room), youId: identity.id });
        socket.emit("room:state", publicState(room));
      },
    );

    socket.on(
      "room:join",
      async (payload: { code?: string; game?: string }, ack?: (value: unknown) => void) => {
        const code = String(payload?.code ?? "").toUpperCase();
        const room = await readRoom(redis, code);
        if (!room) {
          emitError(socket, "ROOM_NOT_FOUND", "Room not found.", ack);
          return;
        }
        if (!payload?.game) {
          emitError(socket, "GAME_REQUIRED", "Game type is required.", ack);
          return;
        }
        if (room.game !== payload.game) {
          emitError(socket, "ROOM_GAME_MISMATCH", "This room belongs to a different game.", ack);
          return;
        }
        let player = room.players.find((entry) => entry.id === identity.id);
        if (!player) {
          if (room.players.length >= 2 || room.status !== "waiting") {
            emitError(socket, "ROOM_FULL", "Room is full or already started.", ack);
            return;
          }
          player = {
            id: identity.id,
            name: identity.name,
            username: identity.username,
            displayName: identity.displayName,
            avatarUrl: identity.avatarUrl,
            guest: identity.guest,
            socketId: socket.id,
            connected: true,
          };
          room.players.push(player);
        } else {
          player.socketId = socket.id;
          player.connected = true;
        }
        const timer = disconnectTimers.get(code);
        if (timer) {
          clearTimeout(timer);
          disconnectTimers.delete(code);
        }
        socket.join(code);
        if (room.status === "waiting" && room.players.length === 2) {
          await startGame(redis, io, room);
        } else {
          await persistRoom(redis, room);
          io.to(code).emit("room:state", publicState(room));
        }
        ack?.({ room: publicState(room), youId: identity.id });
      },
    );

    socket.on(
      "game:start",
      async (payload: { code?: string; game?: string }, ack?: (value: unknown) => void) => {
        const code = String(payload?.code ?? "").toUpperCase();
        const room = await readRoom(redis, code);
        if (!room) {
          emitError(socket, "ROOM_NOT_FOUND", "Room not found.", ack);
          return;
        }
        if (!payload?.game) {
          emitError(socket, "GAME_REQUIRED", "Game type is required.", ack);
          return;
        }
        if (room.game !== payload.game) {
          emitError(socket, "ROOM_GAME_MISMATCH", "This room belongs to a different game.", ack);
          return;
        }
        if (room.hostId !== identity.id) {
          emitError(socket, "FORBIDDEN", "Only the host can start.", ack);
          return;
        }
        if (room.players.length < 2) {
          emitError(socket, "NOT_ENOUGH_PLAYERS", "At least two players are required.", ack);
          return;
        }
        await startGame(redis, io, room);
        ack?.({ ok: true, youId: identity.id });
      },
    );

    socket.on(
      "game:move",
      async (payload: { code?: string; cell?: number; playerId?: number; direction?: string; action?: string; amount?: number }, ack?: (value: unknown) => void) => {
        const code = String(payload?.code ?? "").toUpperCase();
        const room = await readRoom(redis, code);
        if (!room) {
          emitError(socket, "ROOM_NOT_FOUND", "Room not found.", ack);
          return;
        }
        if (room.status !== "playing") {
          emitError(socket, "GAME_NOT_ACTIVE", "Game is not active.", ack);
          return;
        }
        const player = room.players.find((entry) => entry.id === identity.id);
        if (!player) {
          emitError(socket, "NOT_IN_ROOM", "You are not in this room.", ack);
          return;
        }
        let error: string | null = null;
        if (room.game === "xox") error = await handleXoxMove(redis, io, room, player, payload);
        else if (room.game === "orta") error = await handleOrtaMove(redis, io, room, player, payload);
        else if (room.game === "higherLower") error = await handleHigherLowerMove(redis, io, room, player, payload);
        else if (room.game === "twoLetters") error = await handleTwoLettersMove(redis, io, room, player, payload);
        else if (room.game === "sual") error = await handleSualMove(redis, io, room, player, payload);
        else if (room.game === "sekil") error = await handleSekilMove(redis, io, room, player, payload);
        else error = await handleAuctionMove(redis, io, room, player, { action: payload.action, amount: payload.amount });
        if (error) emitError(socket, error, error, ack);
        else ack?.({ ok: true });
      },
    );

    socket.on("game:rematch", async (payload: { code?: string }, ack?: (value: unknown) => void) => {
      const code = String(payload?.code ?? "").toUpperCase();
      const room = await readRoom(redis, code);
      if (!room) {
        emitError(socket, "ROOM_NOT_FOUND", "Room not found.", ack);
        return;
      }
      if (!room.players.some((entry) => entry.id === identity.id)) {
        emitError(socket, "NOT_IN_ROOM", "You are not in this room.", ack);
        return;
      }
      if (room.status !== "finished") {
        emitError(socket, "GAME_NOT_FINISHED", "Finish the current game first.", ack);
        return;
      }
      if (!room.rematch.includes(identity.id)) room.rematch.push(identity.id);
      if (room.rematch.length >= room.players.length) {
        await startGame(redis, io, room);
      } else {
        await persistRoom(redis, room);
        io.to(code).emit("room:state", publicState(room));
      }
      ack?.({ ok: true });
    });

    socket.on("disconnect", async () => {
      const rooms = [...socket.rooms].filter((room) => room !== socket.id);
      for (const code of rooms) {
        const room = await readRoom(redis, code);
        if (!room) continue;
        const player = room.players.find((entry) => entry.socketId === socket.id);
        if (!player) continue;
        player.connected = false;
        await persistRoom(redis, room);
        io.to(code).emit("room:state", publicState(room));
        if (room.status === "playing") {
          const timer = setTimeout(async () => {
            const fresh = await readRoom(redis, code);
            if (!fresh || fresh.status !== "playing") return;
            const disconnected = fresh.players.find((entry) => entry.id === player.id);
            if (disconnected && !disconnected.connected) {
              const winner = fresh.players.find((entry) => entry.id !== player.id);
              await finishGame(redis, io, fresh, winner?.id ?? null, "disconnect");
            }
          }, 30_000);
          disconnectTimers.set(code, timer);
        }
      }
    });
  });

  return {
    io,
    async close() {
      for (const timer of disconnectTimers.values()) clearTimeout(timer);
      disconnectTimers.clear();
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await Promise.all([pubClient.quit(), subClient.quit(), redis.quit()]);
      logger.info("duel socket server closed");
    },
  };
}
