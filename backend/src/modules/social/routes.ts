import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { config } from "../../config.js";
import { requireUser } from "../../lib/auth.js";
import { sendPushToUser } from "../../lib/push.js";
import { prisma } from "../../lib/prisma.js";
import { getPublicProfile, listFriends, removeFriend, requestFriend } from "./service.js";

const usernameParams = z.object({ username: z.string().min(1).max(40) });

export async function registerSocialRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/players/:username",
    { schema: { tags: ["social"], params: usernameParams } },
    async (request) => getPublicProfile(request.params.username, request.identity?.userId),
  );

  app.get("/friends", { schema: { tags: ["social"] } }, async (request) => {
    const user = requireUser(request);
    return listFriends(user.id);
  });

  app.post(
    "/friends/:username",
    {
      schema: { tags: ["social"], params: usernameParams },
      ...(config.RATE_LIMIT_ENABLED ? { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } } : {}),
    },
    async (request) => {
      const user = requireUser(request);
      const result = await requestFriend(user.id, request.params.username);
      if (result.notifyUserId) {
        const me = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true, displayName: true },
        });
        void sendPushToUser(
          result.notifyUserId,
          "FutGrid",
          `${me?.displayName ?? me?.username ?? "?"} səni dost əlavə etmək istəyir`,
          { type: "friend_request", username: me?.username ?? "" },
        ).catch(() => {});
      }
      return { status: result.status };
    },
  );

  app.delete(
    "/friends/:username",
    { schema: { tags: ["social"], params: usernameParams } },
    async (request) => {
      const user = requireUser(request);
      return removeFriend(user.id, request.params.username);
    },
  );
}
