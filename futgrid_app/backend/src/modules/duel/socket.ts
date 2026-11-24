import type { Server as HttpServer } from "node:http";
import { randomBytes, randomInt } from "node:crypto";
import Redis from "ioredis";
import { Server, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { config } from "../../config.js";
import { getGameData } from "../../lib/data.js";
import { isUuid, verifyAccessToken } from "../../lib/crypto.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { sendPushToUser } from "../../lib/push.js";
import {
  SUPPORTED_GAMES,
  TIMERS_KEY,
  deleteRoom,
  dueRooms,
  newSeat,
  readRoom,
  roomExists,
  saveRoom,
  withRoomLock,
  type DuelGame,
  type DuelPlayer,
  type Room,
} from "./store.js";
import type { Ctx, GameModule } from "./games/common.js";
import { xox } from "./games/xox.js";
import { orta } from "./games/orta.js";
import { higherLower } from "./games/higherLower.js";
import { twoLetters } from "./games/twoLetters.js";
import { sual } from "./games/sual.js";
import { sekil } from "./games/sekil.js";
import { auction } from "./games/auction.js";

const GAMES: Record<DuelGame, GameModule> = {
  xox,
  orta,
  higherLower,
  twoLetters,
  sual,
  sekil,
  auction,
};

/** Bağlantı kəsiləndən neçə ms sonra oyunçu texniki məğlub sayılır. */
const forfeitMs = () => Number(process.env.DUEL_FORFEIT_MS ?? 30_000);
const SWEEP_MS = 500;

interface SocketIdentity {
  id: string;
  name: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  guest: boolean;
}

type Ack = (value: unknown) => void;

const code6 = () => String(randomInt(100000, 1000000));
const cleanCode = (value: unknown) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 6);

async function userIdentity(userId: string): Promise<SocketIdentity | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      blockedAt: true,
      deletedAt: true,
    },
  });
  if (!user || user.blockedAt || user.deletedAt) return null;
  return {
    id: user.id,
    name: user.displayName ?? user.username,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    guest: false,
  };
}

async function identityFromSocket(socket: Socket): Promise<SocketIdentity | null> {
  const auth = (socket.handshake.auth ?? {}) as { token?: string; guestId?: string };
  const header = socket.handshake.headers.authorization;
  const token = auth.token ?? (header?.startsWith("Bearer ") ? header.slice(7) : null);
  if (token) {
    const claims = await verifyAccessToken(token);
    if (claims) {
      const user = await userIdentity(claims.sub);
      if (user) return user;
    }
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
      const user = await userIdentity(claims.sub);
      if (user) return user;
    }
  }
  const guestId = auth.guestId ?? String(socket.handshake.headers["x-guest-id"] ?? "");
  if (isUuid(guestId))
    return { id: guestId, name: `Qonaq ${guestId.slice(0, 4).toUpperCase()}`, guest: true };
  return null;
}

function publicState(room: Room, ctx: Ctx) {
  return {
    code: room.code,
    game: room.game,
    status: room.status,
    serverNow: ctx.now,
    players: room.players.map((player) => ({
      id: player.seat,
      name: player.name,
      username: player.username,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      guest: player.guest,
      connected: player.connected,
      forfeitAt: player.forfeitAt ?? null,
    })),
    hostId: room.hostSeat,
    rematch: room.rematch,
    winnerId: room.winnerSeat ?? null,
    loserId: room.loserSeat ?? null,
    endedReason: room.endedReason ?? null,
    settings: room.settings ?? {},
    state: room.status === "waiting" ? {} : GAMES[room.game].view(room, ctx),
  };
}

