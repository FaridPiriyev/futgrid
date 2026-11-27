import {
  commonPlayers,
  entityIndex,
  isCommon,
  seeded,
  type Entity,
  type GameData,
} from "@futgrid/game-core";
import type { Room } from "../store.js";
import {
  asObject,
  dataFor,
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

export const PICK_MS = 45_000;
export const ANSWER_MS = 75_000;
const NEXT_MS = 12_000;
/** Every Nth wrong answer in a round costs one point (1st is a warning, 2nd is −1, …). */
export const WRONGS_PER_PENALTY = 2;

export interface OrtaSettings {
  era: "active" | "all";
  target: 1 | 3 | 5 | 10;
}

function normalize(raw: unknown): OrtaSettings {
  const s = asObject(raw);
  return {
    era: oneOf(s.era, ["active", "all"] as const, "active"),
    target: oneOf(Number(s.target), [1, 3, 5, 10] as const, 5),
  };
}

const settingsOf = (room: Room) => normalize(room.settings);
const dataOf = (room: Room, ctx: Ctx) => dataFor(ctx.data, settingsOf(room).era);
const entityOf = (data: GameData, key: unknown): Entity | null =>
  typeof key === "string" ? (entityIndex(data).byKey.get(key) ?? null) : null;

const allowedFor = (room: Room, seat: string) =>
  room.state.starter === seat ? ["club"] : ["club", "country"];

function startRound(room: Room, ctx: Ctx, starter: string) {
  const state = room.state;
  state.round = (state.round ?? 0) + 1;
  state.starter = starter;
  state.picks = {};
  state.phase = "pick";
  state.result = null;
  state.giveup = [];
  state.ready = [];
  state.answers = 0;
  state.wrongs = Object.fromEntries(seats(room).map((seat) => [seat, 0]));
  state.deadline = ctx.now + PICK_MS;
}

function autoPick(room: Room, ctx: Ctx, seat: string) {
  const data = dataOf(room, ctx);
  const random = seeded((room.seed + room.state.round * 31 + seat.length) >>> 0);
  const clubs = entityIndex(data).clubs.filter((club) => club.ids.size >= 120);
  const taken = Object.values(room.state.picks as Record<string, string>);
  const free = clubs.filter((club) => !taken.includes(club.key));
  const pick = pickRandom(free.length ? free : clubs, random);
  if (pick) room.state.picks[seat] = pick.key;
}

function reveal(room: Room, ctx: Ctx) {
  const state = room.state;
  const data = dataOf(room, ctx);
  const [a, b] = seats(room).map((seat) => entityOf(data, state.picks[seat]));
  if (!a || !b || a.key === b.key) {
    state.lastEvent = event(ctx, "same", null);
    state.picks = {};
    state.deadline = ctx.now + PICK_MS;
    return;
  }
  const answers = commonPlayers(data, a, b).length;
  state.answers = answers;
  if (!answers) {
    finishRound(room, ctx, { none: true });
    return;
  }
  state.phase = "answer";
  state.deadline = ctx.now + ANSWER_MS;
  state.lastEvent = event(ctx, "reveal", null);
}

function finishRound(room: Room, ctx: Ctx, result: Record<string, unknown>) {
  const state = room.state;
  state.phase = "done";
  state.result = result;
  state.ready = [];
  const seat = result.seat as string | undefined;
  if (seat && state.scores[seat] >= settingsOf(room).target) {
    state.deadline = null;
    ctx.finish(seat, "win");
    return;
  }
  state.deadline = ctx.now + NEXT_MS;
}

export const orta: GameModule = {
  settings: normalize,

  start(room, ctx) {
    room.state = {
      round: 0,
      scores: Object.fromEntries(seats(room).map((seat) => [seat, 0])),
      lastEvent: null,
    };
    startRound(room, ctx, room.players[0]?.seat ?? "");
  },

  move(room, seat, payload, ctx) {
    const state = room.state;
    const data = dataOf(room, ctx);

    if (payload.action === "pick") {
      if (state.phase !== "pick") return "ROUND_OVER";
      if (state.picks[seat]) return "ALREADY_PICKED";
      const entity = entityOf(data, payload.key);
      if (!entity) return "INVALID_PICK";
      if (!allowedFor(room, seat).includes(entity.type)) return "CLUB_ONLY";
      state.picks[seat] = entity.key;
      state.lastEvent = event(ctx, "picked", seat);
      if (seats(room).every((entry) => state.picks[entry])) reveal(room, ctx);
      return null;
    }

    if (payload.action === "answer") {
      if (state.phase !== "answer") return "ROUND_OVER";
      const playerId = Number(payload.playerId);
      const player = data.playersById.get(playerId);
      if (!player) return "INVALID_PLAYER";
      const [a, b] = seats(room).map((entry) => entityOf(data, state.picks[entry]));
      if (a && b && isCommon(a, b, player)) {
        state.scores[seat] += 1;
        state.lastEvent = event(ctx, "correct", seat, { playerId, name: player.name });
        finishRound(room, ctx, { seat, playerId });
      } else {
        state.wrongs ??= {};
        state.wrongs[seat] = (state.wrongs[seat] ?? 0) + 1;
        const penalty = state.wrongs[seat] % WRONGS_PER_PENALTY === 0;
        if (penalty) state.scores[seat] -= 1;
        state.lastEvent = event(ctx, "wrong", seat, {
          playerId,
          name: playerName(data, playerId),
          penalty,
          wrongs: state.wrongs[seat],
        });
      }
      return null;
    }

    if (payload.action === "giveup") {
      if (state.phase !== "answer") return "ROUND_OVER";
      const votes = new Set<string>(state.giveup ?? []);
      votes.add(seat);
      state.giveup = [...votes];
      state.lastEvent = event(ctx, "giveup", seat);
      if (seats(room).every((entry) => votes.has(entry)))
        finishRound(room, ctx, { none: false, gaveUp: true });
      return null;
    }

    if (payload.action === "next") {
      if (state.phase !== "done") return "ROUND_OVER";
      if (voteReady(room, seat)) startRound(room, ctx, otherSeat(room, state.starter));
      return null;
    }
    return "INVALID_MOVE";
  },

  tick(room, ctx) {
    const state = room.state;
    if (state.phase === "pick") {
      for (const seat of seats(room)) if (!state.picks[seat]) autoPick(room, ctx, seat);
      state.lastEvent = event(ctx, "autopick", null);
      reveal(room, ctx);
      return;
    }
    if (state.phase === "answer") {
      finishRound(room, ctx, { none: false, timeout: true });
      return;
    }
    if (state.phase === "done") startRound(room, ctx, otherSeat(room, state.starter));
  },

  view(room) {
    const {
      round,
      starter,
      phase,
      picks,
      scores,
      result,
      giveup,
      ready,
      answers,
      wrongs,
      deadline,
      lastEvent,
    } = room.state;
    const revealed = phase === "answer" || phase === "done";
    return {
      round,
      starter,
      phase,
      picked: Object.fromEntries(Object.keys(picks ?? {}).map((seat) => [seat, true])),
      picks: revealed ? picks : null,
      scores,
      result,
      giveup,
      ready,
      answers,
      wrongs: wrongs ?? {},
      wrongsPerPenalty: WRONGS_PER_PENALTY,
      deadline,
      lastEvent,
      target: settingsOf(room).target,
      pickMs: PICK_MS,
      answerMs: ANSWER_MS,
      nextMs: NEXT_MS,
    };
  },
};
