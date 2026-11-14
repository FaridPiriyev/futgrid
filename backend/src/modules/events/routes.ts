import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requirePlayer } from "../../lib/auth.js";
import { eventSchema } from "../sessions/schemas.js";
import { recordEvent } from "../sessions/service.js";

export async function registerEventRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/events",
    { schema: { tags: ["events"], body: eventSchema } },
    async (request, reply) => {
      const player = requirePlayer(request);
      const result = await recordEvent(player, request.body);
      return reply.status(201).send(result);
    },
  );
}
