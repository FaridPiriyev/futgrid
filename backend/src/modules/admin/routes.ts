import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "../../lib/auth.js";
import { AppError } from "../../lib/errors.js";
import {
  audit,
  createAdminSession,
  enableAdminTotp,
  endAdminSession,
  requireAdminTotp,
  setupAdminTotp,
  type StaffRole,
} from "../../lib/admin.js";
import { getRedis } from "../../lib/redis.js";
import { dayStartBaku } from "../../lib/time.js";
import { kickUser } from "../duel/socket.js";
import { PRESENCE_KEY, PRESENCE_MS } from "../social/service.js";
import { resetUserRatings, revertSessionRating } from "../ratings/service.js";
import { prisma } from "../../lib/prisma.js";
import { goatPlayers, GOAT_SIZES } from "../../lib/goatData.js";
import { removePoints, removeUserFromLeaderboards } from "../leaderboard/service.js";
import {
  buildDataRelease,
  applyMarketValuesCsv,
  dataPipelineConfig,
  publishDataRelease,
  rollbackDataRelease,
  syncDatabase,
} from "../data/service.js";
import { editDailyPuzzle, regenerateDailyPuzzle } from "../daily/service.js";
import { mediaSchema, processMedia } from "../media/service.js";

const idParams = z.object({ id: z.string().uuid() });
const playerParams = z.object({ id: z.coerce.number().int() });
const gameParams = z.object({ id: z.string().min(1).max(40) });
const limitQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

function requireStaffRole(request: FastifyRequest) {
  const user = requireUser(request);
  if (user.role !== "admin" && user.role !== "moderator") throw new AppError("FORBIDDEN");
  return user;
}

const STAFF: StaffRole[] = ["admin", "moderator"];

async function userBefore(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      blockedAt: true,
    },
  });
}

