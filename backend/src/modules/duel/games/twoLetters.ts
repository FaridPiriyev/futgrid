import {
  TWO_LETTERS,
  TWO_LETTERS_PENALTY,
  countFor,
  hasLetters,
  seeded,
  type GameData,
} from "@futgrid/game-core";
import type { Room } from "../store.js";
import {
  asObject,
  event,
  oneOf,
  otherSeat,
  pickRandom,
  playerName,
  seats,
  voteReady,
  type Ctx,
  type GameModule,
} from "./common.js";

// İki hərf — "Eyni ekran" qaydaları ilə: raundu başlayan birinci hərfi, rəqib ikincini seçir.
// Sonra növbə ilə adında hər iki hərf olan futbolçu yazılır; vaxtında yaza bilməyən raundu uduzur.
const PICK_MS = 30_000;
const NEXT_MS = 12_000;

const MIN_ANSWERS: Record<string, number> = { easy: 20, normal: 8, hard: 3 };

export interface TwoLettersSettings {
  difficulty: "easy" | "normal" | "hard";
  seconds: 10 | 15 | 20;
  target: 3 | 5 | 7;
}

function normalize(raw: unknown): TwoLettersSettings {
  const s = asObject(raw);
  return {
    difficulty: oneOf(s.difficulty, ["easy", "normal", "hard"] as const, "normal"),
    seconds: oneOf(Number(s.seconds), [10, 15, 20] as const, 15),
    target: oneOf(Number(s.target), [3, 5, 7] as const, 5),
  };
}

const settingsOf = (room: Room) => normalize(room.settings);

/** Frontend-dəki letterOptions ilə eyni: az futbolçusu olan hərfləri seçmək olmur. */
const optionCache = new Map<string, Record<string, boolean>>();
export function letterOptions(
  data: GameData,
  first: string | null,
  difficulty: string,
): Record<string, boolean> {
  const key = `${difficulty}|${first ?? ""}`;
  const cached = optionCache.get(key);
  if (cached) return cached;
  const min = MIN_ANSWERS[difficulty] ?? MIN_ANSWERS.normal!;
  const out: Record<string, boolean> = {};
  for (const letter of TWO_LETTERS) {
    out[letter] = first
      ? letter !== first && countFor(data, first, letter, difficulty) >= min
      : TWO_LETTERS.some(
          (other) => other !== letter && countFor(data, letter, other, difficulty) >= min,
        );
  }
  optionCache.set(key, out);
  return out;
}

const pickers = (room: Room) =>
  [room.state.starter, otherSeat(room, room.state.starter)] as string[];
const pickerOf = (room: Room) => pickers(room)[(room.state.letters as string[]).length] ?? null;

function startRound(room: Room, ctx: Ctx) {
  const state = room.state;
  state.round = (state.round ?? 0) + 1;
  // Tək raundları birinci oyunçu, cütləri ikinci başlayır (eyni ekrandakı kimi).
  state.starter = state.round % 2 === 1 ? room.players[0]?.seat : room.players[1]?.seat;
  state.letters = [];
  state.used = [];
  state.turn = null;
  state.phase = "pick";
  state.result = null;
  state.ready = [];
  state.penalties = 0;
  state.deadline = ctx.now + PICK_MS;
}

function addLetter(room: Room, ctx: Ctx, letter: string) {
  const state = room.state;
  state.letters.push(letter);
  if (state.letters.length === 2) {
    state.phase = "play";
    state.turn = state.starter;
    state.deadline = ctx.now + settingsOf(room).seconds * 1000;
  } else {
    state.deadline = ctx.now + PICK_MS;
  }
}

function endRound(room: Room, ctx: Ctx, winner: string, reason: "time" | "pass") {
  const state = room.state;
  state.scores[winner] += 1;
  state.phase = "round";
  state.result = { winner, loser: otherSeat(room, winner), reason };
  state.ready = [];
  state.turn = null;
  if (state.scores[winner] >= settingsOf(room).target) {
    state.deadline = null;
    ctx.finish(winner, "win");
    return;
  }
  state.deadline = ctx.now + NEXT_MS;
}

