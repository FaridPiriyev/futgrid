import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requirePlayer } from "../../lib/auth.js";
import {
  answerDailyXox,
  finishDailyXox,
  getDaily,
  getDailyStats,
  guessDailyWordle,
} from "./service.js";
import {
  dailyGameSchema,
  dailyQuerySchema,
  dailyStatsQuerySchema,
  wordleGuessSchema,
  xoxAnswerSchema,
  xoxFinishSchema,
} from "./schemas.js";

export async function registerDailyRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/daily/:game/stats",
    { schema: { tags: ["daily"], params: dailyGameSchema, querystring: dailyStatsQuerySchema } },
    async (request) =>
      getDailyStats(request.params.game, request.query.date, request.query.difficulty),
  );

  app.get(
    "/daily/:game",
    { schema: { tags: ["daily"], params: dailyGameSchema, querystring: dailyQuerySchema } },
    async (request) => {
      const player = requirePlayer(request);
      return getDaily(request.params.game, request.query.difficulty, player);
    },
  );

  app.post(
    "/daily/xox/answer",
    { schema: { tags: ["daily"], body: xoxAnswerSchema } },
    async (request) => {
      const player = requirePlayer(request);
      return answerDailyXox(player, request.body);
    },
  );

  app.post(
    "/daily/xox/finish",
    { schema: { tags: ["daily"], body: xoxFinishSchema } },
    async (request) => {
      const player = requirePlayer(request);
      return finishDailyXox(player, request.body.difficulty);
    },
  );

  app.post(
    "/daily/wordle/guess",
    { schema: { tags: ["daily"], body: wordleGuessSchema } },
    async (request, reply) => {
      const player = requirePlayer(request);
      const result = await guessDailyWordle(player, request.body);
      return reply.send(result);
    },
  );
}