export async function registerAdminRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get("/admin/auth/setup", { schema: { tags: ["admin"] } }, async (request) => {
    const user = requireStaffRole(request);
    return setupAdminTotp(user.id);
  });

  app.post(
    "/admin/auth/verify",
    { schema: { tags: ["admin"], body: z.object({ token: z.string().min(6).max(10) }) } },
    async (request) => {
      const user = requireStaffRole(request);
      return enableAdminTotp(user.id, request.body.token);
    },
  );

  // One TOTP code → a 45-minute admin session (the panel no longer breaks every 30 seconds).
  app.post(
    "/admin/auth/session",
    { schema: { tags: ["admin"], body: z.object({ token: z.string().min(6).max(10) }) } },
    async (request) => {
      const user = requireStaffRole(request);
      const session = await createAdminSession(user.id, request.body.token);
      return { ...session, role: user.role };
    },
  );

  app.delete("/admin/auth/session", { schema: { tags: ["admin"] } }, async (request) => {
    await endAdminSession(String(request.headers["x-admin-session"] ?? ""));
    return { ok: true };
  });

  app.get("/admin/overview", { schema: { tags: ["admin"] } }, async (request) => {
    await requireAdminTotp(request, STAFF);
    const today = dayStartBaku(new Date());
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const redis = await getRedis();
    const [users, sessions, flagged, contactNew, votes, releases, auditRows, extra] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.gameSession.count(),
      prisma.gameSession.count({ where: { flagged: true } }),
      prisma.contactMessage.count({ where: { status: "new" } }),
      prisma.goatVote.count({ where: { counted: true } }),
      prisma.dataRelease.count(),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      Promise.all([
        prisma.user.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
        prisma.user.count({ where: { createdAt: { gte: weekAgo }, deletedAt: null } }),
        prisma.gameSession.count({ where: { startedAt: { gte: today } } }),
        prisma.duelMatch.count({ where: { createdAt: { gte: today } } }),
        prisma.duelMatch.count({ where: { createdAt: { gte: weekAgo } } }),
        redis.zcount(PRESENCE_KEY, Date.now() - PRESENCE_MS, "+inf"),
        prisma.user.count({ where: { blockedAt: { not: null } } }),
      ]),
    ]);
    const [newUsersToday, newUsersWeek, gamesToday, duelsToday, duelsWeek, onlineNow, blocked] = extra;
    return {
      onlineNow,
      newUsersToday,
      newUsersWeek,
      gamesToday,
      duelsToday,
      duelsWeek,
      users,
      blocked,
      sessions,
      flagged,
      contactNew,
      goatVotes: votes,
      dataReleases: releases,
      pipeline: dataPipelineConfig(),
      recentAudit: auditRows.map((row) => ({ ...row, id: row.id.toString() })),
    };
  });

  app.get(
    "/admin/users",
    {
      schema: {
        tags: ["admin"],
        querystring: z.object({
          query: z.string().max(200).optional(),
          status: z.enum(["all", "blocked", "unverified", "staff"]).default("all"),
          limit: z.coerce.number().int().min(1).max(200).default(50),
          offset: z.coerce.number().int().min(0).default(0),
        }),
      },
    },
    async (request) => {
      await requireAdminTotp(request, STAFF);
      const query = request.query.query?.trim();
      const status = request.query.status;
      const where = {
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: "insensitive" as const } },
                { username: { contains: query, mode: "insensitive" as const } },
                { displayName: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(status === "blocked" ? { blockedAt: { not: null } } : {}),
        ...(status === "unverified" ? { emailVerifiedAt: null } : {}),
        ...(status === "staff" ? { role: { in: ["admin", "moderator"] } } : {}),
      };
      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: request.query.offset,
        take: request.query.limit,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          locale: true,
          emailVerifiedAt: true,
          blockedAt: true,
          deletedAt: true,
          createdAt: true,
          stats: { select: { gameId: true, totalPoints: true, bestScore: true } },
        },
        }),
      ]);
      return { entries: users, total, offset: request.query.offset, limit: request.query.limit };
    },
  );

  app.patch(
    "/admin/users/:id/block",
    {
      schema: {
        tags: ["admin"],
        params: idParams,
        body: z.object({ blocked: z.boolean() }),
      },
    },
    async (request) => {
      const admin = await requireAdminTotp(request, STAFF);
      const before = await userBefore(request.params.id);
      if (!before) throw new AppError("NOT_FOUND");
      if (before.id === admin.id) throw new AppError("CONFLICT", { message: "You cannot block yourself" });
      if (admin.role !== "admin" && before.role !== "user") throw new AppError("FORBIDDEN");
      const after = await prisma.user.update({
        where: { id: request.params.id },
        data: { blockedAt: request.body.blocked ? new Date() : null },
      });
      if (request.body.blocked) {
        await removeUserFromLeaderboards(request.params.id);
        // Sign them out everywhere and drop live game sockets right away.
        await prisma.refreshToken.updateMany({
          where: { userId: request.params.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        kickUser(request.params.id);
      }
      await audit(admin.id, "user.block", "user", request.params.id, before, {
        blockedAt: after.blockedAt,
      });
      return { ok: true, blocked: Boolean(after.blockedAt) };
    },
  );

  app.patch(
    "/admin/users/:id/role",
    {
      schema: {
        tags: ["admin"],
        params: idParams,
        body: z.object({ role: z.enum(["user", "moderator", "admin"]) }),
      },
    },
    async (request) => {
      const admin = await requireAdminTotp(request);
      const before = await userBefore(request.params.id);
      if (!before) throw new AppError("NOT_FOUND");
      if (before.id === admin.id) throw new AppError("CONFLICT", { message: "You cannot change your own role" });
      if (before.role === "admin" && request.body.role !== "admin") {
        const admins = await prisma.user.count({ where: { role: "admin", deletedAt: null, blockedAt: null } });
        if (admins <= 1) throw new AppError("CONFLICT", { message: "The last admin cannot be demoted" });
      }
      const after = await prisma.user.update({
        where: { id: request.params.id },
        data: { role: request.body.role },
      });
      if (request.body.role === "user") kickUser(request.params.id);
      await audit(admin.id, "user.role", "user", request.params.id, before, { role: after.role });
      return { ok: true, role: after.role };
    },
  );

  app.post("/admin/users/:id/logout-all", { schema: { tags: ["admin"], params: idParams } }, async (request) => {
    const admin = await requireAdminTotp(request);
    const result = await prisma.refreshToken.updateMany({
      where: { userId: request.params.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit(admin.id, "user.logout_all", "user", request.params.id, null, {
      revoked: result.count,
    });
    return { ok: true, revoked: result.count };
  });

  app.get(
    "/admin/users/:id/sessions",
    { schema: { tags: ["admin"], params: idParams, querystring: limitQuery } },
    async (request) => {
      await requireAdminTotp(request, STAFF);
      return {
        entries: await prisma.gameSession.findMany({
          where: { userId: request.params.id },
          orderBy: { startedAt: "desc" },
          take: request.query.limit,
        }),
      };
    },
  );

  app.get(
    "/admin/results",
    {
      schema: {
        tags: ["admin"],
        querystring: z.object({
          flagged: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50),
        }),
      },
    },
    async (request) => {
      await requireAdminTotp(request, STAFF);
      return {
        entries: await prisma.gameSession.findMany({
          where: {
            status: "finished",
            userId: { not: null },
            ...(request.query.flagged === undefined ? {} : { flagged: request.query.flagged }),
          },
          orderBy: { startedAt: "desc" },
          take: request.query.limit,
          include: { user: { select: { username: true, displayName: true } } },
        }),
      };
    },
  );

  app.post(
    "/admin/results/:id/revoke",
    { schema: { tags: ["admin"], params: idParams } },
    async (request) => {
      const admin = await requireAdminTotp(request, STAFF);
      const session = await prisma.gameSession.findUnique({ where: { id: request.params.id } });
      if (!session) throw new AppError("NOT_FOUND");
      if (!session.userId) throw new AppError("CONFLICT", { message: "Guest results cannot be revoked" });
      const ledger = await prisma.pointsLedger.findFirst({
        where: { sessionId: session.id, reason: "session", points: { gt: 0 } },
        orderBy: { createdAt: "desc" },
      });
      const already = await prisma.pointsLedger.findFirst({
        where: { sessionId: session.id, reason: "revoked" },
      });
      // Site-wide rating first (rating_events), then the legacy points ledger if it still holds points.
      const revertedRating = await revertSessionRating(session.id);
      let revokedPoints = 0;
      if (ledger && !already) {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { teamId: true },
        });
        await prisma.pointsLedger.create({
          data: {
            userId: session.userId,
            sessionId: session.id,
            gameId: session.gameId,
            points: -ledger.points,
            score: 0,
            difficulty: session.difficulty,
            periodWeek: ledger.periodWeek,
            periodMonth: ledger.periodMonth,
            reason: "revoked",
          },
        }).catch(() => null);
        await removePoints({
          userId: session.userId,
          gameId: session.gameId,
          points: ledger.points,
          periodWeek: ledger.periodWeek,
          periodMonth: ledger.periodMonth,
          teamId: user?.teamId ?? null,
        });
        revokedPoints = ledger.points;
      }
      if (!revertedRating && !revokedPoints) throw new AppError("CONFLICT", { message: "Nothing to revoke" });
      await prisma.gameSession.update({ where: { id: session.id }, data: { flagged: true } });
      await audit(admin.id, "result.revoke", "game_session", session.id, ledger, {
        revokedPoints,
        revertedRating,
      });
      return { ok: true, revokedPoints, revertedRating };
    },
  );

  app.get(
    "/admin/users/:id/summary",
    { schema: { tags: ["admin"], params: idParams } },
    async (request) => {
      await requireAdminTotp(request, STAFF);
      const id = request.params.id;
      const [user, ratings, sessions, duels, friends, events] = await Promise.all([
        prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            role: true,
            emailVerifiedAt: true,
            blockedAt: true,
            deletedAt: true,
            createdAt: true,
            avatarUrl: true,
          },
        }),
        prisma.userRating.findMany({ where: { userId: id }, orderBy: { rating: "desc" } }),
        prisma.gameSession.findMany({
          where: { userId: id },
          orderBy: { startedAt: "desc" },
          take: 15,
          select: { id: true, gameId: true, status: true, score: true, points: true, flagged: true, startedAt: true, difficulty: true },
        }),
        prisma.duelMatch.count({ where: { playerIds: { has: id } } }),
        prisma.friendship.count({ where: { status: "accepted", OR: [{ requesterId: id }, { addresseeId: id }] } }),
        prisma.ratingEvent.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
      ]);
      if (!user) throw new AppError("NOT_FOUND");
      return {
        user,
        ratings: ratings.map((r) => ({ gameId: r.gameId, rating: Math.round(r.rating), games: r.games, wins: r.wins, losses: r.losses })),
        sessions,
        duels,
        friends,
        ratingEvents: events.map((e) => ({ ...e, id: e.id.toString() })),
      };
    },
  );

  app.get(
    "/admin/duels",
    { schema: { tags: ["admin"], querystring: limitQuery } },
    async (request) => {
      await requireAdminTotp(request, STAFF);
      const matches = await prisma.duelMatch.findMany({
        orderBy: { createdAt: "desc" },
        take: request.query.limit,
      });
      const ids = [...new Set(matches.flatMap((m) => m.playerIds))];
      const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true },
      });
      const nameOf = new Map(users.map((u) => [u.id, u.username]));
      return {
        entries: matches.map((m) => ({
          id: m.id,
          gameId: m.gameId,
          roomCode: m.roomCode,
          players: m.playerIds.map((id) => nameOf.get(id) ?? null),
          winner: m.winnerId ? (nameOf.get(m.winnerId) ?? null) : null,
          endedReason: m.endedReason,
          rated: m.rated,
          durationMs: m.durationMs,
          createdAt: m.createdAt,
        })),
      };
    },
  );

  app.post(
    "/admin/users/:id/rating-reset",
    { schema: { tags: ["admin"], params: idParams } },
    async (request) => {
      const admin = await requireAdminTotp(request);
      const before = await prisma.userRating.findMany({
        where: { userId: request.params.id },
        select: { gameId: true, rating: true },
      });
      const result = await resetUserRatings(request.params.id);
      await audit(admin.id, "user.rating_reset", "user", request.params.id, before, result);
      return { ok: true, ...result };
    },
  );

  app.get(
    "/admin/contact-messages",
    {
      schema: {
        tags: ["admin"],
        querystring: z.object({
          status: z.enum(["new", "read", "archived"]).optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50),
        }),
      },
    },
    async (request) => {
      await requireAdminTotp(request, STAFF);
      return {
        entries: await prisma.contactMessage.findMany({
          where: request.query.status ? { status: request.query.status } : {},
          orderBy: { createdAt: "desc" },
          take: request.query.limit,
        }),
      };
    },
  );

  app.patch(
    "/admin/contact-messages/:id",
    {
      schema: {
        tags: ["admin"],
        params: idParams,
        body: z.object({ status: z.enum(["new", "read", "archived"]) }),
      },
    },
    async (request) => {
      const admin = await requireAdminTotp(request, STAFF);
      const before = await prisma.contactMessage.findUnique({ where: { id: request.params.id } });
      if (!before) throw new AppError("NOT_FOUND");
      const after = await prisma.contactMessage.update({
        where: { id: request.params.id },
        data: { status: request.body.status },
      });
      await audit(admin.id, "contact.status", "contact_message", after.id, before, after);
      return { ok: true, status: after.status };
    },
  );

  app.get(
    "/admin/daily-puzzles",
    {
      schema: {
        tags: ["admin"],
        querystring: z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
          game: z.enum(["xox", "wordle"]).optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50),
        }),
      },
    },
    async (request) => {
      await requireAdminTotp(request);
      return {
        entries: await prisma.dailyPuzzle.findMany({
          where: {
            ...(request.query.date ? { date: request.query.date } : {}),
            ...(request.query.game ? { game: request.query.game } : {}),
          },
          orderBy: [{ date: "desc" }, { game: "asc" }, { difficulty: "asc" }],
          take: request.query.limit,
        }),
      };
    },
  );

  app.patch(
    "/admin/daily-puzzles/:id",
    { schema: { tags: ["admin"], params: idParams, body: z.object({ puzzle: z.record(z.unknown()) }) } },
    async (request) => {
      const admin = await requireAdminTotp(request);
      const before = await prisma.dailyPuzzle.findUnique({ where: { id: request.params.id } });
      if (!before) throw new AppError("NOT_FOUND");
      const after = await editDailyPuzzle(request.params.id, request.body.puzzle);
      await audit(admin.id, "daily.edit", "daily_puzzle", request.params.id, before, after);
      return after;
    },
  );

  app.post("/admin/daily-puzzles/:id/regenerate", { schema: { tags: ["admin"], params: idParams } }, async (request) => {
    const admin = await requireAdminTotp(request);
    const before = await prisma.dailyPuzzle.findUnique({ where: { id: request.params.id } });
    if (!before) throw new AppError("NOT_FOUND");
    const after = await regenerateDailyPuzzle(request.params.id);
    await audit(admin.id, "daily.regenerate", "daily_puzzle", request.params.id, before, after);
    return after;
  });

  app.get(
    "/admin/players",
    {
      schema: {
        tags: ["admin"],
        querystring: z.object({
          query: z.string().max(200).optional(),
          hidden: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50),
        }),
      },
    },
    async (request) => {
      await requireAdminTotp(request);
      return {
        entries: await prisma.playerRecord.findMany({
          where: {
            ...(request.query.query
              ? { name: { contains: request.query.query, mode: "insensitive" } }
              : {}),
            ...(request.query.hidden === undefined ? {} : { hidden: request.query.hidden }),
          },
          orderBy: [{ marketValueEur: "desc" }],
          take: request.query.limit,
        }),
      };
    },
  );

  app.patch(
    "/admin/players/:id",
    {
      schema: {
        tags: ["admin"],
        params: playerParams,
        body: z.object({
          name: z.string().min(1).max(120).optional(),
          hidden: z.boolean().optional(),
          photoUrl: z.string().url().nullable().optional(),
          position: z.string().max(10).optional(),
        }),
      },
    },
    async (request) => {
      const admin = await requireAdminTotp(request);
      const before = await prisma.playerRecord.findUnique({ where: { id: request.params.id } });
      if (!before) throw new AppError("NOT_FOUND");
      const after = await prisma.playerRecord.update({
        where: { id: request.params.id },
        data: {
          ...(request.body.name !== undefined ? { name: request.body.name } : {}),
          ...(request.body.hidden !== undefined ? { hidden: request.body.hidden } : {}),
          ...(request.body.photoUrl !== undefined ? { photoUrl: request.body.photoUrl } : {}),
          ...(request.body.position !== undefined ? { position: request.body.position } : {}),
        },
      });
      await audit(admin.id, "player.update", "player", String(after.id), before, after);
      return after;
    },
  );

  app.get(
    "/admin/clubs",
    {
      schema: {
        tags: ["admin"],
        querystring: z.object({
          query: z.string().max(200).optional(),
          limit: z.coerce.number().int().min(1).max(200).default(50),
        }),
      },
    },
    async (request) => {
      await requireAdminTotp(request);
      return {
        entries: await prisma.clubRecord.findMany({
          where: request.query.query
            ? { name: { contains: request.query.query, mode: "insensitive" } }
            : {},
          orderBy: { name: "asc" },
          take: request.query.limit,
        }),
      };
    },
  );

  app.patch(
    "/admin/clubs/:id",
    {
      schema: {
        tags: ["admin"],
        params: playerParams,
        body: z.object({
          name: z.string().min(1).max(120).optional(),
          hidden: z.boolean().optional(),
          logoUrl: z.string().url().nullable().optional(),
        }),
      },
    },
    async (request) => {
      const admin = await requireAdminTotp(request);
      const before = await prisma.clubRecord.findUnique({ where: { id: request.params.id } });
      if (!before) throw new AppError("NOT_FOUND");
      const after = await prisma.clubRecord.update({
        where: { id: request.params.id },
        data: {
          ...(request.body.name !== undefined ? { name: request.body.name } : {}),
          ...(request.body.hidden !== undefined ? { hidden: request.body.hidden } : {}),
          ...(request.body.logoUrl !== undefined ? { logoUrl: request.body.logoUrl } : {}),
        },
      });
      await audit(admin.id, "club.update", "club", String(after.id), before, after);
      return after;
    },
  );

  app.get("/admin/data-releases", { schema: { tags: ["admin"] } }, async (request) => {
    await requireAdminTotp(request);
    return {
      entries: await prisma.dataRelease.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      pipeline: dataPipelineConfig(),
    };
  });

  app.post("/admin/data-releases/build", { schema: { tags: ["admin"] } }, async (request) => {
    const admin = await requireAdminTotp(request);
    const release = await buildDataRelease(admin.id);
    await audit(admin.id, "data.build", "data_release", release.id, null, release.report);
    return release;
  });

  app.get("/admin/data-releases/:id", { schema: { tags: ["admin"], params: idParams } }, async (request) => {
    await requireAdminTotp(request);
    const release = await prisma.dataRelease.findUnique({ where: { id: request.params.id } });
    if (!release) throw new AppError("NOT_FOUND");
    return release;
  });

  app.post("/admin/data-releases/:id/publish", { schema: { tags: ["admin"], params: idParams } }, async (request) => {
    const admin = await requireAdminTotp(request);
    await syncDatabase();
    const release = await publishDataRelease(request.params.id);
    await audit(admin.id, "data.publish", "data_release", request.params.id, null, release);
    return release;
  });

  app.post("/admin/data-releases/:id/rollback", { schema: { tags: ["admin"], params: idParams } }, async (request) => {
    const admin = await requireAdminTotp(request);
    const release = await rollbackDataRelease(request.params.id);
    await audit(admin.id, "data.rollback", "data_release", request.params.id, null, release);
    return release;
  });

  app.post(
    "/admin/market-values",
    { schema: { tags: ["admin"], body: z.object({ csv: z.string().min(1).max(2_000_000) }) } },
    async (request) => {
      const admin = await requireAdminTotp(request);
      const result = await applyMarketValuesCsv(request.body.csv, admin.id);
      await audit(admin.id, "market_values.apply", "player", null, null, result);
      return result;
    },
  );

  app.get(
    "/admin/goat/roster",
    {
      schema: {
        tags: ["admin"],
        querystring: z.object({
          size: z.coerce.number().int().refine((value) => [16, 32, 64, 128].includes(value)).default(128),
        }),
      },
    },
    async (request) => {
      await requireAdminTotp(request);
      return { sizes: GOAT_SIZES, entries: goatPlayers().slice(0, request.query.size) };
    },
  );

  app.get("/admin/games", { schema: { tags: ["admin"] } }, async (request) => {
    await requireAdminTotp(request);
    return { entries: await prisma.game.findMany({ orderBy: { sortOrder: "asc" } }) };
  });

  app.patch(
    "/admin/games/:id",
    {
      schema: {
        tags: ["admin"],
        params: gameParams,
        body: z.object({
          enabled: z.boolean().optional(),
          isNew: z.boolean().optional(),
          sortOrder: z.number().int().min(0).max(1000).optional(),
        }),
      },
    },
    async (request) => {
      const admin = await requireAdminTotp(request);
      const before = await prisma.game.findUnique({ where: { id: request.params.id } });
      if (!before) throw new AppError("NOT_FOUND");
      const after = await prisma.game.update({
        where: { id: request.params.id },
        data: {
          ...(request.body.enabled !== undefined ? { enabled: request.body.enabled } : {}),
          ...(request.body.isNew !== undefined ? { isNew: request.body.isNew } : {}),
          ...(request.body.sortOrder !== undefined ? { sortOrder: request.body.sortOrder } : {}),
        },
      });
      await audit(admin.id, "game.update", "game", after.id, before, after);
      return after;
    },
  );

  app.get(
    "/admin/audit-log",
    { schema: { tags: ["admin"], querystring: limitQuery } },
    async (request) => {
      await requireAdminTotp(request, STAFF);
      const rows = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: request.query.limit,
      });
      const admins = await prisma.user.findMany({
        where: { id: { in: [...new Set(rows.map((row) => row.adminId).filter(Boolean) as string[])] } },
        select: { id: true, username: true },
      });
      const nameOf = new Map(admins.map((a) => [a.id, a.username]));
      return {
        entries: rows.map((row) => ({
          ...row,
          id: row.id.toString(),
          adminUsername: row.adminId ? (nameOf.get(row.adminId) ?? null) : null,
        })),
      };
    },
  );

  app.get(
    "/admin/media",
    { schema: { tags: ["admin"], querystring: limitQuery } },
    async (request) => {
      await requireAdminTotp(request);
      return {
        entries: await prisma.media.findMany({
          orderBy: { createdAt: "desc" },
          take: request.query.limit,
        }),
      };
    },
  );

  app.post(
    "/admin/media",
    { schema: { tags: ["admin"], body: mediaSchema } },
    async (request, reply) => {
      const admin = await requireAdminTotp(request);
      const media = await processMedia(request.body);
      await audit(admin.id, "media.process", "media", media.id, null, media);
      return reply.status(201).send(media);
    },
  );
}
