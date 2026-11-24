export interface QueueEntry {
  id: string;
  socketId: string;
  rating: number;
  guest: boolean;
  joinedAt: number;
  name: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  avoid?: string | null;
}

export function ratingWindow(waitMs: number): number {
  const seconds = Math.max(0, waitMs) / 1000;
  if (seconds >= 40) return Number.POSITIVE_INFINITY;
  return 150 + 30 * Math.floor(seconds);
}

export const MIXED_AFTER_MS = 10_000;
export const AVOID_AFTER_MS = 20_000;

export function compatible(a: QueueEntry, b: QueueEntry, now: number): boolean {
  if (a.id === b.id) return false;
  const wait = Math.max(now - a.joinedAt, now - b.joinedAt);
  const bothWait = Math.min(now - a.joinedAt, now - b.joinedAt);
  if (a.guest !== b.guest && wait < MIXED_AFTER_MS) return false;
  if ((a.avoid === b.id || b.avoid === a.id) && bothWait < AVOID_AFTER_MS) return false;
  return Math.abs(a.rating - b.rating) <= ratingWindow(wait);
}

export function findPairs(entries: QueueEntry[], now: number): [QueueEntry, QueueEntry][] {
  const queue = [...entries].sort((x, y) => x.joinedAt - y.joinedAt);
  const used = new Set<string>();
  const pairs: [QueueEntry, QueueEntry][] = [];
  for (const a of queue) {
    if (used.has(a.id)) continue;
    let best: QueueEntry | null = null;
    for (const b of queue) {
      if (b === a || used.has(b.id) || !compatible(a, b, now)) continue;
      if (!best || Math.abs(a.rating - b.rating) < Math.abs(a.rating - best.rating)) best = b;
    }
    if (best) {
      used.add(a.id);
      used.add(best.id);
      pairs.push([a, best]);
    }
  }
  return pairs;
}

export const queueKey = (game: string) => `mm:q:${game}`;
export const queueLockKey = (game: string) => `mm:lock:${game}`;
export const whereKey = (id: string) => `mm:where:${id}`;
export const recentKey = (id: string) => `mm:recent:${id}`;
export const ACTIVE_QUEUES_KEY = "mm:games";
