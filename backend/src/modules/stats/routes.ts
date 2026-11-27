import type { FastifyInstance } from "fastify";
import { RANKED_GAME_KEYS } from "@futgrid/game-core";
import { cachedJson } from "../../lib/cache.js";
import { dataVersion, getGameData } from "../../lib/data.js";
import { prisma } from "../../lib/prisma.js";
import { getRedis } from "../../lib/redis.js";
import { PRESENCE_KEY, PRESENCE_MS } from "../social/service.js";

async function loadStats() {
  const data = getGameData();
  const [activeUsers, goatVotes] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null, blockedAt: null } }),
    prisma.goatVote.count({ where: { counted: true } }),
  ]);
  return {
    players: data.players.length,
    clubs: data.clubs.length,
    countries: data.countries.length,
    coaches: data.coaches.length,
    games: RANKED_GAME_KEYS.length + 1,
    activeUsers,
    goatVotes,
    dataVersion: dataVersion(),
  };
}

/** "Who is playing right now": solo sessions started in the last 10 minutes + players in live duel rooms. */
async function loadLive() {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const solo = await prisma.gameSession.groupBy({
    by: ["gameId"],
    where: { status: "active", startedAt: { gte: since } },
    _count: { _all: true },
  });
  const games: Record<string, number> = {};
  for (const row of solo) games[row.gameId] = (games[row.gameId] ?? 0) + row._count._all;

  const redis = await getRedis();
  let cursor = "0";
  let scanned = 0;
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "duel:room:*", "COUNT", 200);
    cursor = next;
    scanned += keys.length;
    if (keys.length) {
      const raws = await redis.mget(...keys);
      for (const raw of raws) {
        if (!raw) continue;
        try {
          const room = JSON.parse(raw) as { game?: string; status?: string; players?: unknown[] };
          if (room.status === "playing" && room.game) {
            games[room.game] = (games[room.game] ?? 0) + (room.players?.length ?? 0);
          }
        } catch {
          // ignore malformed rooms
        }
      }
    }
  } while (cursor !== "0" && scanned < 5000);

  const online = await redis.zcount(PRESENCE_KEY, Date.now() - PRESENCE_MS, "+inf");
  const playing = Object.values(games).reduce((sum, n) => sum + n, 0);
  return { online, playing, games };
}

export async function registerStatsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/stats/live", { schema: { tags: ["stats"] } }, async () =>
    cachedJson("cache:stats:live", 20, loadLive),
  );

  fastify.get("/stats", { schema: { tags: ["stats"] } }, async () =>
    cachedJson("cache:stats:home", 10 * 60, loadStats),
  );
}
