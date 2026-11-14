import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requirePlayer } from "../../lib/auth.js";
import { getGoatRanking, goatVoteSchema, submitGoatVote } from "./service.js";

const rankingQuery = z.object({
  size: z.coerce.number().int().refine((value) => [16, 32, 64, 128].includes(value)).default(128),
});

export async function registerGoatRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/goat/votes",
    { schema: { tags: ["goat"], body: goatVoteSchema } },
    async (request, reply) => {
      const player = requirePlayer(request);
      const result = await submitGoatVote(player, request.body, request.ip);
      return reply.status(201).send(result);
    },
  );

  app.get(
    "/goat/ranking",
    { schema: { tags: ["goat"], querystring: rankingQuery } },
    async (request) => getGoatRanking(request.query.size),
  );
}
