import type { Server as HttpServer } from "node:http";
import { randomBytes, randomInt } from "node:crypto";
import Redis from "ioredis";
import { Server, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { config } from "../../config.js";
import { getGameData } from "../../lib/data.js";
import { isUuid, verifyAccessToken } from "../../lib/crypto.js";
import { logger } from "../../lib/logger.js";
import { Prisma } from "@prisma/client";
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
import {
  ELO_START,
  MIN_RATED_QUIT_MS,
  OVERALL_GAME,
  PAIR_DAILY_LIMIT,
  QUIT_REASONS,
  computeElo,
  pairResults,
} from "./rating.js";
import {
  ACTIVE_QUEUES_KEY,
  findPairs,
  queueKey,
  queueLockKey,
  recentKey,
  whereKey,
  type QueueEntry,
} from "./matchmaking.js";
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

/** Növbə nə qədər tez-tez yoxlanılır. */
const MATCH_TICK_MS = 1500;

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
    random: room.random ?? false,
    rematch: room.rematch,
    winnerId: room.winnerSeat ?? null,
    loserId: room.loserSeat ?? null,
    endedReason: room.endedReason ?? null,
    settings: room.settings ?? {},
    state: room.status === "waiting" ? {} : GAMES[room.game].view(room, ctx),
  };
}

type RatingRow = { id: string; userId: string; gameId: string; rating: number; games: number };

/** Hər oyunçu üçün reytinq sətrini yaradır (yoxdursa) və kilidləyib oxuyur. */
async function lockRatings(
  tx: Prisma.TransactionClient,
  userIds: string[],
  gameIds: string[],
): Promise<RatingRow[]> {
  await tx.userRating.createMany({
    data: userIds.flatMap((userId) =>
      gameIds.map((gameId) => ({ userId, gameId, rating: ELO_START, peak: ELO_START })),
    ),
    skipDuplicates: true,
  });
  // Eyni oyunçunun iki matçı eyni anda bitərsə, reytinq üst-üstə yazılmasın.
  return tx.$queryRaw<RatingRow[]>`
    SELECT id, user_id AS "userId", game_id AS "gameId", rating, games
    FROM user_ratings
    WHERE user_id = ANY(${userIds}::uuid[]) AND game_id = ANY(${gameIds}::text[])
    ORDER BY id
    FOR UPDATE`;
}

export interface DuelRatingEvent {
  code: string;
  rated: boolean;
  reason: string | null;
  /** seat → dəyişiklik. Real istifadəçi ID-si göndərilmir. */
  changes: Record<
    string,
    { before: number; after: number; delta: number; overallBefore: number; overallAfter: number; overallDelta: number }
  >;
}

