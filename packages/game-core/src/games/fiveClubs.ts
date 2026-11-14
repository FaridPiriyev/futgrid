import { clubFameReady, clubFameTier, playerFame } from "../fame.js";
import type { Answer, GameData, Puzzle, RawClub, RawPlayer, ScoreBreakdown } from "../types.js";
import type { Random } from "../random.js";

export const CLUB_POOL = { easy: 24, normal: 45, hard: 140 } as const;
const MAX_TIER = { easy: 1, normal: 2, hard: 3 } as const;
const CORE = { easy: 5, normal: 3, hard: 0 } as const;

const popularity = (player: RawPlayer): number =>
  Math.max(player.market_value?.amount_eur ?? 0, player.market_value?.highest_eur ?? 0);

function rankedClubs(data: GameData): RawClub[] {
  if (data._fiveClubs) return data._fiveClubs;
  const fame = new Map<number, number>();
  for (const player of data.players) {
    const value = popularity(player);
    if (!value) continue;
    for (const id of new Set(player.club_history ?? [])) {
      fame.set(id, (fame.get(id) ?? 0) + value);
    }
  }
  data._fiveClubs = data.clubs
    .filter((club) => (data.playersByClub.get(club.id)?.size ?? 0) >= 30)
    .sort((a, b) => (fame.get(b.id) ?? 0) - (fame.get(a.id) ?? 0));
  return data._fiveClubs;
}

export interface FiveClubsAnswer {
  playerId: number;
  count: number;
}

export function answersFor(data: GameData, clubs: RawClub[]): FiveClubsAnswer[] {
  const counts = new Map<number, number>();
  for (const club of clubs) {
    for (const id of data.playersByClub.get(club.id) ?? []) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts]
    .filter(([, count]) => count >= 2)
    .map(([id, count]) => ({ player: data.playersById.get(id), count }))
    .filter((item): item is { player: RawPlayer; count: number } => Boolean(item.player))
    .sort(
      (a, b) => b.count - a.count || playerFame(b.player) - playerFame(a.player),
    )
    .map((item) => ({ playerId: item.player.id, count: item.count }));
}

function poolFor(data: GameData, difficulty: string): { core: RawClub[]; wide: RawClub[] } {
  const ranked = rankedClubs(data);
  const size = CLUB_POOL[difficulty as keyof typeof CLUB_POOL] ?? CLUB_POOL.normal;
  if (difficulty === "hard") return { core: [], wide: ranked.slice(0, size) };
  if (!clubFameReady(data)) {
    return { core: ranked.slice(0, Math.min(size, 20)), wide: ranked.slice(0, size) };
  }
  const max = MAX_TIER[difficulty as keyof typeof MAX_TIER] ?? 2;
  const wide = ranked.filter((club) => clubFameTier(club) <= max);
  const core = ranked.filter((club) => clubFameTier(club) === 1);
  return wide.length >= 10
    ? { core, wide }
    : { core: ranked.slice(0, 20), wide: ranked.slice(0, size) };
}

export function pickClubs(
  data: GameData,
  difficulty: string,
  random: Random,
): { clubs: RawClub[]; answers: FiveClubsAnswer[]; score: number } | null {
  const { core, wide } = poolFor(data, difficulty);
  const coreCount = core.length >= 5 ? CORE[difficulty as keyof typeof CORE] ?? 3 : 0;
  let best: { clubs: RawClub[]; answers: FiveClubsAnswer[]; score: number } | null = null;
  for (let attempt = 0; attempt < 300; attempt++) {
    const clubs: RawClub[] = [];
    const used = new Set<number>();
    let guard = 0;
    while (clubs.length < 5 && guard++ < 400) {
      const list = clubs.length < coreCount ? core : wide;
      const club = list[Math.floor(random() * list.length)];
      if (!club || used.has(club.id)) continue;
      used.add(club.id);
      clubs.push(club);
    }
    if (clubs.length < 5) continue;
    const answers = answersFor(data, clubs);
    const triple = answers.some((answer) => answer.count >= 3);
    const linked = clubs.every((club) =>
      answers.some((answer) => data.playersByClub.get(club.id)?.has(answer.playerId)),
    );
    const score = answers.length + (triple ? 20 : 0) + (linked ? 20 : 0);
    if (!best || score > best.score) best = { clubs, answers, score };
    if (answers.length >= 12 && triple && linked) break;
  }
  return best;
}

export function buildFiveClubsPuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const difficulty = String(settings.difficulty ?? "normal");
  const set = pickClubs(data, difficulty, random);
  if (!set) throw new Error("FIVE_CLUBS_UNAVAILABLE");
  return {
    game: "fiveClubs",
    seed,
    settings: settings as Puzzle["settings"],
    difficulty,
    clubs: set.clubs.map((club) => ({ id: club.id, name: club.name })),
    answers: set.answers,
  };
}

export function verifyFiveClubsAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const playerId = Number(answer.playerId);
  const clubIds = (puzzle.clubs as { id: number }[]).map((club) => club.id);
  const target = (puzzle as unknown as { clubPlayers?: Map<number, Set<number>> }).clubPlayers;
  if (target) return (target.get(playerId)?.size ?? 0) >= 2;
  return (puzzle.answers as FiveClubsAnswer[]).some(
    (entry) => entry.playerId === playerId && entry.count >= Math.min(2, clubIds.length),
  );
}

export function scoreFiveClubs(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const expected = new Set((puzzle.answers as FiveClubsAnswer[]).map((answer) => answer.playerId));
  const found = new Set<number>();
  for (const answer of answers) {
    const playerId = Number(answer.playerId);
    if (expected.has(playerId) && verifyFiveClubsAnswer(puzzle, answer)) found.add(playerId);
  }
  const ratio = Math.min(found.size / 10, 1);
  return {
    game: "fiveClubs",
    correct: found.size,
    wrong: Math.max(0, answers.length - found.size),
    total: 10,
    ratio,
    score: Math.round(ratio * 1000) / 1000,
  };
}
