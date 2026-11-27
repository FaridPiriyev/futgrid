import { buildPuzzle } from "@futgrid/game-core";
import { leaderOf, topScore, zeroScores, type Ctx, type GameModule } from "./common.js";
import type { Room } from "../store.js";

const TARGET = 5;
/** Time each player has to pick a direction. Without it an idle opponent stalls the game forever. */
export const HL_ROUND_MS = 20_000;

type Round = { aId: number; bId: number; aValue: number; bValue: number };

function resolveRound(room: Room, ctx: Ctx) {
  const state = room.state;
  const round = (state.sequence as Round[])[state.index];
  if (!round) return;
  const correctDirection = round.bValue >= round.aValue ? "up" : "down";
  for (const [id, direction] of Object.entries(state.answers as Record<string, string>)) {
    if (direction === correctDirection) state.scores[id] = (state.scores[id] ?? 0) + 1;
  }
  state.revealed = { ...round, answers: state.answers, correctDirection };
  state.answers = {};
  state.index += 1;
  state.deadline = ctx.now + HL_ROUND_MS;
  if (state.index >= state.sequence.length || topScore(state.scores) >= TARGET) {
    const winner = leaderOf(state.scores);
    ctx.finish(winner, winner ? "win" : "draw");
  }
}

export const higherLower: GameModule = {
  start(room, ctx) {
    const puzzle = buildPuzzle("higherLower", ctx.data, room.seed, {
      difficulty: "normal",
      rounds: 10,
    });
    room.state = {
      sequence: puzzle.sequence as Round[],
      index: 0,
      scores: zeroScores(room),
      answers: {},
      revealed: null,
      deadline: ctx.now + HL_ROUND_MS,
    };
  },

  move(room, seat, payload, ctx) {
    const state = room.state;
    const round = (state.sequence as Round[])[state.index];
    if (!round) return "GAME_OVER";
    if (state.answers[seat]) return "ALREADY_ANSWERED";
    if (payload.direction !== "up" && payload.direction !== "down") return "INVALID_DIRECTION";
    state.answers[seat] = payload.direction;
    if (Object.keys(state.answers).length < room.players.length) return null;
    resolveRound(room, ctx);
    return null;
  },

  // Time ran out: whoever didn't answer simply scores nothing this round.
  tick(room, ctx) {
    resolveRound(room, ctx);
  },

  view(room) {
    const { sequence, index, scores, answers, revealed, deadline } = room.state;
    const current = (sequence as Round[])[index];
    return {
      index,
      scores,
      answered: Object.keys(answers),
      revealed,
      deadline: deadline ?? null,
      roundMs: HL_ROUND_MS,
      current: current ? { aId: current.aId, bId: current.bId, aValue: current.aValue } : null,
    };
  },
};
