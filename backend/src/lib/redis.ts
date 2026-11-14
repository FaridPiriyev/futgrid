import Redis from "ioredis";
import { config } from "../config.js";

const globalForRedis = globalThis as unknown as { futgridRedis?: Redis };

export const redis =
  globalForRedis.futgridRedis ??
  new Redis(config.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: true,
  });

if (!config.isProduction) globalForRedis.futgridRedis = redis;

export async function getRedis(): Promise<Redis> {
  if (redis.status === "wait" || redis.status === "end") {
    await redis.connect();
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis.status !== "end") {
    await redis.quit().catch(() => redis.disconnect());
  }
}
