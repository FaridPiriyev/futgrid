import { playerFame, seeded, type GameData, type RawPlayer } from "@futgrid/game-core";
import type { Room } from "../store.js";
import {
  asObject,
  dataFor,
  event,
  oneOf,
  playerName,
  seats,
  voteReady,
  type Ctx,
  type GameModule,
} from "./common.js";

export const ANSWER_MS = 10_000;
const LAST_CALL_MS = 8_000;
const LOCK_TILES = 4;
const START_MS = 1_500;
const FIRST_TILE_MS = 400;
const NEXT_MS = 10_000;

const GRIDS: Record<number, { cols: number; rows: number }> = {
  16: { cols: 4, rows: 4 },
  24: { cols: 4, rows: 6 },
};
const POOLS: Record<string, number> = { easy: 100, normal: 400, hard: 1200 };

export interface SekilSettings {
  grid: 16 | 24;
  difficulty: "easy" | "normal" | "hard";
  era: "active" | "all";
  speed: 2 | 3 | 4;
  target: 3 | 5;
}

function normalize(raw: unknown): SekilSettings {
  const s = asObject(raw);
  return {
    grid: oneOf(Number(s.grid), [16, 24] as const, 16),
    difficulty: oneOf(s.difficulty, ["easy", "normal", "hard"] as const, "normal"),
    era: oneOf(s.era, ["active", "all"] as const, "all"),
    speed: oneOf(Number(s.speed), [2, 3, 4] as const, 3),
    target: oneOf(Number(s.target), [3, 5] as const, 3),
  };
}

const settingsOf = (room: Room) => normalize(room.settings);

const poolCache = new WeakMap<GameData, Map<string, RawPlayer[]>>();
function photoPool(data: GameData, settings: SekilSettings): RawPlayer[] {
  const set = dataFor(data, settings.era);
  let byKey = poolCache.get(set);
  if (!byKey) poolCache.set(set, (byKey = new Map()));
  const cached = byKey.get(settings.difficulty);
  if (cached) return cached;
  const list = set.players
    .filter((p) => typeof p.photo_url === "string" && p.photo_url)
    .sort((a, b) => playerFame(b) - playerFame(a))
    .slice(0, POOLS[settings.difficulty] ?? POOLS.normal);
  byKey.set(settings.difficulty, list);
  return list;
}

export function revealOrder(size: number, random: () => number): number[] {
  const { cols, rows } = GRIDS[size] ?? GRIDS[16]!;
  const face = { x: 0.5, y: 0.42 };
  const tiles: { i: number; d: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) / cols;
      const y = (r + 0.5) / rows;
      tiles.push({
        i: r * cols + c,
        d: Math.hypot(x - face.x, (y - face.y) * 1.2) + random() * 0.04,
      });
    }
  tiles.sort((a, b) => a.d - b.d);
  const shuffle = <T>(list: T[]) => {
    const out = [...list];
    for (let k = out.length - 1; k > 0; k--) {
      const j = Math.floor(random() * (k + 1));
      [out[k], out[j]] = [out[j] as T, out[k] as T];
    }
    return out;
  };
  const keep = size >= 24 ? 4 : 3;
  const face3 = tiles.slice(0, keep);
  const rest = tiles.slice(keep);
  const half = Math.ceil(rest.length / 2);
  const middle = shuffle(rest.slice(0, half));
  const edge = shuffle(rest.slice(half));
  const order: number[] = [];
  let fromEdge = random() < 0.65;
  while (edge.length || middle.length) {
    const src = (fromEdge && edge.length) || !middle.length ? edge : middle;
    order.push((src.shift() as { i: number }).i);
    fromEdge = !fromEdge;
  }
  const tail = shuffle(face3.slice(1)).map((t) => t.i);
  return [...order, ...tail, (face3[0] as { i: number }).i];
}

function schedule(room: Room) {
  const state = room.state;
  if (state.answering) state.deadline = state.answerDeadline;
  else if (state.opened < state.size) state.deadline = state.nextTileAt;
  else state.deadline = state.lastCallEnd;
}

function startRound(room: Room, ctx: Ctx) {
  const state = room.state;
  const settings = settingsOf(room);
  state.round = (state.round ?? 0) + 1;
  const random = seeded((room.seed + state.round * 104_729) >>> 0);
  const list = photoPool(ctx.data, settings);
  const used = new Set<number>(state.usedSecrets ?? []);
  const fresh = list.filter((p) => !used.has(p.id));
  const options = fresh.length ? fresh : list;
  const secret = options[Math.floor(random() * options.length)];
  state.playerId = secret?.id ?? 0;
  state.photoUrl = String(secret?.photo_url ?? "");
  state.usedSecrets = [...used, state.playerId];
  state.size = settings.grid;
  state.order = revealOrder(settings.grid, random);
  state.opened = 0;
  state.lockUntil = Object.fromEntries(seats(room).map((seat) => [seat, 0]));
  state.answering = null;
  state.answerDeadline = null;
  state.paused = null;
  state.startAt = ctx.now + START_MS;
  state.nextTileAt = state.startAt + FIRST_TILE_MS;
  state.lastCallEnd = null;
  state.phase = "play";
  state.result = null;
  state.ready = [];
  schedule(room);
}

