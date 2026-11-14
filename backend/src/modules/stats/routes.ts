import type { FastifyInstance } from "fastify";
import { RANKED_GAME_KEYS } from "@futgrid/game-core";
import { cachedJson } from "../../lib/cache.js";
import { dataVersion, getGameData } from "../../lib/data.js";
import { prisma } from "../../lib/prisma.js";

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

export async function registerStatsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/stats", { schema: { tags: ["stats"] } }, async () =>
    cachedJson("cache:stats:home", 10 * 60, loadStats),
  );
}
