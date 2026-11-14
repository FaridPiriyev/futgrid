import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "../../lib/auth.js";
import { AppError } from "../../lib/errors.js";
import { audit, enableAdminTotp, requireAdminTotp, setupAdminTotp } from "../../lib/admin.js";
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

function requireAdminRole(request: FastifyRequest) {
  const user = requireUser(request);
  if (user.role !== "admin") throw new AppError("FORBIDDEN");
  return user;
}

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
    const user = requireAdminRole(request);
    return setupAdminTotp(user.id);
  });

  app.post(
    "/admin/auth/verify",
    { schema: { tags: ["admin"], body: z.object({ token: z.string().min(6).max(10) }) } },
    async (request) => {
      const user = requireAdminRole(request);
      return enableAdminTotp(user.id, request.body.token);
    },
  );

  app.get("/admin/overview", { schema: { tags: ["admin"] } }, async (request) => {
    await requireAdminTotp(request);
    const [users, sessions, flagged, contactNew, votes, releases, auditRows] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.gameSession.count(),
      prisma.gameSession.count({ where: { flagged: true } }),
      prisma.contactMessage.count({ where: { status: "new" } }),
      prisma.goatVote.count({ where: { counted: true } }),
      prisma.dataRelease.count(),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    return {
      users,
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
          limit: z.coerce.number().int().min(1).max(200).default(50),
        }),
      },
    },
    async (request) => {
      await requireAdminTotp(request);
      const query = request.query.query?.trim();
      const users = await prisma.user.findMany({
        where: query
          ? {
              OR: [
                { email: { contains: query, mode: "insensitive" } },
                { username: { contains: query, mode: "insensitive" } },
                { displayName: { contains: query, mode: "insensitive" } },
              ],
            }
          : {},
        orderBy: { createdAt: "desc" },
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
      });
      return { entries: users };
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
      const admin = await requireAdminTotp(request);
      const before = await userBefore(request.params.id);
      if (!before) throw new AppError("NOT_FOUND");
      const after = await prisma.user.update({
        where: { id: request.params.id },
        data: { blockedAt: request.body.blocked ? new Date() : null },
      });
      if (request.body.blocked) await removeUserFromLeaderboards(request.params.id);
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
      const after = await prisma.user.update({
        where: { id: request.params.id },
        data: { role: request.body.role },
      });
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
      await requireAdminTotp(request);
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
      await requireAdminTotp(request);
      return {
        entries: await prisma.gameSession.findMany({
          where: request.query.flagged === undefined ? {} : { flagged: request.query.flagged },
          orderBy: { startedAt: "desc" },
          take: request.query.limit,
        }),
      };
    },
  );

  app.post(
    "/admin/results/:id/revoke",
    { schema: { tags: ["admin"], params: idParams } },
    async (request) => {
      const admin = await requireAdminTotp(request);
      const session = await prisma.gameSession.findUnique({ where: { id: request.params.id } });
      if (!session) throw new AppError("NOT_FOUND");
      if (!session.userId) throw new AppError("CONFLICT", { message: "Guest results cannot be revoked" });
      const ledger = await prisma.pointsLedger.findFirst({
        where: { sessionId: session.id, reason: "session", points: { gt: 0 } },
        orderBy: { createdAt: "desc" },
      });
      if (!ledger) throw new AppError("CONFLICT", { message: "No points to revoke" });
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { teamId: true },
      });
      await prisma.$transaction([
        prisma.pointsLedger.create({
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
        }),
        prisma.gameSession.update({ where: { id: session.id }, data: { flagged: true } }),
      ]);
      await removePoints({
        userId: session.userId,
        gameId: session.gameId,
        points: ledger.points,
        periodWeek: ledger.periodWeek,
        periodMonth: ledger.periodMonth,
        teamId: user?.teamId ?? null,
      });
      await audit(admin.id, "result.revoke", "game_session", session.id, ledger, {
        revokedPoints: ledger.points,
      });
      return { ok: true, revokedPoints: ledger.points };
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
      await requireAdminTotp(request);
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
      const admin = await requireAdminTotp(request);
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
      await requireAdminTotp(request);
      const rows = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: request.query.limit,
      });
      return { entries: rows.map((row) => ({ ...row, id: row.id.toString() })) };
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