function endRound(room: Room, ctx: Ctx, winner: string | null) {
  const state = room.state;
  if (winner) state.scores[winner] += 1;
  state.phase = "round";
  state.answering = null;
  state.result = {
    winner,
    playerId: state.playerId,
    name: playerName(ctx.data, state.playerId),
    opened: state.opened,
  };
  state.ready = [];
  if (winner && state.scores[winner] >= settingsOf(room).target) {
    state.deadline = null;
    ctx.finish(winner, "win");
    return;
  }
  state.deadline = ctx.now + NEXT_MS;
}

function resume(room: Room, ctx: Ctx) {
  const state = room.state;
  const left = Math.max(0, state.paused ?? 0);
  if (state.opened < state.size) state.nextTileAt = ctx.now + left;
  else state.lastCallEnd = ctx.now + left;
  state.paused = null;
}

function wrong(room: Room, ctx: Ctx, seat: string, extra: Record<string, unknown>) {
  const state = room.state;
  state.lockUntil[seat] = state.opened + LOCK_TILES;
  state.answering = null;
  state.answerDeadline = null;
  state.lastEvent = event(ctx, "wrong", seat, { ...extra, until: state.lockUntil[seat] });
  if (seats(room).every((entry) => state.lockUntil[entry] > state.size)) {
    endRound(room, ctx, null);
    return;
  }
  resume(room, ctx);
  schedule(room);
}

export const sekil: GameModule = {
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
    if (payload.action === "next") {
      if (state.phase !== "round") return "ROUND_OVER";
      if (voteReady(room, seat)) startRound(room, ctx);
      return null;
    }
    if (state.phase !== "play") return "ROUND_OVER";

    if (payload.action === "buzz") {
      if (ctx.now < state.startAt) return "NOT_STARTED";
      if (state.answering) return state.answering === seat ? null : "NOT_YOUR_TURN";
      if (state.opened < state.lockUntil[seat]) return "LOCKED";
      state.answering = seat;
      state.answerDeadline = ctx.now + ANSWER_MS;
      state.paused =
        state.opened < state.size ? state.nextTileAt - ctx.now : state.lastCallEnd - ctx.now;
      state.lastEvent = event(ctx, "buzz", seat);
      schedule(room);
      return null;
    }

    if (payload.action === "answer") {
      if (state.answering !== seat) return "NOT_YOUR_TURN";
      const playerId = Number(payload.playerId);
      if (!ctx.data.playersById.has(playerId)) return "INVALID_PLAYER";
      if (playerId === state.playerId) {
        state.lastEvent = event(ctx, "found", seat, {
          playerId,
          name: playerName(ctx.data, playerId),
        });
        endRound(room, ctx, seat);
        return null;
      }
      wrong(room, ctx, seat, { playerId, name: playerName(ctx.data, playerId) });
      return null;
    }
    return "INVALID_MOVE";
  },

  tick(room, ctx) {
    const state = room.state;
    if (state.phase === "round") {
      startRound(room, ctx);
      return;
    }
    if (state.phase !== "play") return;
    if (state.answering) {
      wrong(room, ctx, state.answering, { timeout: true });
      return;
    }
    if (state.opened < state.size) {
      state.opened += 1;
      if (state.opened >= state.size) state.lastCallEnd = ctx.now + LAST_CALL_MS;
      else state.nextTileAt = ctx.now + settingsOf(room).speed * 1000;
      schedule(room);
      return;
    }
    endRound(room, ctx, null);
  },

  view(room) {
    const {
      round,
      scores,
      phase,
      photoUrl,
      size,
      order,
      opened,
      lockUntil,
      answering,
      answerDeadline,
      startAt,
      lastCallEnd,
      paused,
      result,
      ready,
      deadline,
      lastEvent,
    } = room.state;
    const settings = settingsOf(room);
    // Never expose the real file path (it contains the player's name).
    return {
      round,
      scores,
      phase,
      photoUrl: photoUrl ? `/duel/photo/${room.code}/${round}` : "",
      size,
      order,
      opened,
      lockUntil,
      answering,
      answerDeadline,
      startAt,
      lastCallEnd,
      paused,
      result,
      ready,
      deadline,
      lastEvent,
      lockTiles: LOCK_TILES,
      speed: settings.speed,
      target: settings.target,
      answerMs: ANSWER_MS,
      lastCallMs: LAST_CALL_MS,
      nextMs: NEXT_MS,
    };
  },
};
