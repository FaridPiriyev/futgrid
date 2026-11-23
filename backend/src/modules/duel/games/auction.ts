import {
  buildAuctionPool,
  playerRating,
  seeded,
  type GameData,
  type RawPlayer,
} from "@futgrid/game-core";
import type { Room } from "../store.js";
import { pickClue } from "../auctionClues.js";
import { asObject, event, oneOf, otherSeat, seats, type Ctx, type GameModule } from "./common.js";

// Açıq artırma — frontend-dəki futgrid_app/src/lib/games/auction.js qaydaları ilə eyni:
// pul "yarım manat" ilə saxlanılır (2 = 1 ₼), büdcə 20 ₼, heyət 5 oyunçu (formasiyanı otağı quran seçir).
// Hər lotu növbə ilə bir oyunçu ən azı 1 ₼-a açır; rəqib ya artırır, ya keçir — keçsə oyunçu təklif verənə gedir.
export const BUDGET = 40;
export const MIN_BID = 2;
const SOLD_MS = 2_500;
const MAX_LOTS = 30;
const TEAM_SIZE = 5;
const POS_ORDER = ["GK", "DF", "MF", "FW"];
const ANY = "ANY";
const DEFAULT_FORMATION = { GK: 1, DF: 1, MF: 1, FW: 2 };
const FREE_W: Record<string, number> = { GK: 1, DF: 3, MF: 3, FW: 3 };

export interface AuctionSettings {
  pool: "stars" | "wide";
  timer: 10 | 15 | 20;
  formation: Record<string, number>;
  mystery: boolean;
}

function normalizeFormation(raw: unknown): Record<string, number> {
  const f = asObject(raw);
  if (Number(f.ANY) === TEAM_SIZE) return { ANY: TEAM_SIZE };
  const out: Record<string, number> = {};
  let total = 0;
  for (const pos of POS_ORDER) {
    const n = Math.max(0, Math.min(TEAM_SIZE, Math.floor(Number(f[pos]) || 0)));
    out[pos] = n;
    total += n;
  }
  return total === TEAM_SIZE ? out : { ...DEFAULT_FORMATION };
}

function normalize(raw: unknown): AuctionSettings {
  const s = asObject(raw);
  return {
    pool: oneOf(s.pool, ["stars", "wide"] as const, "stars"),
    timer: oneOf(Number(s.timer), [10, 15, 20] as const, 15),
    formation: normalizeFormation(s.formation),
    mystery: s.mystery === true,
  };
}

const settingsOf = (room: Room) => normalize(room.settings);
const actionMs = (room: Room) => settingsOf(room).timer * 1000;
const formationSlots = (f: Record<string, number>) =>
  Number(f.ANY) === TEAM_SIZE
    ? Array(TEAM_SIZE).fill(ANY)
    : POS_ORDER.flatMap((pos) => Array(f[pos] ?? 0).fill(pos));

interface Pick {
  playerId: number;
  rating: number;
  price: number;
  auto?: boolean;
}
interface Slot {
  pos: string;
  pick: Pick | null;
}
interface Team {
  money: number;
  slots: Slot[];
}
interface Lot {
  playerId: number;
  pos: string;
  rating: number;
  price: number;
  leader: string | null;
  opener: string;
  passed: Record<string, boolean>;
  history: { seat: string; amount: number; auto?: boolean }[];
  clue?: { key: string; count: number; best: number } | null;
  expected?: number | null;
}

const pools = new WeakMap<GameData, Record<string, Record<string, RawPlayer[]>>>();
function poolOf(data: GameData, key: string): Record<string, RawPlayer[]> {
  let byKey = pools.get(data);
  if (!byKey) pools.set(data, (byKey = {}));
  return (byKey[key] ??= buildAuctionPool(data, key));
}

const fits = (slot: Slot, pos: string) => slot.pos === pos || slot.pos === ANY;
const openCount = (team: Team, pos?: string) =>
  team.slots.filter((slot) => !slot.pick && (!pos || fits(slot, pos))).length;
const maxBid = (team: Team) => (openCount(team) ? team.money : -1);
const nextPrice = (lot: Lot) => (lot.leader ? lot.price + 1 : MIN_BID);

