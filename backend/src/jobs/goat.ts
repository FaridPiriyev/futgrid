import cron from "node-cron";
import { logger } from "../lib/logger.js";
import { goatPlayers, GOAT_SIZES } from "../lib/goatData.js";
import { recomputeGoat } from "../modules/goat/service.js";

export function registerGoatJobs(): void {
  cron.schedule(
    "*/10 * * * *",
    async () => {
      try {
        const max = goatPlayers().length;
        for (const size of GOAT_SIZES) {
          if (size <= max) await recomputeGoat(size);
        }
        logger.info("goat rankings recomputed");
      } catch (error) {
        logger.error({ err: error }, "goat recompute failed");
      }
    },
    { timezone: "Asia/Baku" },
  );
}
