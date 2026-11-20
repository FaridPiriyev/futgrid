import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { requireUser } from "../../lib/auth.js";
import { AppError } from "../../lib/errors.js";
import {
  deleteMe,
  exportMe,
  getMe,
  getMyDuels,
  getMyRatings,
  importGuest,
  putSettings,
  registerPushToken,
  deletePushToken,
  updateMe,
  changeUsername,
  changePassword,
  setAvatar,
  clearAvatar,
} from "./service.js";
import {
  deletePushTokenSchema,
  gameKeyParamsSchema,
  importGuestSchema,
  patchMeSchema,
  pushTokenSchema,
  settingsSchema,
  usernameSchema,
  passwordChangeSchema,
} from "./schemas.js";

export async function registerUserRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get("/me", { schema: { tags: ["users"] } }, async (request) => {
    const user = requireUser(request);
    return getMe(user.id);
  });

  app.patch(
    "/me",
    { schema: { tags: ["users"], body: patchMeSchema } },
    async (request) => {
      const user = requireUser(request);
      return updateMe(user.id, request.body);
    },
  );

  app.put(
    "/me/settings/:gameKey",
    { schema: { tags: ["users"], params: gameKeyParamsSchema, body: settingsSchema } },
    async (request) => {
      const user = requireUser(request);
      return putSettings(user.id, request.params.gameKey, request.body.settings);
    },
  );

  app.post(
    "/me/import-guest",
    { schema: { tags: ["users"], body: importGuestSchema } },
    async (request) => {
      const user = requireUser(request);
      return importGuest(user.id, request.body, request);
    },
  );

  app.get("/me/export", { schema: { tags: ["users"] } }, async (request) => {
    const user = requireUser(request);
    return exportMe(user.id);
  });

  app.patch(
    "/me/username",
    { schema: { tags: ["users"], body: usernameSchema } },
    async (request) => {
      const user = requireUser(request);
      return changeUsername(user.id, request.body.username);
    },
  );

  app.post(
    "/me/password",
    { schema: { tags: ["users"], body: passwordChangeSchema } },
    async (request) => {
      const user = requireUser(request);
      await changePassword(user.id, request.body.currentPassword, request.body.newPassword);
      return { ok: true };
    },
  );

  app.post("/me/avatar", { schema: { tags: ["users"] } }, async (request, reply) => {
    const user = requireUser(request);
    const file = await request.file();
    if (!file) {
      throw new AppError("VALIDATION_FAILED", {
        details: [{ field: "avatar", rule: "file_required" }],
      });
    }
    const buffer = await file.toBuffer();
    const result = await setAvatar(user.id, buffer, file.mimetype);
    return reply.status(201).send(result);
  });

  app.delete("/me/avatar", { schema: { tags: ["users"] } }, async (request) => {
    const user = requireUser(request);
    await clearAvatar(user.id);
    return { ok: true };
  });

  app.get("/me/ratings", { schema: { tags: ["users"] } }, async (request) => {
    const user = requireUser(request);
    return getMyRatings(user.id);
  });

  app.get("/me/duels", { schema: { tags: ["users"] } }, async (request) => {
    const user = requireUser(request);
    return getMyDuels(user.id);
  });

  app.post(
    "/me/push-tokens",
    { schema: { tags: ["users"], body: pushTokenSchema } },
    async (request, reply) => {
      const user = requireUser(request);
      await registerPushToken(user.id, request.body.token, request.body.platform);
      return reply.status(201).send({ ok: true });
    },
  );

  app.delete(
    "/me/push-tokens",
    { schema: { tags: ["users"], body: deletePushTokenSchema } },
    async (request) => {
      const user = requireUser(request);
      await deletePushToken(user.id, request.body.token);
      return { ok: true };
    },
  );

  app.delete("/me", { schema: { tags: ["users"] } }, async (request, reply) => {
    const user = requireUser(request);
    await deleteMe(user.id);
    return reply.status(204).send();
  });
}
