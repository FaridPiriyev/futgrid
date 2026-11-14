import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { contactSchema, submitContact } from "./service.js";

export async function registerContactRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/contact",
    { schema: { tags: ["contact"], body: contactSchema } },
    async (request, reply) => {
      const result = await submitContact(request.body, request);
      return reply.status(201).send(result);
    },
  );
}
