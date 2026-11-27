import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import { mkdirSync } from "node:fs";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { ZodError } from "zod";
import { config } from "./config.js";
import { assertCsrf, resolveIdentity } from "./lib/auth.js";
import { errorBody, isAppError } from "./lib/errors.js";
import { parseLocale } from "./lib/i18n.js";
import { logger } from "./lib/logger.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerUserRoutes } from "./modules/users/routes.js";
import { registerSessionRoutes } from "./modules/sessions/routes.js";
import { registerLeaderboardRoutes } from "./modules/leaderboard/routes.js";
import { registerEventRoutes } from "./modules/events/routes.js";
import { registerDailyRoutes } from "./modules/daily/routes.js";
import { registerGoatRoutes } from "./modules/goat/routes.js";
import { registerContactRoutes } from "./modules/contact/routes.js";
import { registerStatsRoutes } from "./modules/stats/routes.js";
import { registerAdminRoutes } from "./modules/admin/routes.js";
import { registerDuelRoutes } from "./modules/duel/routes.js";
import { registerSocialRoutes } from "./modules/social/routes.js";
import { registerRatingRoutes } from "./modules/ratings/routes.js";
import { storageDir } from "./lib/storage.js";

export async function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: config.TRUST_PROXY,
    bodyLimit: 256 * 1024,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 5_000_000, files: 1 } });
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error("CORS_ORIGIN_REJECTED"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept-Language",
      "X-Guest-Id",
      "X-Client",
      "X-Admin-TOTP",
    ],
  });
  mkdirSync(storageDir("data"), { recursive: true });
  mkdirSync(storageDir("media"), { recursive: true });
  await app.register(fastifyStatic, {
    root: storageDir("data"),
    prefix: "/cdn-data/",
    decorateReply: false,
  });
  await app.register(fastifyStatic, {
    root: storageDir("media"),
    prefix: "/media/",
    decorateReply: false,
  });

  await app.register(rateLimit, {
    global: config.RATE_LIMIT_ENABLED,
    max: 300,
    timeWindow: "1 minute",
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => errorBody("RATE_LIMITED", "en"),
  });

  if (config.SWAGGER_ENABLED) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: "FutGrid API",
          version: "1.0.0",
          description: "Server-verified FutGrid game API",
        },
        servers: [{ url: config.API_URL }],
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: "/docs" });
  }

  app.addHook("onRequest", async (request) => {
    await resolveIdentity(request);
    assertCsrf(request);
  });

  app.setErrorHandler((error: any, request, reply) => {
    const locale = parseLocale(request.headers["accept-language"] as string | undefined);

    if (error instanceof ZodError) {
      return reply.status(400).send(
        errorBody(
          "VALIDATION_FAILED",
          locale,
          error.issues.map((issue) => ({
            field: issue.path.join("."),
            rule: issue.code,
          })),
        ),
      );
    }

    if (isAppError(error)) {
      return reply.status(error.statusCode).send(errorBody(error.code, locale, error.details));
    }

    if (error.validation) {
      return reply.status(400).send(
        errorBody(
          "VALIDATION_FAILED",
          locale,
          error.validation.map((issue: any) => ({
            field: issue.instancePath?.replace(/^\//, "") ?? issue.params?.["missingProperty"] ?? "",
            rule: issue.keyword ?? "validation",
          })),
        ),
      );
    }

    if (error.statusCode === 429) {
      return reply.status(429).send(errorBody("RATE_LIMITED", locale));
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply
        .status(error.statusCode)
        .send(errorBody("VALIDATION_FAILED", locale, [{ rule: error.code ?? "request" }]));
    }

    request.log.error({ err: error }, "unhandled request error");
    return reply.status(500).send(errorBody("INTERNAL", locale));
  });

  app.get("/health", async () => ({ ok: true, version: "1.0.0" }));

  await app.register(
    async (v1) => {
      await registerAuthRoutes(v1);
      await registerUserRoutes(v1);
      await registerSessionRoutes(v1);
      await registerLeaderboardRoutes(v1);
      await registerEventRoutes(v1);
      await registerDailyRoutes(v1);
      await registerGoatRoutes(v1);
      await registerContactRoutes(v1);
      await registerStatsRoutes(v1);
      await registerAdminRoutes(v1);
      await registerDuelRoutes(v1);
      await registerSocialRoutes(v1);
      await registerRatingRoutes(v1);
    },
    { prefix: "/v1" },
  );

  return app;
}