function canBid(state: Record<string, any>, seat: string): boolean {
  const lot = state.lot as Lot | null;
  if (state.phase !== "bid" || !lot) return false;
  if (lot.passed[seat] || lot.leader === seat) return false;
  if (!lot.leader && seat !== lot.opener) return false;
  const team = state.teams[seat] as Team;
  return openCount(team, lot.pos) > 0 && maxBid(team) >= nextPrice(lot);
}

function random(room: Room, salt = 0) {
  // Hər lot üçün ayrıca, otağın seed-indən asılı təsadüfi ədəd.
  return seeded((room.seed + (room.state.lotNo ?? 0) * 7_368_787 + salt) >>> 0);
}

function pickLot(room: Room, data: GameData) {
  const state = room.state;
  const settings = settingsOf(room);
  const pool = poolOf(data, settings.pool);
  const teams = state.teams as Record<string, Team>;
  const used = new Set<number>(state.used);
  const rnd = random(room);
  // Hər iki komandada boş yeri olan mövqelər üstündür — onda lot həqiqi hərraca çıxır.
  const weightsFor = (list: string[]) => {
    const weights: Record<string, number> = {};
    for (const pos of POS_ORDER) {
      if (!list.every((seat) => openCount(teams[seat] as Team, pos) > 0)) continue;
      let w = 0;
      for (const seat of list)
        for (const slot of (teams[seat] as Team).slots) {
          if (slot.pick) continue;
          if (slot.pos === ANY) w += (FREE_W[pos] ?? 1) / 10;
          else if (slot.pos === pos) w += 1;
        }
      if (w > 0) weights[pos] = w;
    }
    return weights;
  };
  let weights = weightsFor(seats(room));
  if (!Object.keys(weights).length)
    weights = Object.assign({}, ...seats(room).map((seat) => weightsFor([seat])));
  const options = Object.entries(weights).filter(([pos]) =>
    (pool[pos] ?? []).some((p) => !used.has(p.id)),
  );
  if (!options.length) return null;
  const total = options.reduce((sum, [, w]) => sum + w, 0);
  let r = rnd() * total;
  let pos = options[0]![0];
  for (const [candidate, w] of options) {
    r -= w;
    if (r < 0) {
      pos = candidate;
      break;
    }
  }
  if (settings.mystery) {
    const hit = pickClue(data, pos, used, rnd);
    if (hit) return { player: hit.player, pos, clue: hit.clue, expected: hit.expected };
  }
  const free = (pool[pos] ?? []).filter((p) => !used.has(p.id));
  const player = free[Math.floor(rnd() * free.length)];
  return player ? { player, pos, clue: null, expected: null } : null;
}

function placeIn(team: Team, pos: string, pick: Pick) {
  const slot = team.slots.find((entry) => !entry.pick && fits(entry, pos));
  if (slot) slot.pick = pick;
}

function assign(
  room: Room,
  ctx: Ctx,
  winner: string,
  price: number,
  extra: { auto?: boolean } = {},
) {
  const state = room.state;
  const lot = state.lot as Lot;
  const team = state.teams[winner] as Team;
  placeIn(team, lot.pos, { playerId: lot.playerId, rating: lot.rating, price, ...extra });
  team.money -= price;
  state.phase = "sold";
  state.outcome = { seat: winner, price, playerId: lot.playerId, ...extra };
  state.log.push({ playerId: lot.playerId, seat: winner, price, ...extra });
  state.lastEvent = event(ctx, "sold", winner, { playerId: lot.playerId, price, ...extra });
  state.deadline = ctx.now + SOLD_MS;
}

