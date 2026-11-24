import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { normalizeGameKey } from "@futgrid/game-core";
import { z } from "zod";
import { requireUser } from "../../lib/auth.js";
import { AppError } from "../../lib/errors.js";
import { SUPPORTED_GAMES } from "../duel/store.js";
import { ELO_MIN_GAMES, OVERALL_GAME } from "../duel/rating.js";
import {
  getEloLeaderboard,
  getLeaderboard,
  getMyEloRank,
  getMyRank,
  getTeamLeaderboard,
  type LeaderboardPeriod,
} from "./service.js";

const periodSchema = z.enum(["week", "month", "all"]).default("week");

const leaderboardQuery = z.object({
  period: periodSchema,
  game: z.string().optional(),
  team: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const meQuery = z.object({
  period: periodSchema,
  game: z.string().optional(),
});

const teamsQuery = z.object({
  period: periodSchema,
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const eloQuery = z.object({
  game: z.enum([OVERALL_GAME, ...SUPPORTED_GAMES] as [string, ...string[]]).default(OVERALL_GAME),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

function resolveGame(value: string | undefined) {
  if (!value) return undefined;
  const game = normalizeGameKey(value);
  if (!game) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "game", rule: "unsupported_game" }],
    });
  }
  return game;
}

export async function registerLeaderboardRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/leaderboard",
    { schema: { tags: ["leaderboard"], querystring: leaderboardQuery } },
    async (request) =>
      getLeaderboard({
        period: request.query.period as LeaderboardPeriod,
        gameId: resolveGame(request.query.game),
        teamId: request.query.team,
        limit: request.query.limit,
      }),
  );

  app.get(
    "/leaderboard/me",
    { schema: { tags: ["leaderboard"], querystring: meQuery } },
    async (request) => {
      const user = requireUser(request);
      return getMyRank(
        user.id,
        request.query.period as LeaderboardPeriod,
        resolveGame(request.query.game),
      );
    },
  );

  app.get(
    "/leaderboard/elo",
    { schema: { tags: ["leaderboard"], querystring: eloQuery } },
    async (request) => getEloLeaderboard(request.query.game, request.query.limit, ELO_MIN_GAMES),
  );

  app.get(
    "/leaderboard/elo/me",
    { schema: { tags: ["leaderboard"], querystring: eloQuery.pick({ game: true }) } },
    async (request) => {
      const user = requireUser(request);
      return getMyEloRank(user.id, request.query.game, ELO_MIN_GAMES);
    },
  );

  app.get(
    "/leaderboard/teams",
    { schema: { tags: ["leaderboard"], querystring: teamsQuery } },
    async (request) =>
      getTeamLeaderboard(request.query.period as LeaderboardPeriod, request.query.limit),
  );
}
