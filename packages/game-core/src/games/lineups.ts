import { norm } from "../data.js";
import type { Answer, FamousMatch, GameData, Puzzle, ScoreBreakdown } from "../types.js";
import type { Random } from "../random.js";

export interface LineupSlot {
  side: "home" | "away";
  index: number;
  name: string;
  keys: string[];
}

const playableSides = (match: FamousMatch): ("home" | "away")[] =>
  (["home", "away"] as const).filter((side) => match[side]?.players?.length === 11);

export function lineupsMatches(data: GameData): FamousMatch[] {
  return (data.famousMatches ?? []).filter((match) => playableSides(match).length > 0);
}

function keysFor(name: string, shared: Set<string>): string[] {
  const full = norm(name);
  const tokens = full.split(" ");
  const keys = new Set([full, full.replace(/ /g, "")]);
  for (let index = 1; index < tokens.length; index++) {
    keys.add(tokens.slice(index).join(" "));
  }
  for (const token of tokens) {
    if (token.length >= 4 && !shared.has(token)) keys.add(token);
  }
  return [...keys].filter(Boolean);
}

function buildSlots(match: FamousMatch, sides: ("home" | "away")[]): LineupSlot[] {
  const counts = new Map<string, number>();
  for (const side of sides) {
    for (const player of match[side].players) {
      for (const token of new Set(norm(player.name).split(" "))) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    }
  }
  const shared = new Set([...counts].filter(([, count]) => count > 1).map(([token]) => token));
  const slots: LineupSlot[] = [];
  for (const side of sides) {
    match[side].players.forEach((player, index) => {
      slots.push({
        side,
        index,
        name: player.name,
        keys: keysFor(player.name, shared),
      });
    });
  }
  return slots;
}

export function buildLineupsPuzzle(
  seed: number,
  settings: Record<string, unknown>,
  data: GameData,
  random: Random,
): Puzzle {
  const matches = lineupsMatches(data);
  if (!matches.length) throw new Error("LINEUPS_DATA_UNAVAILABLE");
  const requestedMatchId = String(settings.matchId ?? "");
  const match =
    matches.find((entry) => entry.id === requestedMatchId) ??
    matches[Math.floor(random() * matches.length)];
  if (!match) throw new Error("LINEUPS_DATA_UNAVAILABLE");
  const sides = playableSides(match);
  const wanted = String(settings.side ?? "home");
  const chosenSides = sides.includes(wanted as "home" | "away")
    ? ([wanted] as ("home" | "away")[])
    : sides.slice(0, 1);
  const slots = buildSlots(match, chosenSides);
  return {
    game: "lineups",
    seed,
    settings: settings as Puzzle["settings"],
    matchId: match.id,
    matchName: `${match.home.name} - ${match.away.name}`,
    competition: match.competition,
    side: chosenSides[0],
    slots,
  };
}

export function verifyLineupsAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const slots = puzzle.slots as LineupSlot[];
  const slot = slots[Number(answer.round ?? 0)];
  if (!slot) return false;
  const guess = norm(answer.playerName ?? answer.name ?? answer.guess ?? "");
  if (guess.length < 3) return false;
  return slot.keys.includes(guess);
}

export function scoreLineups(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const slots = puzzle.slots as LineupSlot[];
  const found = new Set<number>();
  for (const answer of answers) {
    const index = Number(answer.round ?? -1);
    if (!found.has(index) && verifyLineupsAnswer(puzzle, answer)) found.add(index);
  }
  const ratio = Math.min(found.size / 11, 1);
  return {
    game: "lineups",
    correct: found.size,
    wrong: Math.max(0, answers.length - found.size),
    total: Math.min(slots.length, 11),
    ratio,
    score: Math.round(ratio * 1000) / 1000,
  };
}