function autofill(room: Room, ctx: Ctx) {
  const state = room.state;
  const pool = poolOf(ctx.data, settingsOf(room).pool);
  const used = new Set<number>(state.used);
  const rnd = random(room, 99);
  for (const seat of seats(room)) {
    const team = state.teams[seat] as Team;
    for (const slot of team.slots) {
      if (slot.pick) continue;
      const pos =
        slot.pos === ANY ? (["DF", "MF", "FW"][Math.floor(rnd() * 3)] as string) : slot.pos;
      const free = (pool[pos] ?? []).filter((p) => !used.has(p.id));
      const tail = free.slice(-Math.max(3, Math.floor(free.length * 0.15)));
      const list = tail.length ? tail : free;
      const player = list[Math.floor(rnd() * list.length)];
      if (!player) continue;
      used.add(player.id);
      const price = team.money >= 1 ? 1 : 0;
      team.money -= price;
      slot.pick = { playerId: player.id, rating: playerRating(player), price, auto: true };
      state.log.push({ playerId: player.id, seat, price, auto: true });
    }
  }
  state.used = [...used];
  finishAuction(room, ctx);
}

export function teamStrength(data: GameData, team: Team) {
  const picks = team.slots.map((slot) => slot.pick).filter(Boolean) as Pick[];
  const ratings = picks.reduce((sum, pick) => sum + pick.rating, 0);
  let chem = 0;
  for (let i = 0; i < picks.length; i++)
    for (let j = i + 1; j < picks.length; j++) {
      const a = data.playersById.get(picks[i]!.playerId);
      const b = data.playersById.get(picks[j]!.playerId);
      if (!a || !b) continue;
      if (a.current_club_id && a.current_club_id === b.current_club_id) chem += 2;
      if (a.nationality_code && a.nationality_code === b.nationality_code) chem += 1;
    }
  chem = Math.min(10, chem);
  return {
    ratings,
    chem,
    total: ratings + chem,
    spent: picks.reduce((sum, pick) => sum + pick.price, 0),
  };
}

function finishAuction(room: Room, ctx: Ctx) {
  const state = room.state;
  state.phase = "done";
  state.lot = null;
  state.deadline = null;
  const strength = Object.fromEntries(
    seats(room).map((seat) => [seat, teamStrength(ctx.data, state.teams[seat])]),
  );
  state.strength = strength;
  const [a, b] = seats(room);
  const sa = a ? strength[a]!.total : 0;
  const sb = b ? strength[b]!.total : 0;
  ctx.finish(
    sa === sb ? null : sa > sb ? (a as string) : (b as string),
    sa === sb ? "draw" : "win",
  );
}

function openLot(room: Room, ctx: Ctx) {
  const state = room.state;
  const teams = state.teams as Record<string, Team>;
  if (seats(room).every((seat) => openCount(teams[seat] as Team) === 0)) {
    finishAuction(room, ctx);
    return;
  }
  const info = state.lotNo < MAX_LOTS ? pickLot(room, ctx.data) : null;
  if (!info) {
    autofill(room, ctx);
    return;
  }
  state.used.push(info.player.id);
  const takers = seats(room).filter((seat) => openCount(teams[seat] as Team, info.pos) > 0);
  const turn = state.nextOpener ?? room.players[0]?.seat;
  const opener = takers.includes(turn) ? turn : (takers[0] as string);
  state.lotNo += 1;
  state.nextOpener = otherSeat(room, turn);
  state.lot = {
    playerId: info.player.id,
    pos: info.pos,
    rating: playerRating(info.player),
    price: 0,
    leader: null,
    opener,
    passed: Object.fromEntries(seats(room).map((seat) => [seat, false])),
    history: [],
    clue: info.clue,
    expected: info.expected,
  } satisfies Lot;
  state.phase = "bid";
  state.outcome = null;
  state.deadline = ctx.now + actionMs(room);
  // Bu mövqedə yalnız bir komandanın yeri qalıbsa, oyunçu ona minimum qiymətə gedir.
  if (takers.length === 1) {
    assign(room, ctx, opener, Math.min(MIN_BID, (teams[opener] as Team).money), { auto: true });
    return;
  }
  // Açanın 1 ₼-ı yoxdursa, qalan pulu (0 da ola bilər) avtomatik təklif olunur.
  if ((teams[opener] as Team).money < MIN_BID)
    openWith(room, ctx, opener, (teams[opener] as Team).money);
}

function openWith(room: Room, ctx: Ctx, seat: string, amount: number) {
  const lot = room.state.lot as Lot;
  lot.price = amount;
  lot.leader = seat;
  lot.history.unshift({ seat, amount, auto: true });
  room.state.deadline = ctx.now + actionMs(room);
}

