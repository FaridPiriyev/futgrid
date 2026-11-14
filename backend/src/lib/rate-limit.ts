import { createHash } from "node:crypto";
import { AppError } from "./errors.js";
import { getRedis } from "./redis.js";

export function rateLimitKey(...parts: (string | undefined)[]): string {
  return createHash("sha256").update(parts.filter(Boolean).join(":")).digest("hex");
}

export async function enforceScopedLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const redis = await getRedis();
  const redisKey = `rl:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.expire(redisKey, windowSeconds);
  if (count > limit) throw new AppError("RATE_LIMITED");
}
