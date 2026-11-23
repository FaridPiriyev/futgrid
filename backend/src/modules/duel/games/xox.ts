import {
  buildPuzzle,
  verifyAnswer,
  type Category,
  type GameData,
  type Puzzle,
} from "@futgrid/game-core";
import type { Room } from "../store.js";
import {
  asObject,
  event,
  oneOf,
  otherSeat,
  playerName,
  seats,
  serializeCategory,
  voteReady,
  type Ctx,
  type GameModule,
} from "./common.js";

// Futbol X0X — "Eyni ekran" rejiminin qaydaları ilə:
// raundlar oynanılır, raund qalibi 3-ü bir xəttə düzəndir; parametrləri otağı quran seçir.
const NEXT_MS = 12_000;
// Növbə vaxtı limitsizdirsə, raund sonsuz uzanmasın deyə gediş limiti.
const MAX_TURNS = 60;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export interface XoxSettings {
  difficulty: "easy" | "normal" | "hard";
  categories: { country: boolean; trophy: boolean; coach: boolean };
  steals: "none" | 3 | "unlimited";
  timer: 0 | 15 | 40 | 60;
  multipleChoice: boolean;
  target: 1 | 2 | 3;
}

function normalize(raw: unknown): XoxSettings {
  const s = asObject(raw);
  const cats = asObject(s.categories);
  return {
    difficulty: oneOf(s.difficulty, ["easy", "normal", "hard"] as const, "normal"),
    categories: {
      country: cats.country !== false,
      trophy: cats.trophy !== false,
      coach: cats.coach !== false,
    },
    steals: oneOf(s.steals, ["none", 3, "unlimited"] as const, "none"),
    timer: oneOf(Number(s.timer), [0, 15, 40, 60] as const, 40),
    multipleChoice: s.multipleChoice === true,
    target: oneOf(Number(s.target), [1, 2, 3] as const, 2),
  };
}

const settingsOf = (room: Room) => normalize(room.settings);

const puzzles = new Map<string, Puzzle>();
function roundPuzzle(data: GameData, room: Room, round: number): Puzzle {
  const settings = settingsOf(room);
  const seed = (room.seed + round * 7_919) >>> 0;
  const key = `${seed}|${settings.difficulty}|${settings.categories.country}${settings.categories.trophy}${settings.categories.coach}`;
  let puzzle = puzzles.get(key);
  if (!puzzle) {
    puzzle = buildPuzzle("xox", data, seed, {
      difficulty: settings.difficulty,
      categories: settings.categories,
    });
    puzzles.set(key, puzzle);
    if (puzzles.size > 300) puzzles.delete(puzzles.keys().next().value as string);
  }
  return puzzle;
}

const markOf = (room: Room, seat: string) => (room.state.marks?.[seat] as string) ?? "X";

function lineOf(cells: ({ mark: string } | null)[]): number[] | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const m = cells[a]?.mark;
    if (m && cells[b]?.mark === m && cells[c]?.mark === m) return [...line];
  }
  return null;
}

function stealPool(settings: XoxSettings): number | null {
  if (settings.steals === "none") return null;
  return settings.steals === "unlimited" ? -1 : settings.steals;
}

function startRound(room: Room, ctx: Ctx, starter: string) {
  const state = room.state;
  const settings = settingsOf(room);
  state.round = (state.round ?? 0) + 1;
  const puzzle = roundPuzzle(ctx.data, room, state.round);
  const grid = puzzle.grid as { rows: Category[]; cols: Category[] };
  const pool = stealPool(settings);
  state.grid = { rows: grid.rows.map(serializeCategory), cols: grid.cols.map(serializeCategory) };
  state.cells = Array(9).fill(null);
  state.turn = starter;
  state.starter = starter;
  state.turns = 0;
  state.steals = pool === null ? null : Object.fromEntries(seats(room).map((seat) => [seat, pool]));
  state.phase = "play";
  state.result = null;
  state.ready = [];
  state.deadline = settings.timer ? ctx.now + settings.timer * 1000 : null;
}

function passTurn(room: Room, ctx: Ctx) {
  const state = room.state;
  const settings = settingsOf(room);
  state.turn = otherSeat(room, state.turn);
  state.turns = (state.turns ?? 0) + 1;
  state.deadline = settings.timer ? ctx.now + settings.timer * 1000 : null;
  if (state.turns >= MAX_TURNS) endRound(room, ctx, null, { type: "draw" });
}

