import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requireUser } from "../../lib/auth.js";
import { getMyRating, getRatingLeaderboard } from "./service.js";

const gameId = z
  .string()
  .regex(/^[a-zA-Z]{2,20}$/)
  .optional();

export async function registerRatingRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/ratings/leaderboard",
    {
      schema: {
        tags: ["ratings"],
        querystring: z.object({
          period: z.enum(["week", "lastweek", "month", "all"]).default("all"),
          game: gameId,
          limit: z.coerce.number().int().min(1).max(100).default(10),
        }),
      },
    },
    async (request) => getRatingLeaderboard(request.query.period, request.query.game, request.query.limit),
  );

  app.get(
    "/ratings/me",
    { schema: { tags: ["ratings"], querystring: z.object({ game: gameId }) } },
    async (request) => {
      const user = requireUser(request);
      return getMyRating(user.id, request.query.game);
    },
  );
}
