import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { closeOldDailyPuzzles, generateDailyPuzzles } from "../modules/daily/service.js";

export function registerDailyJobs(): void {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await generateDailyPuzzles();
        logger.info("daily puzzles generated");
      } catch (error) {
        logger.error({ err: error }, "daily puzzle generation failed");
      }
    },
    { timezone: "Asia/Baku" },
  );

  cron.schedule(
    "5 0 * * *",
    async () => {
      try {
        await closeOldDailyPuzzles();
        logger.info("old daily puzzles closed");
      } catch (error) {
        logger.error({ err: error }, "daily puzzle close failed");
      }
    },
    { timezone: "Asia/Baku" },
  );
}
