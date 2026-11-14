import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { requirePlayer } from "../../lib/auth.js";
import { createSession, finishSession } from "./service.js";
import { createSessionSchema, finishSessionSchema } from "./schemas.js";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function registerSessionRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/sessions",
    { schema: { tags: ["sessions"], body: createSessionSchema } },
    async (request, reply) => {
      const player = requirePlayer(request);
      const session = await createSession(player, request.body, request);
      return reply.status(201).send(session);
    },
  );

  app.post(
    "/sessions/:id/finish",
    { schema: { tags: ["sessions"], params: paramsSchema, body: finishSessionSchema } },
    async (request) => {
      const player = requirePlayer(request);
      return finishSession(player, request.params.id, request.body);
    },
  );
}