function endRound(room: Room, ctx: Ctx, winner: string | null, result: Record<string, unknown>) {
  const state = room.state;
  if (winner) state.wins[winner] = (state.wins[winner] ?? 0) + 1;
  state.phase = "round";
  state.result = { ...result, seat: winner };
  state.ready = [];
  if (winner && state.wins[winner] >= settingsOf(room).target) {
    state.deadline = null;
    ctx.finish(winner, "win");
    return;
  }
  state.deadline = ctx.now + NEXT_MS;
}

function nextRound(room: Room, ctx: Ctx) {
  startRound(room, ctx, otherSeat(room, room.state.starter));
}

export const xox: GameModule = {
  settings: normalize,

  start(room, ctx) {
    const [first, second] = room.players;
    room.state = {
      round: 0,
      wins: Object.fromEntries(seats(room).map((seat) => [seat, 0])),
      marks: { [first?.seat ?? ""]: "X", [second?.seat ?? ""]: "O" },
      lastEvent: null,
    };
    startRound(room, ctx, first?.seat ?? "");
  },

  move(room, seat, payload, ctx) {
    const state = room.state;
    if (payload.action === "next") {
      if (state.phase !== "round") return "ROUND_OVER";
      if (voteReady(room, seat)) nextRound(room, ctx);
      return null;
    }
    if (state.phase !== "play") return "ROUND_OVER";
    // Raundu təslim etmək növbədən asılı deyil.
    if (payload.action === "giveup") {
      state.lastEvent = event(ctx, "giveup", seat);
      endRound(room, ctx, otherSeat(room, seat), { type: "win", gaveUp: seat, line: [] });
      return null;
    }
    if (state.turn !== seat) return "NOT_YOUR_TURN";
    const name = (id: number) => playerName(ctx.data, id);

    if (payload.action === "pass") {
      state.lastEvent = event(ctx, "pass", seat);
      passTurn(room, ctx);
      return null;
    }

    const cell = Number(payload.cell);
    const playerId = Number(payload.playerId);
    if (!Number.isInteger(cell) || cell < 0 || cell > 8) return "INVALID_CELL";
    if (!Number.isInteger(playerId) || !ctx.data.playersById.has(playerId)) return "INVALID_PLAYER";
    const current = state.cells[cell] as { mark: string; playerId: number } | null;
    const mark = markOf(room, seat);
    const stealing = Boolean(current);
    if (current) {
      if (current.mark === mark) return "CELL_TAKEN";
      const left = state.steals?.[seat];
      if (left == null || left === 0) return "CELL_TAKEN";
    }

    const used = (state.cells as ({ playerId: number } | null)[]).some(
      (c) => c?.playerId === playerId,
    );
    const correct =
      !used &&
      verifyAnswer("xox", roundPuzzle(ctx.data, room, state.round), { round: cell, playerId });
    if (!correct) {
      state.lastEvent = event(ctx, used ? "used" : "wrong", seat, {
        cell,
        playerId,
        name: name(playerId),
      });
      passTurn(room, ctx);
      return null;
    }

    state.cells[cell] = { mark, playerId, name: name(playerId) };
    if (stealing && state.steals[seat] > 0) state.steals[seat] -= 1;
    state.lastEvent = event(ctx, stealing ? "steal" : "correct", seat, {
      cell,
      playerId,
      name: name(playerId),
    });
    const line = lineOf(state.cells);
    if (line) {
      endRound(room, ctx, seat, { type: "win", line });
      return null;
    }
    if ((state.cells as unknown[]).every(Boolean)) {
      endRound(room, ctx, null, { type: "draw" });
      return null;
    }
    passTurn(room, ctx);
    return null;
  },

  tick(room, ctx) {
    const state = room.state;
    if (state.phase === "round") {
      nextRound(room, ctx);
      return;
    }
    state.lastEvent = event(ctx, "timeout", state.turn);
    passTurn(room, ctx);
  },

  view(room) {
    const {
      round,
      wins,
      marks,
      grid,
      cells,
      turn,
      starter,
      steals,
      phase,
      result,
      ready,
      deadline,
      lastEvent,
    } = room.state;
    return {
      round,
      wins,
      marks,
      grid,
      cells,
      turn,
      starter,
      steals,
      phase,
      result,
      ready,
      deadline,
      lastEvent,
      nextMs: NEXT_MS,
    };
  },
};
