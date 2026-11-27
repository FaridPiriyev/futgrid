import { prisma } from "../../lib/prisma.js";
import { OVERALL_GAME } from "../duel/rating.js";

/**
 * Achievements are computed from data we already store (no extra table):
 * the profile shows them as a showcase and the browser announces newly unlocked ones.
 */
export interface Achievement {
  key: string;
  progress: number;
  target: number;
  unlocked: boolean;
}

interface Facts {
  played: number;
  wins: number;
  duels: number;
  duelWins: number;
  distinctGames: number;
  bestDailyStreak: number;
  hardWins: number;
  perfects: number;
  friends: number;
  overall: number;
}

const RULES: { key: string; target: number; value: (f: Facts) => number }[] = [
  { key: "first_win", target: 1, value: (f) => f.wins + f.duelWins },
  { key: "games_10", target: 10, value: (f) => f.played + f.duels },
  { key: "games_100", target: 100, value: (f) => f.played + f.duels },
  { key: "duel_first", target: 1, value: (f) => f.duelWins },
  { key: "duel_10", target: 10, value: (f) => f.duelWins },
  { key: "duel_50", target: 50, value: (f) => f.duelWins },
  { key: "streak_7", target: 7, value: (f) => f.bestDailyStreak },
  { key: "hard_win", target: 1, value: (f) => f.hardWins },
  { key: "perfect_5", target: 5, value: (f) => f.perfects },
  { key: "explorer", target: 8, value: (f) => f.distinctGames },
  { key: "social_5", target: 5, value: (f) => f.friends },
  { key: "silver", target: 1100, value: (f) => f.overall },
  { key: "gold", target: 1250, value: (f) => f.overall },
];

async function facts(userId: string): Promise<Facts> {
  const [stats, duels, duelWins, streak, hardWins, perfects, friends, overall] = await Promise.all([
    prisma.userGameStats.findMany({ where: { userId }, select: { played: true, wins: true } }),
    prisma.duelMatch.count({ where: { playerIds: { has: userId } } }),
    prisma.duelMatch.count({ where: { winnerId: userId } }),
    prisma.dailyStreak.aggregate({ where: { userId }, _max: { bestStreak: true } }),
    prisma.gameSession.count({
      where: { userId, status: "finished", difficulty: "hard", score: { gte: 0.8 }, flagged: false },
    }),
    prisma.gameSession.count({ where: { userId, status: "finished", score: { gte: 1 }, flagged: false } }),
    prisma.friendship.count({ where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] } }),
    prisma.userRating.findUnique({ where: { userId_gameId: { userId, gameId: OVERALL_GAME } }, select: { rating: true } }),
  ]);
  return {
    played: stats.reduce((sum, row) => sum + row.played, 0),
    wins: stats.reduce((sum, row) => sum + row.wins, 0),
    duels,
    duelWins,
    distinctGames: stats.filter((row) => row.played > 0).length,
    bestDailyStreak: streak._max.bestStreak ?? 0,
    hardWins,
    perfects,
    friends,
    overall: Math.round(overall?.rating ?? 1000),
  };
}

export async function getAchievements(userId: string): Promise<Achievement[]> {
  const f = await facts(userId);
  return RULES.map((rule) => {
    const progress = rule.value(f);
    return { key: rule.key, progress: Math.min(progress, rule.target), target: rule.target, unlocked: progress >= rule.target };
  });
}