function close(room: Room, ctx: Ctx) {
  const state = room.state;
  const lot = state.lot as Lot;
  if (!lot.leader) {
    state.phase = "sold";
    state.outcome = { seat: null, price: 0, playerId: lot.playerId };
    state.log.push({ playerId: lot.playerId, seat: null, price: 0 });
    state.deadline = ctx.now + SOLD_MS;
    return;
  }
  assign(room, ctx, lot.leader, lot.price);
}

/** Gizli rejimdə satış bitənə qədər oyunçunun kim olduğu (və reytinqi) göndərilmir. */
function lotView(room: Room) {
  const lot = room.state.lot as Lot | null;
  if (!lot) return null;
  if (!lot.clue || room.state.phase !== "bid") return lot;
  const { playerId: _id, rating: _rating, ...rest } = lot;
  return { ...rest, playerId: null, rating: null };
}

export const auction: GameModule = {
  settings: normalize,

  start(room, ctx) {
    const slots = formationSlots(settingsOf(room).formation);
    room.state = {
      teams: Object.fromEntries(
        seats(room).map((seat) => [
          seat,
          { money: BUDGET, slots: slots.map((pos) => ({ pos, pick: null })) },
        ]),
      ),
      used: [],
      lotNo: 0,
      lot: null,
      phase: "bid",
      outcome: null,
      nextOpener: room.players[0]?.seat,
      log: [],
      deadline: null,
      lastEvent: null,
      strength: null,
    };
    openLot(room, ctx);
  },

  move(room, seat, payload, ctx) {
    const state = room.state;
    const lot = state.lot as Lot | null;
    if (state.phase !== "bid" || !lot) return "LOT_CLOSED";
    if (payload.action === "pass") {
      if (!lot.leader || lot.leader === seat || lot.passed[seat]) return "CANNOT_PASS";
      lot.passed[seat] = true;
      state.lastEvent = event(ctx, "pass", seat);
      if (!seats(room).some((entry) => canBid(state, entry))) close(room, ctx);
      return null;
    }
    if (!canBid(state, seat))
      return lot.leader || seat === lot.opener ? "CANNOT_BID" : "OPENER_FIRST";
    const amount = Math.round(Number(payload.amount));
    if (!Number.isFinite(amount) || amount < nextPrice(lot)) return "BID_TOO_LOW";
    if (amount > maxBid(state.teams[seat])) return "NOT_ENOUGH_MONEY";
    lot.price = amount;
    lot.leader = seat;
    lot.history.unshift({ seat, amount });
    state.lastEvent = event(ctx, "bid", seat, { amount });
    state.deadline = ctx.now + actionMs(room);
    // Rəqib artıq təklif verə bilmirsə (pulu çatmır), lot dərhal satılır.
    if (!seats(room).some((entry) => canBid(state, entry))) close(room, ctx);
    return null;
  },

  tick(room, ctx) {
    const state = room.state;
    if (state.phase === "sold") {
      openLot(room, ctx);
      return;
    }
    const lot = state.lot as Lot | null;
    if (state.phase !== "bid" || !lot) return;
    if (!lot.leader) {
      // Açan vaxtında təklif verməsə, onun adından minimum 1 ₼ təklif olunur.
      const cash = (state.teams[lot.opener] as Team).money;
      openWith(room, ctx, lot.opener, Math.min(MIN_BID, cash));
      state.lastEvent = event(ctx, "auto_open", lot.opener, { amount: lot.price });
      if (!seats(room).some((entry) => canBid(state, entry))) close(room, ctx);
      return;
    }
    close(room, ctx);
  },

  view(room) {
    const { teams, phase, outcome, lotNo, deadline, lastEvent, strength, log } = room.state;
    return {
      teams,
      lot: lotView(room),
      phase,
      outcome,
      lotNo,
      deadline,
      lastEvent,
      strength,
      log: (log as unknown[]).slice(-12),
      budget: BUDGET,
      minBid: MIN_BID,
      actionMs: actionMs(room),
      slots: formationSlots(settingsOf(room).formation),
      maxLots: MAX_LOTS,
    };
  },
};