// Nəticə bazaya yazılır. Xəta oyunu heç vaxt dayandırmır (oyunçular nəticəni artıq görüb).
// Elo yalnız qeydiyyatlı istifadəçilər arasında hesablanır — qonaq ID-ləri users cədvəlində yoxdur.
async function recordMatch(room: Room): Promise<DuelRatingEvent | null> {
  try {
    const bySeat = new Map(room.players.map((player) => [player.seat, player]));
    const winner = room.winnerSeat ? bySeat.get(room.winnerSeat) : undefined;
    const loser = room.loserSeat ? bySeat.get(room.loserSeat) : undefined;
    const users = room.players.filter((player) => !player.guest);
    const durationMs = room.startedAt ? Date.now() - room.startedAt : null;
    const endedReason = room.endedReason ?? "finished";

    const pairs = pairResults({
      players: users.map((player) => ({ seat: player.seat, id: player.identityId, guest: false })),
      winnerSeat: room.winnerSeat ?? null,
      loserSeat: room.loserSeat ?? null,
      endedReason,
      strength: room.state?.strength ?? null,
    });

    let reason: string | null = null;
    if (users.length < 2 || users.length !== room.players.length) reason = "guest";
    else if (!pairs.length) reason = "no_result";
    else if (QUIT_REASONS.has(endedReason) && durationMs !== null && durationMs < MIN_RATED_QUIT_MS) {
      reason = "too_short";
    } else if (users.length === 2) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await prisma.duelMatch.count({
        where: {
          rated: true,
          createdAt: { gte: since },
          playerIds: { hasEvery: users.map((player) => player.identityId) },
        },
      });
      if (recent >= PAIR_DAILY_LIMIT) reason = "pair_limit";
    }

    const score = JSON.parse(
      JSON.stringify({
        scores: room.state.scores ?? null,
        strength: room.state.strength ?? null,
        // playerIds ilə eyni sıra — tarixçədə "mənim hesabım"ı tapmaq üçün.
        seats: room.players.map((player) => player.seat),
        winnerSeat: room.winnerSeat ?? null,
        loserSeat: room.loserSeat ?? null,
      }),
    );
    const base = {
      gameId: room.game,
      roomCode: room.code,
      winnerId: winner && !winner.guest ? winner.identityId : null,
      loserId: loser && !loser.guest ? loser.identityId : null,
      playerIds: room.players.map((player) => player.identityId),
      score,
      durationMs,
      endedReason,
    };

    let event: DuelRatingEvent = { code: room.code, rated: false, reason, changes: {} };

    if (reason) {
      await prisma.duelMatch.create({
        data: { ...base, rated: false, ratingChanges: { reason, players: {} } },
      });
    } else {
      const userIds = users.map((player) => player.identityId);
      event = await prisma.$transaction(async (tx) => {
        const rows = await lockRatings(tx, userIds, [room.game, OVERALL_GAME]);
        const row = (userId: string, gameId: string) =>
          rows.find((entry) => entry.userId === userId && entry.gameId === gameId)!;
        const seatToUser = new Map(users.map((player) => [player.seat, player.identityId]));
        const toIds = (gameId: string) =>
          users.map((player) => {
            const r = row(player.identityId, gameId);
            return { id: player.seat, rating: r.rating, games: r.games };
          });
        const gameDelta = computeElo(toIds(room.game), pairs);
        const overallDelta = computeElo(toIds(OVERALL_GAME), pairs);

        const tally = new Map<string, { wins: number; losses: number; draws: number }>();
        for (const { a, b, scoreA } of pairs) {
          for (const [seat, s] of [
            [a, scoreA],
            [b, 1 - scoreA],
          ] as const) {
            const t = tally.get(seat) ?? { wins: 0, losses: 0, draws: 0 };
            if (s === 1) t.wins++;
            else if (s === 0) t.losses++;
            else t.draws++;
            tally.set(seat, t);
          }
        }

        const changes: DuelRatingEvent["changes"] = {};
        const stored: Record<string, unknown> = {};
        for (const player of users) {
          const userId = seatToUser.get(player.seat)!;
          const t = tally.get(player.seat) ?? { wins: 0, losses: 0, draws: 0 };
          // Çox oyunçulu matç bir oyun sayılır: yekun nəticə qələbə/məğlubiyyət/heç-heçə.
          const net = t.wins - t.losses;
          const result = net > 0 ? "wins" : net < 0 ? "losses" : "draws";
          const g = row(userId, room.game);
          const o = row(userId, OVERALL_GAME);
          const dg = gameDelta.get(player.seat) ?? 0;
          const dov = overallDelta.get(player.seat) ?? 0;
          const after = g.rating + dg;
          const overallAfter = o.rating + dov;
          for (const [r, value] of [
            [g, after],
            [o, overallAfter],
          ] as const) {
            await tx.$executeRaw`
              UPDATE user_ratings
              SET rating = ${value},
                  peak = GREATEST(peak, ${value}),
                  games = games + 1,
                  ${Prisma.raw(`"${result}" = "${result}" + 1`)},
                  updated_at = NOW()
              WHERE id = ${r.id}::uuid`;
          }
          changes[player.seat] = {
            before: g.rating,
            after,
            delta: dg,
            overallBefore: o.rating,
            overallAfter,
            overallDelta: dov,
          };
          stored[userId] = { ...changes[player.seat], seat: player.seat, result };
        }
        await tx.duelMatch.create({
          data: { ...base, rated: true, ratingChanges: { players: stored } as unknown as Prisma.InputJsonValue },
        });
        return { code: room.code, rated: true, reason: null, changes };
      });
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
    return event;
  } catch (error) {
    logger.error({ err: error, code: room.code, game: room.game }, "failed to record duel match");
    return null;
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
        finish(winnerSeat, reason, loserSeat) {
          if (room.status !== "playing") return;
          room.status = "finished";
          room.endedReason = reason;
          room.winnerSeat = winnerSeat;
          room.loserSeat =
            loserSeat !== undefined
              ? loserSeat
              : winnerSeat
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
    if (finished && result.room) {
      const finishedRoom = result.room;
      void recordMatch(finishedRoom).then((rating) => {
        if (rating) io.to(finishedRoom.code).emit("duel:rating", rating);
      });
    }
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
            const others = room.players.filter((player) => player.seat !== gone.seat);
            // 3–4 nəfərlik auksionda konkret qalib yoxdur — çıxan hamıya uduzur.
            ctx.finish(others.length === 1 ? others[0]!.seat : null, "disconnect", gone.seat);
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

  // ---------- Matchmaking: təsadüfi rəqib ----------

  async function leaveQueue(identityId: string, socketId?: string): Promise<void> {
    const game = await redis.get(whereKey(identityId));
    if (!game) return;
    if (socketId) {
      // Başqa tabdan yenidən növbəyə giribsə, köhnə tabın bağlanması onu çıxarmasın.
      const raw = await redis.hget(queueKey(game), identityId);
      const entry = raw ? (JSON.parse(raw) as QueueEntry) : null;
      if (entry && entry.socketId !== socketId) return;
    }
    await redis.multi().hdel(queueKey(game), identityId).del(whereKey(identityId)).exec();
  }

  const socketAlive = async (socketId: string) => (await io.in(socketId).fetchSockets()).length > 0;

  async function createMatch(game: DuelGame, a: QueueEntry, b: QueueEntry): Promise<void> {
    let code = code6();
    while (await roomExists(redis, code)) code = code6();
    const toPlayer = (entry: QueueEntry): DuelPlayer => ({
      seat: newSeat(),
      identityId: entry.id,
      name: entry.name,
      username: entry.username,
      displayName: entry.displayName,
      avatarUrl: entry.avatarUrl,
      guest: entry.guest,
      socketId: entry.socketId,
      connected: true,
      forfeitAt: null,
    });
    const players = [toPlayer(a), toPlayer(b)];
    // Kim başlayacaq — təsadüfi.
    if (randomInt(2) === 1) players.reverse();
    const room: Room = {
      v: 2,
      code,
      game,
      players,
      hostSeat: players[0]!.seat,
      status: "waiting",
      seed: 0,
      rematch: [],
      state: {},
      settings: GAMES[game].settings?.({}) ?? {},
      createdAt: Date.now(),
      random: true,
    };
    await saveRoom(redis, room);
    for (const player of players) {
      io.in(player.socketId).socketsJoin(code);
      io.to(player.socketId).emit("match:found", { code, game, youId: player.seat });
    }
    await redis
      .multi()
      .set(recentKey(a.id), b.id, "EX", 120)
      .set(recentKey(b.id), a.id, "EX", 120)
      .exec();
    await mutate(code, (current, ctx) => {
      if (current.status !== "waiting") return { changed: false };
      startRoom(current, ctx);
      return { event: "game:state" };
    });
  }

  async function matchGame(game: DuelGame): Promise<void> {
    const lock = await redis.set(queueLockKey(game), "1", "PX", 5000, "NX");
    if (lock !== "OK") return;
    try {
      const raw = await redis.hgetall(queueKey(game));
      const entries = Object.values(raw).map((value) => JSON.parse(value) as QueueEntry);
      if (entries.length < 2) {
        if (!entries.length) await redis.srem(ACTIVE_QUEUES_KEY, game);
        return;
      }
      for (const [a, b] of findPairs(entries, Date.now())) {
        const [aliveA, aliveB] = await Promise.all([socketAlive(a.socketId), socketAlive(b.socketId)]);
        if (!aliveA || !aliveB) {
          // Bağlantısı kəsilmiş oyunçu növbədən çıxır, digəri növbəti dəfə başqası ilə birləşir.
          if (!aliveA) await leaveQueue(a.id);
          if (!aliveB) await leaveQueue(b.id);
          continue;
        }
        await redis
          .multi()
          .hdel(queueKey(game), a.id, b.id)
          .del(whereKey(a.id), whereKey(b.id))
          .exec();
        await createMatch(game, a, b).catch((error) =>
          logger.error({ err: error, game }, "matchmaking room creation failed"),
        );
      }
    } finally {
      await redis.del(queueLockKey(game));
    }
  }

  let matching = false;
  async function matchTick() {
    if (matching) return;
    matching = true;
    try {
      const games = (await redis.smembers(ACTIVE_QUEUES_KEY)) as DuelGame[];
      for (const game of games) {
        if (!SUPPORTED_GAMES.includes(game)) continue;
        await matchGame(game).catch((error) => logger.warn({ err: error, game }, "matchmaking tick failed"));
      }
    } catch (error) {
      logger.warn({ err: error }, "matchmaking tick failed");
    } finally {
      matching = false;
    }
  }
  const matcher = setInterval(() => void matchTick(), MATCH_TICK_MS);


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

    // Təsadüfi rəqib axtarışına qoşul.
    on("queue:join", async (payload, ack) => {
      const game = payload.game as DuelGame;
      if (!SUPPORTED_GAMES.includes(game)) return fail(ack, "GAME_NOT_AVAILABLE");
      await leaveQueue(me.id);
      let rating = ELO_START;
      if (!me.guest) {
        const row = await prisma.userRating.findUnique({
          where: { userId_gameId: { userId: me.id, gameId: game } },
          select: { rating: true },
        });
        rating = row?.rating ?? ELO_START;
      }
      const entry: QueueEntry = {
        id: me.id,
        socketId: socket.id,
        rating,
        guest: me.guest,
        joinedAt: Date.now(),
        name: me.name,
        username: me.username,
        displayName: me.displayName,
        avatarUrl: me.avatarUrl,
        avoid: await redis.get(recentKey(me.id)),
      };
      await redis
        .multi()
        .hset(queueKey(game), me.id, JSON.stringify(entry))
        .set(whereKey(me.id), game, "EX", 60 * 30)
        .sadd(ACTIVE_QUEUES_KEY, game)
        .exec();
      const searching = await redis.hlen(queueKey(game));
      reply(ack, { ok: true, game, rating: Math.round(rating), searching });
      // Növbədə artıq kimsə varsa, gözlətmədən yoxlayaq.
      if (searching >= 2) void matchGame(game).catch(() => {});
    });

    on("queue:leave", async (_payload, ack) => {
      await leaveQueue(me.id);
      reply(ack, { ok: true });
    });

    on("room:create", async (payload, ack) => {
      const game = payload.game as DuelGame;
      if (!SUPPORTED_GAMES.includes(game)) return fail(ack, "GAME_NOT_AVAILABLE");
      await leaveQueue(me.id);
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
      await leaveQueue(me.id);
      let seat = "";
      const result = await mutate(code, (room, ctx) => {
        if (room.game !== payload.game) return { error: "ROOM_GAME_MISMATCH" };
        const maxPlayers = room.game === "auction" ? 4 : 2;
        let player = room.players.find((entry) => entry.identityId === me.id);
        if (!player) {
          if (room.players.length >= maxPlayers || room.status !== "waiting") return { error: "ROOM_FULL" };
          player = newPlayer(me, socket);
          room.players.push(player);
        } else {
          player.socketId = socket.id;
          player.connected = true;
          player.forfeitAt = null;
        }
        seat = player.seat;
        // Auction supports 2-4 players, so the host starts it manually.
        if (room.status === "waiting" && room.players.length === 2 && room.game !== "auction") {
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
          const others = room.players.filter((entry) => entry.seat !== player.seat);
          ctx.finish(others.length === 1 ? others[0]!.seat : null, "left", player.seat);
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
        const others = room.players.filter((entry) => entry.seat !== player.seat);
        ctx.finish(others.length === 1 ? others[0]!.seat : null, "surrender", player.seat);
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
        if (room.game === "auction" && room.players.length > 4) return { error: "ROOM_FULL" };
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
      void leaveQueue(me.id, socket.id).catch(() => {});
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
      clearInterval(matcher);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await Promise.all([pubClient.quit(), subClient.quit(), redis.quit()]);
      logger.info("duel socket server closed");
    },
  };
}
