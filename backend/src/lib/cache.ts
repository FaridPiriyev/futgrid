import { getRedis } from "./redis.js";

export async function cachedJson<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  try {
    const redis = await getRedis();
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
    const value = await load();
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return value;
  } catch {
    return load();
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = await getRedis();
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch {
  }
}