export const twoLetters: GameModule = {
  settings: normalize,

  start(room, ctx) {
    room.state = {
      round: 0,
      scores: Object.fromEntries(seats(room).map((seat) => [seat, 0])),
      lastEvent: null,
    };
    startRound(room, ctx);
  },

  move(room, seat, payload, ctx) {
    const state = room.state;
    const settings = settingsOf(room);

    if (payload.action === "letter") {
      if (state.phase !== "pick") return "ROUND_OVER";
      if (pickerOf(room) !== seat) return "NOT_YOUR_TURN";
      const letter = String(payload.letter ?? "").toUpperCase();
      const options = letterOptions(ctx.data, state.letters[0] ?? null, settings.difficulty);
      if (!options[letter]) return "INVALID_LETTER";
      state.lastEvent = event(ctx, "letter", seat, { letter });
      addLetter(room, ctx, letter);
      return null;
    }

    if (payload.action === "next") {
      if (state.phase !== "round") return "ROUND_OVER";
      if (voteReady(room, seat)) startRound(room, ctx);
      return null;
    }

    if (state.phase !== "play") return "ROUND_OVER";
    if (state.turn !== seat) return "NOT_YOUR_TURN";

    if (payload.action === "giveup") {
      state.lastEvent = event(ctx, "giveup", seat);
      endRound(room, ctx, otherSeat(room, seat), "pass");
      return null;
    }

    const playerId = Number(payload.playerId);
    const player = ctx.data.playersById.get(playerId);
    if (!player) return "INVALID_PLAYER";
    if ((state.used as { playerId: number }[]).some((entry) => entry.playerId === playerId))
      return "PLAYER_USED";
    const [a, b] = state.letters as string[];
    if (!hasLetters(ctx.data, player, a!, b!)) {
      // Səhv cavab: növbədən 3 saniyə gedir.
      state.penalties = (state.penalties ?? 0) + 1;
      state.deadline = Math.max(ctx.now, state.deadline - TWO_LETTERS_PENALTY * 1000);
      state.lastEvent = event(ctx, "wrong", seat, {
        playerId,
        name: playerName(ctx.data, playerId),
      });
      return null;
    }
    state.used.push({ playerId, seat });
    state.lastEvent = event(ctx, "correct", seat, { playerId, name: player.name });
    state.turn = otherSeat(room, seat);
    state.deadline = ctx.now + settings.seconds * 1000;
    return null;
  },

  tick(room, ctx) {
    const state = room.state;
    if (state.phase === "pick") {
      // Vaxtında seçilməyən hərfi təsadüfi veririk.
      const options = letterOptions(
        ctx.data,
        state.letters[0] ?? null,
        settingsOf(room).difficulty,
      );
      const random = seeded((room.seed + state.round * 977 + state.letters.length) >>> 0);
      const letter =
        pickRandom(
          TWO_LETTERS.filter((l) => options[l]),
          random,
        ) ?? "A";
      state.lastEvent = event(ctx, "autoletter", pickerOf(room), { letter });
      addLetter(room, ctx, letter);
      return;
    }
    if (state.phase === "play") {
      const loser = state.turn as string;
      state.lastEvent = event(ctx, "timeout", loser);
      endRound(room, ctx, otherSeat(room, loser), "time");
      return;
    }
    if (state.phase === "round") startRound(room, ctx);
  },

  view(room) {
    const {
      round,
      starter,
      letters,
      used,
      turn,
      phase,
      result,
      ready,
      scores,
      penalties,
      deadline,
      lastEvent,
    } = room.state;
    const settings = settingsOf(room);
    return {
      round,
      starter,
      letters,
      used,
      turn,
      phase,
      result,
      ready,
      scores,
      penalties,
      deadline,
      lastEvent,
      picker: phase === "pick" ? pickerOf(room) : null,
      seconds: settings.seconds,
      target: settings.target,
      pickMs: PICK_MS,
      nextMs: NEXT_MS,
    };
  },
};
