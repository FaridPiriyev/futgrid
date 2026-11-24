import { playerFame, seeded, type GameData, type RawPlayer } from "@futgrid/game-core";
import type { Room } from "../store.js";
import { askQuestion } from "../questions.js";
import {
  asObject,
  dataFor,
  event,
  oneOf,
  otherSeat,
  pickRandom,
  playerName,
  seats,
  type Ctx,
  type GameModule,
} from "./common.js";

export const SECRET_MS = 60_000;
export const TURN_MS = 60_000;

const POOLS: Record<string, number> = { easy: 120, normal: 450, hard: 1400 };

export interface SualSettings {
  difficulty: "easy" | "normal" | "hard";
  era: "active" | "all";
  maxQuestions: 10 | 15 | 20;
}

function normalize(raw: unknown): SualSettings {
  const s = asObject(raw);
  return {
    difficulty: oneOf(s.difficulty, ["easy", "normal", "hard"] as const, "normal"),
    era: oneOf(s.era, ["active", "all"] as const, "all"),
    maxQuestions: oneOf(Number(s.maxQuestions), [10, 15, 20] as const, 20),
  };
}

const settingsOf = (room: Room) => normalize(room.settings);

const poolCache = new WeakMap<GameData, Map<string, RawPlayer[]>>();
function secretPool(data: GameData, settings: SualSettings): RawPlayer[] {
  const set = dataFor(data, settings.era);
  let byKey = poolCache.get(set);
  if (!byKey) poolCache.set(set, (byKey = new Map()));
  const cached = byKey.get(settings.difficulty);
  if (cached) return cached;
  const list = set.players
    .filter(
      (p) => p.nationality_code && p.position && (p.club_history ?? []).length && p.birth_date,
    )
    .sort((a, b) => playerFame(b) - playerFame(a))
    .slice(0, POOLS[settings.difficulty] ?? POOLS.normal);
  byKey.set(settings.difficulty, list);
  return list;
}

interface Item {
  id: string;
  kind: "q" | "guess" | "timeout";
  answer: boolean | null;
  playerId?: number;
  at: number;
}

const usedOf = (items: Item[]) => items.filter((item) => item.answer !== null).length;
const sideA = (room: Room) => room.players[0]?.seat ?? "";
const sideB = (room: Room) => room.players[1]?.seat ?? "";

function randomSecret(room: Room, ctx: Ctx, seat: string): number {
  const list = secretPool(ctx.data, settingsOf(room));
  const random = seeded((room.seed + seat.charCodeAt(0) * 131 + ctx.now) >>> 0);
  const other = room.state.secrets?.[otherSeat(room, seat)];
  const free = list.filter((p) => p.id !== other);
  return pickRandom(free, random)?.id ?? list[0]?.id ?? 0;
}

function startPlay(room: Room, ctx: Ctx) {
  const state = room.state;
  state.phase = "play";
  state.turn = sideA(room);
  state.deadline = ctx.now + TURN_MS;
  state.lastEvent = event(ctx, "start", null);
}

function finish(room: Room, ctx: Ctx, winner: string | null) {
  const state = room.state;
  state.phase = "done";
  state.turn = null;
  state.result = { winner };
  ctx.finish(winner, winner ? "win" : "draw");
}

function after(room: Room, ctx: Ctx, side: string) {
  const state = room.state;
  const max = settingsOf(room).maxQuestions;
  const A = sideA(room);
  const B = sideB(room);
  const canA = usedOf(state.items[A]) < max;
  const canB = usedOf(state.items[B]) < max;
  const foundA = state.found[A] != null;
  const foundB = state.found[B] != null;
  let next: string | null = null;
  if (side === A) {
    if (foundA) {
      if (canB) {
        state.lastChance = true;
        next = B;
      } else return finish(room, ctx, A);
    } else if (canB) next = B;
    else if (canA) next = A;
    else return finish(room, ctx, null);
  } else {
    if (foundA && foundB) return finish(room, ctx, null);
    if (foundA) return finish(room, ctx, A);
    if (foundB) return finish(room, ctx, B);
    if (canA) next = A;
    else if (canB) next = B;
    else return finish(room, ctx, null);
  }
  state.turn = next;
  state.deadline = ctx.now + TURN_MS;
}

