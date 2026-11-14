import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { runDataSync } from "../modules/data/service.js";

export function registerDataJobs(): void {
  cron.schedule(
    "0 3 * * *",
    async () => {
      try {
        await runDataSync();
        logger.info("nightly data sync completed");
      } catch (error) {
        logger.error({ err: error }, "nightly data sync failed");
      }
    },
    { timezone: "Asia/Baku" },
  );
}
