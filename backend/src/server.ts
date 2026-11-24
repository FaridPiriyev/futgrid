import * as Sentry from "@sentry/node";
import { buildApp } from "./app.js";
import { config } from "./config.js";
import { ensureGames } from "./lib/games.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { closeRedis } from "./lib/redis.js";
import { registerJobs } from "./jobs/snapshot.js";
import { registerDailyJobs } from "./jobs/daily.js";
import { registerGoatJobs } from "./jobs/goat.js";
import { registerDataJobs } from "./jobs/data.js";
import { setupDuels } from "./modules/duel/socket.js";
import { generateDailyPuzzles } from "./modules/daily/service.js";

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});

async function main(): Promise<void> {
  if (config.SENTRY_DSN) {
    Sentry.init({ dsn: config.SENTRY_DSN, environment: config.NODE_ENV });
  }

  const app = await buildApp();
  const duels = setupDuels(app.server);
  await ensureGames();
  registerJobs();
  registerDailyJobs();
  registerGoatJobs();
  registerDataJobs();

  await app.listen({ host: config.HOST, port: config.PORT });
  logger.info({ host: config.HOST, port: config.PORT }, "FutGrid API listening");
  void generateDailyPuzzles().catch((error) =>
    logger.error({ err: error }, "initial daily puzzle generation failed"),
  );

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    await duels.close();
    await app.close();
    await closeRedis();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error({ err: error }, "failed to start server");
  process.exit(1);
});