function record(room: Room, ctx: Ctx, seat: string, item: Item, found = false) {
  const state = room.state;
  state.items[seat].push(item);
  if (found) state.found[seat] = usedOf(state.items[seat]);
  if (item.answer === null) {
    state.deadline = ctx.now + TURN_MS;
    return;
  }
  after(room, ctx, seat);
}

export const sual: GameModule = {
  settings: normalize,

  start(room, ctx) {
    room.state = {
      phase: "secret",
      secrets: {},
      items: Object.fromEntries(seats(room).map((seat) => [seat, []])),
      found: Object.fromEntries(seats(room).map((seat) => [seat, null])),
      turn: null,
      lastChance: false,
      result: null,
      deadline: ctx.now + SECRET_MS,
      lastEvent: null,
    };
  },

  move(room, seat, payload, ctx) {
    const state = room.state;

    if (payload.action === "secret") {
      if (state.phase !== "secret") return "ROUND_OVER";
      if (state.secrets[seat]) return "ALREADY_PICKED";
      let playerId = Number(payload.playerId);
      if (payload.random === true) playerId = randomSecret(room, ctx, seat);
      if (!ctx.data.playersById.has(playerId)) return "INVALID_PLAYER";
      state.secrets[seat] = playerId;
      state.lastEvent = event(ctx, "secret", seat);
      if (seats(room).every((entry) => state.secrets[entry])) startPlay(room, ctx);
      return null;
    }

    if (state.phase !== "play") return "ROUND_OVER";
    if (state.turn !== seat) return "NOT_YOUR_TURN";
    const secretId = state.secrets[otherSeat(room, seat)] as number;
    const secret = ctx.data.playersById.get(secretId);
    if (!secret) return "INTERNAL";

    if (payload.action === "ask") {
      const id = String(payload.questionId ?? "");
      if ((state.items[seat] as Item[]).some((item) => item.id === id)) return "ALREADY_ASKED";
      const asked = askQuestion(ctx.data, secret, id);
      if (!asked) return "INVALID_QUESTION";
      state.lastEvent = event(ctx, "ask", seat, { questionId: id, answer: asked.answer });
      record(room, ctx, seat, { id, kind: "q", answer: asked.answer, at: ctx.now });
      return null;
    }

    if (payload.action === "guess") {
      const playerId = Number(payload.playerId);
      if (!ctx.data.playersById.has(playerId)) return "INVALID_PLAYER";
      const ok = playerId === secretId;
      state.lastEvent = event(ctx, ok ? "found" : "wrong", seat, {
        playerId,
        name: playerName(ctx.data, playerId),
      });
      record(
        room,
        ctx,
        seat,
        { id: `g-${playerId}-${ctx.now}`, kind: "guess", playerId, answer: ok, at: ctx.now },
        ok,
      );
      return null;
    }
    return "INVALID_MOVE";
  },

  tick(room, ctx) {
    const state = room.state;
    if (state.phase === "secret") {
      for (const seat of seats(room))
        if (!state.secrets[seat]) state.secrets[seat] = randomSecret(room, ctx, seat);
      state.lastEvent = event(ctx, "autosecret", null);
      startPlay(room, ctx);
      return;
    }
    if (state.phase !== "play") return;
    const seat = state.turn as string;
    state.lastEvent = event(ctx, "timeout", seat);
    record(room, ctx, seat, { id: `t-${ctx.now}`, kind: "timeout", answer: false, at: ctx.now });
  },

  view(room) {
    const { phase, secrets, items, found, turn, lastChance, result, deadline, lastEvent } =
      room.state;
    return {
      phase,
      chosen: Object.fromEntries(Object.keys(secrets ?? {}).map((seat) => [seat, true])),
      secrets: phase === "done" || room.status === "finished" ? secrets : null,
      items,
      found,
      turn,
      lastChance,
      result,
      deadline,
      lastEvent,
      starter: sideA(room),
      max: settingsOf(room).maxQuestions,
      turnMs: TURN_MS,
      secretMs: SECRET_MS,
    };
  },
};
