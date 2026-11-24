import { randomBytes } from "node:crypto";
import type Redis from "ioredis";

// Onlayn duel otağı. Oyunçular otaqda "seat" (yer) ID-si ilə tanınır — real istifadəçi və ya
// qonaq ID-si heç vaxt rəqibə göndərilmir (qonaq ID-si ilə başqasının yerinə qoşulmaq olmasın).
export type DuelGame = "xox" | "higherLower" | "twoLetters" | "orta" | "sual" | "sekil" | "auction";
export const SUPPORTED_GAMES: DuelGame[] = ["xox", "higherLower", "twoLetters", "orta", "sual", "sekil", "auction"];

export interface DuelPlayer {
  seat: string;
  identityId: string;
  name: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  guest: boolean;
  socketId: string;
  connected: boolean;
  /** Bağlantı kəsiləndən sonra texniki məğlubiyyət vaxtı (ms). */
  forfeitAt?: number | null;
}

export interface Room {
  v: 2;
  code: string;
  game: DuelGame;
  players: DuelPlayer[];
  hostSeat: string;
  status: "waiting" | "playing" | "finished";
  seed: number;
  startedAt?: number;
  rematch: string[];
  // Hər oyun öz vəziyyətini saxlayır. `deadline` — növbəti avtomatik addımın vaxtı (ms).
  state: Record<string, any>;
  /** Otağı quranın seçdiyi parametrlər (hər oyun özü yoxlayır və tamamlayır). */
  settings?: Record<string, any>;
  winnerSeat?: string | null;
  loserSeat?: string | null;
  endedReason?: string | null;
  /** Təsadüfi rəqib axtarışı ilə yaradılıb. */
  random?: boolean;
  createdAt: number;
}

const ROOM_TTL_SECONDS = 2 * 60 * 60;
const FINISHED_TTL_SECONDS = 30 * 60;
export const TIMERS_KEY = "duel:timers";
const roomKey = (code: string) => `duel:room:${code}`;
const lockKey = (code: string) => `duel:lock:${code}`;

export const newSeat = () => randomBytes(5).toString("hex");

export async function readRoom(redis: Redis, code: string): Promise<Room | null> {
  const raw = await redis.get(roomKey(code));
  if (!raw) return null;
  const room = JSON.parse(raw) as Room;
  return room.v === 2 ? room : null;
}

export async function roomExists(redis: Redis, code: string): Promise<boolean> {
  return (await redis.exists(roomKey(code))) === 1;
}

/** Otağın növbəti avtomatik addımı: oyun taymeri və ya bağlantısı kəsilən oyunçunun məğlubiyyəti. */
export function nextDue(room: Room): number | null {
  if (room.status !== "playing") return null;
  const times: number[] = [];
  const deadline = Number(room.state?.deadline);
  if (Number.isFinite(deadline) && deadline > 0) times.push(deadline);
  for (const player of room.players) if (player.forfeitAt) times.push(player.forfeitAt);
  return times.length ? Math.min(...times) : null;
}

export async function saveRoom(redis: Redis, room: Room): Promise<void> {
  const ttl = room.status === "finished" ? FINISHED_TTL_SECONDS : ROOM_TTL_SECONDS;
  const due = nextDue(room);
  const multi = redis.multi();
  multi.set(roomKey(room.code), JSON.stringify(room), "EX", ttl);
  if (due) multi.zadd(TIMERS_KEY, due, room.code);
  else multi.zrem(TIMERS_KEY, room.code);
  await multi.exec();
}

export async function deleteRoom(redis: Redis, code: string): Promise<void> {
  await redis.multi().del(roomKey(code)).zrem(TIMERS_KEY, code).exec();
}

export async function dueRooms(redis: Redis, now: number, limit = 25): Promise<string[]> {
  return redis.zrangebyscore(TIMERS_KEY, 0, now, "LIMIT", 0, limit);
}

// ---- Kilid ----
// Eyni otağa eyni anda gələn hərəkətlər növbəyə düzülür: əvvəl prosesin daxilində (promise zənciri),
// sonra Redis kilidi ilə (bir neçə server nüsxəsi olanda da vəziyyət itməsin).
const chains = new Map<string, Promise<unknown>>();
const RELEASE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

async function acquire(redis: Redis, code: string, token: string): Promise<void> {
  const started = Date.now();
  for (;;) {
    const ok = await redis.set(lockKey(code), token, "PX", 5000, "NX");
    if (ok) return;
    if (Date.now() - started > 4000) throw new Error("ROOM_BUSY");
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

export async function withRoomLock<T>(redis: Redis, code: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(code) ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>((resolve) => (release = resolve));
  const chain = previous.then(() => mine);
  chains.set(code, chain);
  await previous.catch(() => {});
  const token = randomBytes(8).toString("hex");
  try {
    await acquire(redis, code, token);
    try {
      return await fn();
    } finally {
      await redis.eval(RELEASE_SCRIPT, 1, lockKey(code), token).catch(() => {});
    }
  } finally {
    release();
    if (chains.get(code) === chain) chains.delete(code);
  }
}
