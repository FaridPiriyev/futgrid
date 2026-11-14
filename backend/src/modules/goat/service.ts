import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { cachedJson, invalidateCache } from "../../lib/cache.js";
import { hashIp } from "../../lib/crypto.js";
import { AppError } from "../../lib/errors.js";
import { goatPlayers, GOAT_SIZES } from "../../lib/goatData.js";
import { prisma } from "../../lib/prisma.js";
import { bakuDateKey } from "../../lib/time.js";

export const goatVoteSchema = z.object({
  size: z.union([z.literal(16), z.literal(32), z.literal(64), z.literal(128)]),
  champion: z.string().min(1),
  final: z.array(z.string().min(1)).length(2),
  semi: z.array(z.string().min(1)).length(4),
  picks: z
    .array(
      z.object({
        winner: z.string().min(1),
        loser: z.string().min(1),
      }),
    )
    .min(15)
    .max(127),
});

export type GoatVoteInput = z.infer<typeof goatVoteSchema>;

interface Actor {
  userId?: string;
  guestId?: string;
}

interface VotePick {
  winner: string;
  loser: string;
}

export async function submitGoatVote(
  actor: Actor,
  input: GoatVoteInput,
  requestIp: string | undefined,
) {
  const players = goatPlayers().slice(0, input.size);
  const ids = new Set(players.map((player) => player.id));
  const invalid = (rule: string): never => {
    throw new AppError("VALIDATION_FAILED", { details: [{ rule }] });
  };

  if (input.picks.length !== input.size - 1) invalid("picks_count");
  if (!ids.has(input.champion)) invalid("champion_not_in_roster");
  if (new Set(input.final).size !== 2 || input.final.some((id) => !ids.has(id))) {
    invalid("invalid_final");
  }
  if (new Set(input.semi).size !== 4 || input.semi.some((id) => !ids.has(id))) {
    invalid("invalid_semi");
  }
  if (!input.final.includes(input.champion)) invalid("champion_not_in_final");
  if (!input.semi.includes(input.champion)) invalid("champion_not_in_semi");

  const losers = new Set<string>();
  for (const pick of input.picks) {
    if (!ids.has(pick.winner) || !ids.has(pick.loser)) invalid("pick_not_in_roster");
    if (pick.winner === pick.loser) invalid("self_pick");
    if (losers.has(pick.loser)) invalid("player_lost_twice");
    losers.add(pick.loser);
  }
  if (losers.size !== input.size - 1) invalid("picks_count");
  if (losers.has(input.champion)) invalid("champion_lost");

  const voteDate = bakuDateKey();
  const ipHash = hashIp(requestIp);
  if (ipHash) {
    const ipCount = await prisma.goatVote.count({ where: { ipHash, voteDate } });
    if (ipCount >= 20) throw new AppError("RATE_LIMITED");
  }

  const actorWhere = actor.userId
    ? { userId: actor.userId, voteDate }
    : { guestId: actor.guestId, voteDate };

  await prisma.$transaction([
    prisma.goatVote.updateMany({
      where: { ...actorWhere, counted: true },
      data: { counted: false },
    }),
    prisma.goatVote.create({
      data: {
        ...(actor.userId ? { userId: actor.userId } : { guestId: actor.guestId }),
        size: input.size,
        champion: input.champion,
        final: input.final,
        semi: input.semi,
        picks: input.picks as unknown as Prisma.InputJsonValue,
        counted: true,
        voteDate,
        ipHash,
      },
    }),
  ]);

  await invalidateCache("cache:goat:*");
  return { ok: true, counted: true, voteDate };
}

interface PlayerStat {
  championCount: number;
  finalCount: number;
  semiCount: number;
  wins: number;
  losses: number;
  elo: number;
}

export async function recomputeGoat(size: number): Promise<void> {
  const players = goatPlayers().slice(0, size);
  const votes = await prisma.goatVote.findMany({
    where: { size, counted: true },
    orderBy: { createdAt: "asc" },
  });
  const stats = new Map<string, PlayerStat>();
  for (const player of players) {
    stats.set(player.id, {
      championCount: 0,
      finalCount: 0,
      semiCount: 0,
      wins: 0,
      losses: 0,
      elo: 1500,
    });
  }
  const pairs = new Map<string, number>();
  const K = 24;

  for (const vote of votes) {
    const champion = stats.get(vote.champion);
    if (champion) champion.championCount++;
    for (const id of vote.final) {
      const entry = stats.get(id);
      if (entry) entry.finalCount++;
    }
    for (const id of vote.semi) {
      const entry = stats.get(id);
      if (entry) entry.semiCount++;
    }
    for (const pick of vote.picks as unknown as VotePick[]) {
      const winner = stats.get(pick.winner);
      const loser = stats.get(pick.loser);
      if (!winner || !loser) continue;
      winner.wins++;
      loser.losses++;
      const key = `${pick.winner}|${pick.loser}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);

      const expected = 1 / (1 + 10 ** ((loser.elo - winner.elo) / 400));
      const delta = K * (1 - expected);
      winner.elo += delta;
      loser.elo -= delta;
    }
  }

  await prisma.$transaction([
    prisma.goatPlayerStat.deleteMany({ where: { size } }),
    prisma.goatPairStat.deleteMany({ where: { size } }),
    prisma.goatPlayerStat.createMany({
      data: players.map((player) => ({
        size,
        playerId: player.id,
        championCount: stats.get(player.id)?.championCount ?? 0,
        finalCount: stats.get(player.id)?.finalCount ?? 0,
        semiCount: stats.get(player.id)?.semiCount ?? 0,
        wins: stats.get(player.id)?.wins ?? 0,
        losses: stats.get(player.id)?.losses ?? 0,
        elo: Math.round((stats.get(player.id)?.elo ?? 1500) * 10) / 10,
      })),
    }),
    prisma.goatPairStat.createMany({
      data: [...pairs.entries()].map(([key, wins]) => {
        const [winnerId, loserId] = key.split("|") as [string, string];
        return { size, winnerId, loserId, wins };
      }),
    }),
  ]);
  await invalidateCache("cache:goat:*");
}

export async function getGoatRanking(size: number) {
  return cachedJson(`cache:goat:${size}`, 5 * 60, async () => {
    let rows = await prisma.goatPlayerStat.findMany({
      where: { size },
      orderBy: [{ championCount: "desc" }, { elo: "desc" }],
    });
    if (!rows.length) {
      await recomputeGoat(size);
      rows = await prisma.goatPlayerStat.findMany({
        where: { size },
        orderBy: [{ championCount: "desc" }, { elo: "desc" }],
      });
    }
    const roster = new Map(goatPlayers().map((player) => [player.id, player]));
    return {
      size,
      entries: rows.map((row, index) => {
        const player = roster.get(row.playerId);
        const total = row.wins + row.losses;
        return {
          rank: index + 1,
          playerId: row.playerId,
          name: player?.name ?? row.playerId,
          code: player?.code ?? "",
          pos: player?.pos ?? "",
          championCount: row.championCount,
          finalCount: row.finalCount,
          semiCount: row.semiCount,
          wins: row.wins,
          losses: row.losses,
          winRate: total ? Math.round((row.wins / total) * 1000) / 10 : 0,
          elo: Math.round(row.elo * 10) / 10,
        };
      }),
    };
  });
}

export function goatSizes(): number[] {
  return [...GOAT_SIZES];
}
