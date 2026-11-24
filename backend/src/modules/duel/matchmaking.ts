// Təsadüfi rəqib axtarışı (matchmaking).
//
// Oyunçu "Rəqib tap" basanda növbəyə düşür (Redis hash: mm:q:<oyun>). Hər bir neçə saniyədən bir
// növbə yoxlanılır və reytinqi yaxın olan iki oyunçu bir otağa salınır. Gözləmə uzandıqca icazə
// verilən Elo fərqi genişlənir — heç kim uzun müddət tək qalmasın.

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
  /** Bayaq oynadığı rəqib — dərhal yenə eyni adama düşməsin. */
  avoid?: string | null;
}

/** Başlanğıcda ±150 Elo, hər saniyə +30, 40 saniyədən sonra fərq nəzərə alınmır. */
export function ratingWindow(waitMs: number): number {
  const seconds = Math.max(0, waitMs) / 1000;
  if (seconds >= 40) return Number.POSITIVE_INFINITY;
  return 150 + 30 * Math.floor(seconds);
}

/** Qonaq ilə hesablı oyunçu yalnız bu qədər gözləyəndən sonra birləşir (reytinqsiz oyun olur). */
export const MIXED_AFTER_MS = 10_000;
/** Eyni rəqiblə təkrar düşməmək üçün gözləmə. Hər ikisi bundan çox gözləsə, icazə var. */
export const AVOID_AFTER_MS = 20_000;

export function compatible(a: QueueEntry, b: QueueEntry, now: number): boolean {
  if (a.id === b.id) return false;
  const wait = Math.max(now - a.joinedAt, now - b.joinedAt);
  const bothWait = Math.min(now - a.joinedAt, now - b.joinedAt);
  if (a.guest !== b.guest && wait < MIXED_AFTER_MS) return false;
  if ((a.avoid === b.id || b.avoid === a.id) && bothWait < AVOID_AFTER_MS) return false;
  return Math.abs(a.rating - b.rating) <= ratingWindow(wait);
}

/** Ən çox gözləyəndən başlayaraq hər kəsə reytinqcə ən yaxın uyğun rəqibi tapır. */
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
/** İstifadəçi hansı oyunun növbəsindədir (bir anda yalnız bir növbə). */
export const whereKey = (id: string) => `mm:where:${id}`;
export const recentKey = (id: string) => `mm:recent:${id}`;
/** Növbəsi boş olmayan oyunlar. */
export const ACTIVE_QUEUES_KEY = "mm:games";