async function updateRatings(game: string, winnerId: string, loserId: string): Promise<void> {
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

// Nəticə bazaya yazılır. Xəta oyunu heç vaxt dayandırmır (oyunçular nəticəni artıq görüb).
// Reytinq yalnız qeydiyyatlı istifadəçilər üçündür — qonaq ID-ləri users cədvəlində yoxdur.
async function recordMatch(room: Room): Promise<void> {
  try {
    const bySeat = new Map(room.players.map((player) => [player.seat, player]));
    const winner = room.winnerSeat ? bySeat.get(room.winnerSeat) : undefined;
    const loser = room.loserSeat ? bySeat.get(room.loserSeat) : undefined;
    await prisma.duelMatch.create({
      data: {
        gameId: room.game,
        roomCode: room.code,
        winnerId: winner && !winner.guest ? winner.identityId : null,
        loserId: loser && !loser.guest ? loser.identityId : null,
        playerIds: room.players.map((player) => player.identityId),
        score: JSON.parse(
          JSON.stringify({
            scores: room.state.scores ?? null,
            strength: room.state.strength ?? null,
          }),
        ),
        durationMs: room.startedAt ? Date.now() - room.startedAt : null,
        endedReason: room.endedReason ?? "finished",
      },
    });
    const users = room.players.filter((player) => !player.guest);
    if (winner && loser && !winner.guest && !loser.guest) {
      await updateRatings(room.game, winner.identityId, loser.identityId);
    } else {
      for (const player of users) {
        const won = player.seat === room.winnerSeat;
        const lost = player.seat === room.loserSeat;
        await prisma.userRating.upsert({
          where: { userId_gameId: { userId: player.identityId, gameId: room.game } },
          update: {
            games: { increment: 1 },
            ...(won ? { wins: { increment: 1 } } : {}),
            ...(lost ? { losses: { increment: 1 } } : {}),
          },
          create: {
            userId: player.identityId,
            gameId: room.game,
            games: 1,
            wins: won ? 1 : 0,
            losses: lost ? 1 : 0,
          },
        });
      }
    }
    for (const player of users) {
      const won = player.seat === room.winnerSeat;
      void sendPushToUser(
        player.identityId,
        won ? "Duel won" : room.winnerSeat ? "Duel lost" : "Duel draw",
        `${room.game} · room ${room.code}`,
        { type: "duel_result", code: room.code, game: room.game },
      ).catch(() => {});
    }
  } catch (error) {
    logger.error({ err: error, code: room.code, game: room.game }, "failed to record duel match");
  }
}

function startRoom(room: Room, ctx: Ctx) {
  room.status = "playing";
  room.startedAt = ctx.now;
  room.rematch = [];
  room.winnerSeat = null;
  room.loserSeat = null;
  room.endedReason = null;
  room.seed = randomBytes(4).readUInt32BE(0);
  for (const player of room.players)
    player.forfeitAt = player.connected ? null : ctx.now + forfeitMs();
  GAMES[room.game].start(room, ctx);
}

function newPlayer(identity: SocketIdentity, socket: Socket): DuelPlayer {
  return {
    seat: newSeat(),
    identityId: identity.id,
    name: identity.name,
    username: identity.username,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    guest: identity.guest,
    socketId: socket.id,
    connected: true,
    forfeitAt: null,
  };
}

export function setupDuels(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
    path: "/socket.io",
    pingInterval: 20_000,
    pingTimeout: 25_000,
  });
  const pubClient = new Redis(config.REDIS_URL);
  const subClient = pubClient.duplicate();
  const redis = new Redis(config.REDIS_URL);
  io.adapter(createAdapter(pubClient, subClient));

  type Outcome = {
    error?: string;
    changed?: boolean;
    event?: "room:state" | "game:state";
    value?: unknown;
  };

  /**
   * Otağı kilid altında dəyişir, saxlayır və hamıya göndərir.
   * `fn` xəta qaytararsa heç nə saxlanılmır.
   */
  async function mutate(
    code: string,
    fn: (room: Room, ctx: Ctx) => Outcome | Promise<Outcome>,
  ): Promise<Outcome & { room?: Room; ctx?: Ctx }> {
    let finished = false;
    const result = await withRoomLock(redis, code, async () => {
      const room = await readRoom(redis, code);
      if (!room) return { error: "ROOM_NOT_FOUND" } as Outcome & { room?: Room; ctx?: Ctx };
      const ctx: Ctx = {
        now: Date.now(),
        data: getGameData(),
        finish(winnerSeat, reason) {
          if (room.status !== "playing") return;
          room.status = "finished";
          room.endedReason = reason;
          room.winnerSeat = winnerSeat;
          room.loserSeat = winnerSeat
            ? (room.players.find((player) => player.seat !== winnerSeat)?.seat ?? null)
            : null;
          room.state.deadline = null;
          for (const player of room.players) player.forfeitAt = null;
          finished = true;
        },
      };
      const outcome = await fn(room, ctx);
      if (outcome.error || outcome.changed === false) return { ...outcome, room, ctx };
      await saveRoom(redis, room);
      const payload = publicState(room, ctx);
      if (finished) io.to(code).emit("game:result", payload);
      else io.to(code).emit(outcome.event ?? "game:state", payload);
      return { ...outcome, room, ctx };
    });
    if (finished && result.room) void recordMatch(result.room);
    return result;
  }

  let sweeping = false;
  async function sweep() {
    if (sweeping) return;
    sweeping = true;
    try {
      await sweepOnce();
    } finally {
      sweeping = false;
    }
  }

  async function sweepOnce() {
    const now = Date.now();
    let codes: string[] = [];
    try {
      codes = await dueRooms(redis, now);
    } catch (error) {
      logger.warn({ err: error }, "duel sweep failed");
      return;
    }
    for (const code of codes) {
      try {
        const result = await mutate(code, (room, ctx) => {
          if (room.status !== "playing") return { changed: true };
          // Bağlantısı kəsilib qayıtmayan oyunçu məğlub sayılır.
          const gone = room.players.find(
            (player) => !player.connected && player.forfeitAt && player.forfeitAt <= ctx.now,
          );
          if (gone) {
            const other = room.players.find((player) => player.seat !== gone.seat);
            ctx.finish(other?.seat ?? null, "disconnect");
            return { changed: true };
          }
          const deadline = Number(room.state.deadline);
          if (deadline && deadline <= ctx.now) GAMES[room.game].tick?.(room, ctx);
          return { changed: true };
        });
        // Otaq vaxtı keçib silinibsə, taymer siyahısından da çıxarılır.
        if (result.error === "ROOM_NOT_FOUND") await redis.zrem(TIMERS_KEY, code);
      } catch (error) {
        logger.warn({ err: error, code }, "duel tick failed");
      }
    }
  }
  const sweeper = setInterval(() => void sweep(), SWEEP_MS);
  let closing = false;

  io.on("connection", async (socket) => {
    let identity: SocketIdentity | null = null;
    try {
      identity = await identityFromSocket(socket);
    } catch (error) {
      logger.warn({ err: error }, "duel identity lookup failed");
    }
    if (!identity) {
      socket.emit("error", {
        error: { code: "UNAUTHENTICATED", message: "Authentication required" },
      });
      socket.disconnect(true);
      return;
    }
    const me = identity;

    // Sadə qoruma: bir socket-dən saniyədə çox hadisə gəlməsin.
    let bucket = 20;
    const refill = setInterval(() => (bucket = Math.min(20, bucket + 10)), 1000);
    socket.on("disconnect", () => clearInterval(refill));

    const reply = (ack: Ack | undefined, value: unknown) => {
      if (typeof ack === "function") ack(value);
    };
    const fail = (ack: Ack | undefined, code: string) => {
      const payload = { error: { code, message: code } };
      if (typeof ack === "function") ack(payload);
      else socket.emit("error", payload);
    };

    const on = (
      name: string,
      handler: (payload: Record<string, unknown>, ack?: Ack) => Promise<void>,
    ) => {
      socket.on(name, async (payload: unknown, ack?: Ack) => {
        if (typeof payload === "function") {
          ack = payload as Ack;
          payload = {};
        }
        if (bucket <= 0) return fail(ack, "RATE_LIMITED");
        bucket--;
        try {
          await handler((payload ?? {}) as Record<string, unknown>, ack);
        } catch (error) {
          const message = (error as Error)?.message;
          if (message === "ROOM_BUSY") return fail(ack, "ROOM_BUSY");
          logger.error({ err: error, event: name }, "duel handler failed");
          fail(ack, "INTERNAL");
        }
      });
    };

    on("room:create", async (payload, ack) => {
      const game = payload.game as DuelGame;
      if (!SUPPORTED_GAMES.includes(game)) return fail(ack, "GAME_NOT_AVAILABLE");
      let code = code6();
      while (await roomExists(redis, code)) code = code6();
      const player = newPlayer(me, socket);
      const room: Room = {
        v: 2,
        code,
        game,
        players: [player],
        hostSeat: player.seat,
        status: "waiting",
        seed: 0,
        rematch: [],
        state: {},
        settings: GAMES[game].settings?.(payload.settings) ?? {},
        createdAt: Date.now(),
      };
      await saveRoom(redis, room);
      await socket.join(code);
      const ctx: Ctx = { now: Date.now(), data: getGameData(), finish() {} };
      reply(ack, { room: publicState(room, ctx), youId: player.seat });
    });

    on("room:join", async (payload, ack) => {
      const code = cleanCode(payload.code);
      if (code.length !== 6) return fail(ack, "ROOM_NOT_FOUND");
      if (!payload.game) return fail(ack, "GAME_REQUIRED");
      let seat = "";
      const result = await mutate(code, (room, ctx) => {
        if (room.game !== payload.game) return { error: "ROOM_GAME_MISMATCH" };
        let player = room.players.find((entry) => entry.identityId === me.id);
        if (!player) {
          if (room.players.length >= 2 || room.status !== "waiting") return { error: "ROOM_FULL" };
          player = newPlayer(me, socket);
          room.players.push(player);
        } else {
          player.socketId = socket.id;
          player.connected = true;
          player.forfeitAt = null;
        }
        seat = player.seat;
        if (room.status === "waiting" && room.players.length === 2) {
          startRoom(room, ctx);
          return { event: "game:state" };
        }
        return { event: "room:state" };
      });
      if (result.error) return fail(ack, result.error);
      await socket.join(code);
      // Kilid bitəndən sonra qoşulan socket son vəziyyəti də alsın.
      if (result.room && result.ctx)
        socket.emit(
          result.room.status === "waiting" ? "room:state" : "game:state",
          publicState(result.room, result.ctx),
        );
      reply(ack, {
        room: result.room && result.ctx ? publicState(result.room, result.ctx) : null,
        youId: seat,
      });
    });

    on("room:leave", async (payload, ack) => {
      const code = cleanCode(payload.code);
      let removeRoom = false;
      const result = await mutate(code, (room, ctx) => {
        const player = room.players.find((entry) => entry.identityId === me.id);
        if (!player) return { error: "NOT_IN_ROOM" };
        if (room.status === "playing") {
          ctx.finish(
            room.players.find((entry) => entry.seat !== player.seat)?.seat ?? null,
            "left",
          );
          return { changed: true };
        }
        room.players = room.players.filter((entry) => entry.seat !== player.seat);
        room.rematch = room.rematch.filter((seat) => seat !== player.seat);
        if (!room.players.length) {
          removeRoom = true;
          return { changed: false };
        }
        if (room.hostSeat === player.seat) room.hostSeat = room.players[0]!.seat;
        // Bitmiş oyundan biri çıxanda otaq yenidən gözləmə rejiminə keçir.
        room.status = "waiting";
        return { event: "room:state" };
      });
      if (removeRoom) await deleteRoom(redis, code);
      await socket.leave(code);
      if (result.error && result.error !== "ROOM_NOT_FOUND") return fail(ack, result.error);
      reply(ack, { ok: true });
    });

    // Təslim ol: oyun bitir, amma oyunçu otaqda qalır — nəticəni görür və revanş istəyə bilir.
    on("game:surrender", async (payload, ack) => {
      const code = cleanCode(payload.code);
      const result = await mutate(code, (room, ctx) => {
        const player = room.players.find((entry) => entry.identityId === me.id);
        if (!player) return { error: "NOT_IN_ROOM" };
        if (room.status !== "playing") return { error: "GAME_NOT_ACTIVE" };
        ctx.finish(
          room.players.find((entry) => entry.seat !== player.seat)?.seat ?? null,
          "surrender",
        );
        return { changed: true };
      });
      if (result.error) return fail(ack, result.error);
      reply(ack, { ok: true });
    });

    on("game:start", async (payload, ack) => {
      const code = cleanCode(payload.code);
      const result = await mutate(code, (room, ctx) => {
        if (payload.game && room.game !== payload.game) return { error: "ROOM_GAME_MISMATCH" };
        const player = room.players.find((entry) => entry.identityId === me.id);
        if (!player) return { error: "NOT_IN_ROOM" };
        if (room.hostSeat !== player.seat) return { error: "FORBIDDEN" };
        if (room.players.length < 2) return { error: "NOT_ENOUGH_PLAYERS" };
        if (room.status === "playing") return { error: "ALREADY_STARTED" };
        startRoom(room, ctx);
        return { event: "game:state" };
      });
      if (result.error) return fail(ack, result.error);
      reply(ack, { ok: true });
    });

    on("game:move", async (payload, ack) => {
      const code = cleanCode(payload.code);
      const result = await mutate(code, (room, ctx) => {
        if (room.status !== "playing") return { error: "GAME_NOT_ACTIVE" };
        const player = room.players.find((entry) => entry.identityId === me.id);
        if (!player) return { error: "NOT_IN_ROOM" };
        const error = GAMES[room.game].move(room, player.seat, payload, ctx);
        return error ? { error } : { event: "game:state" };
      });
      if (result.error) return fail(ack, result.error);
      reply(ack, { ok: true });
    });

    on("game:rematch", async (payload, ack) => {
      const code = cleanCode(payload.code);
      const result = await mutate(code, (room, ctx) => {
        const player = room.players.find((entry) => entry.identityId === me.id);
        if (!player) return { error: "NOT_IN_ROOM" };
        if (room.status !== "finished") return { error: "GAME_NOT_FINISHED" };
        if (!room.rematch.includes(player.seat)) room.rematch.push(player.seat);
        if (room.players.length === 2 && room.rematch.length >= room.players.length) {
          // Revanşda o biri oyunçu başlayır.
          room.players.reverse();
          startRoom(room, ctx);
          return { event: "game:state" };
        }
        return { event: "room:state" };
      });
      if (result.error) return fail(ack, result.error);
      reply(ack, { ok: true });
    });

    // "disconnect" anında socket.rooms artıq boş olur — otaqları "disconnecting"-də götürürük.
    socket.on("disconnecting", () => {
      if (closing) return;
      const codes = [...socket.rooms].filter((room) => room !== socket.id);
      for (const code of codes) {
        void mutate(code, (room, ctx) => {
          const player = room.players.find((entry) => entry.socketId === socket.id);
          if (!player) return { changed: false };
          player.connected = false;
          if (room.status === "playing") player.forfeitAt = ctx.now + forfeitMs();
          return { event: "room:state" };
        }).catch((error) => logger.warn({ err: error, code }, "duel disconnect update failed"));
      }
    });
  });

  return {
    io,
    async close() {
      closing = true;
      clearInterval(sweeper);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await Promise.all([pubClient.quit(), subClient.quit(), redis.quit()]);
      logger.info("duel socket server closed");
    },
  };
}
