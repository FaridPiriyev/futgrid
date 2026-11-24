import { createGameData, type Category, type GameData, type RawPlayer } from "@futgrid/game-core";
import type { Room } from "../store.js";

export interface Ctx {
  now: number;
  data: GameData;
  /**
   * Oyunu bitirir (qalib yoxdursa null). Nəticə kilid bağlananda göndərilir.
   * `loserSeat` verilməsə, qalibdən başqa ilk oyunçu məğlub sayılır (2 nəfərlik oyunlar).
   */
  finish(winnerSeat: string | null, reason: string, loserSeat?: string | null): void;
}

export interface GameModule {
  /** Otaq yaradılanda gələn parametrləri yoxlayır, çatmayanları standartla doldurur. */
  settings?(raw: unknown): Record<string, any>;
  start(room: Room, ctx: Ctx): void;
  /** Səhv olanda xəta kodu, uğurda null qaytarır. */
  move(room: Room, seat: string, payload: Record<string, unknown>, ctx: Ctx): string | null;
  /** state.deadline çatanda çağırılır. */
  tick?(room: Room, ctx: Ctx): void;
  view(room: Room, ctx: Ctx): Record<string, unknown>;
}

export const seats = (room: Room) => room.players.map((player) => player.seat);
export const otherSeat = (room: Room, seat: string) =>
  room.players.find((player) => player.seat !== seat)?.seat ?? seat;

export const zeroScores = (room: Room) => Object.fromEntries(seats(room).map((seat) => [seat, 0]));

/** Xalı çox olan qalibdir, bərabərdirsə null. */
export function leaderOf(scores: Record<string, number>): string | null {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!sorted[0]) return null;
  if (sorted[1] && sorted[1][1] === sorted[0][1]) return null;
  return sorted[0][0];
}

export const topScore = (scores: Record<string, number>) => Math.max(0, ...Object.values(scores));

export interface DuelEvent {
  type: string;
  seat?: string | null;
  at: number;
  [key: string]: unknown;
}

export const event = (
  ctx: Ctx,
  type: string,
  seat: string | null,
  extra: Record<string, unknown> = {},
): DuelEvent => ({
  type,
  seat,
  at: ctx.now,
  ...extra,
});

export const playerName = (data: GameData, id: number) =>
  data.playersById.get(id)?.name ?? String(id);

export function serializeCategory(category: Category) {
  return {
    key: category.key,
    type: category.type,
    label: category.label,
    tier: category.tier,
    ...(category.club ? { club: { id: category.club.id, name: category.club.name } } : {}),
    ...(category.code ? { code: category.code } : {}),
    ...(category.flag ? { flag: category.flag } : {}),
    ...(category.trophyId ? { trophyId: category.trophyId } : {}),
    ...(category.min ? { min: category.min } : {}),
    ...(category.coach ? { coach: { id: category.coach.id, name: category.coach.name } } : {}),
    ...(category.image ? { image: category.image } : {}),
    ...(category.photo ? { photo: category.photo } : {}),
  };
}

/** Ən tanınan uyğun futbolçu (raund cavabsız bitəndə göstərmək üçün). */
export function famousMatch(data: GameData, ids: Iterable<number>): RawPlayer | null {
  let best: RawPlayer | null = null;
  let bestValue = -1;
  for (const id of ids) {
    const player = data.playersById.get(id);
    if (!player) continue;
    const value = Math.max(
      player.market_value?.highest_eur ?? 0,
      player.market_value?.amount_eur ?? 0,
    );
    if (value > bestValue) {
      best = player;
      bestValue = value;
    }
  }
  return best;
}

/** "Aktiv" dövr: yalnız hazırda oynayan futbolçular (frontend-dəki datasetFor ilə eyni). */
const activeCache = new WeakMap<GameData, GameData>();
export function dataFor(data: GameData, era: unknown): GameData {
  if (era !== "active") return data;
  let active = activeCache.get(data);
  if (!active) {
    active = createGameData({
      clubs: data.clubs,
      players: data.players.filter((player) => player.is_active !== false),
      trophies: data.trophies,
      countries: data.countries,
      coaches: data.coaches,
      famousMatches: data.famousMatches,
    });
    activeCache.set(data, active);
  }
  return active;
}

/** Parametri icazə verilən dəyərlərdən biri ilə məhdudlaşdırır. */
export function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export const asObject = (raw: unknown): Record<string, any> =>
  raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, any>) : {};

/** Raund arası: hər iki oyunçu "Hazıram" deyəndə və ya vaxt bitəndə növbəti raund başlayır. */
export function voteReady(room: Room, seat: string): boolean {
  const state = room.state;
  const ready = new Set<string>(state.ready ?? []);
  ready.add(seat);
  state.ready = [...ready];
  return seats(room).every((entry) => ready.has(entry));
}

export const pickRandom = <T>(list: readonly T[], random: () => number): T | undefined =>
  list.length ? list[Math.floor(random() * list.length)] : undefined;
