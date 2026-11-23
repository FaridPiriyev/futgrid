import { buildPuzzle } from "@futgrid/game-core";
import { leaderOf, topScore, zeroScores, type GameModule } from "./common.js";

const TARGET = 5;

type Round = { aId: number; bId: number; aValue: number; bValue: number };

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
      deadline: null,
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
    const correctDirection = round.bValue >= round.aValue ? "up" : "down";
    for (const [id, direction] of Object.entries(state.answers)) {
      if (direction === correctDirection) state.scores[id] = (state.scores[id] ?? 0) + 1;
    }
    state.revealed = { ...round, answers: state.answers, correctDirection };
    state.answers = {};
    state.index += 1;
    if (state.index >= state.sequence.length || topScore(state.scores) >= TARGET) {
      const winner = leaderOf(state.scores);
      ctx.finish(winner, winner ? "win" : "draw");
    }
    return null;
  },

  view(room) {
    const { sequence, index, scores, answers, revealed } = room.state;
    const current = (sequence as Round[])[index];
    return {
      index,
      scores,
      // Kimin cavab verdiyini göstəririk, nə cavab verdiyini yox.
      answered: Object.keys(answers),
      revealed,
      current: current ? { aId: current.aId, bId: current.bId, aValue: current.aValue } : null,
    };
  },
};
