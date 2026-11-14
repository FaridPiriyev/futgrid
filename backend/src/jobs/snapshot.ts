import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { runSnapshotSet } from "../modules/leaderboard/service.js";

export function registerJobs(): void {
  cron.schedule(
    "0 0 * * 1",
    async () => {
      try {
        await runSnapshotSet("week");
        logger.info("weekly leaderboard snapshot completed");
      } catch (error) {
        logger.error({ err: error }, "weekly leaderboard snapshot failed");
      }
    },
    { timezone: "Asia/Baku" },
  );

  cron.schedule(
    "0 0 1 * *",
    async () => {
      try {
        await runSnapshotSet("month");
        logger.info("monthly leaderboard snapshot completed");
      } catch (error) {
        logger.error({ err: error }, "monthly leaderboard snapshot failed");
      }
    },
    { timezone: "Asia/Baku" },
  );
}
