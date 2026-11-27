// Small, dependency-free helpers shared by the home page, banners and the duel hook.
// Kept separate from useDuelRoom so pages that only need these don't pull in socket.io.

export function socketBase() {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/v1";
  return apiUrl.replace(/\/v1\/?$/, "").replace(/\/$/, "");
}

let autoMatchAt = 0;
/** Consumes a pending "find random opponent" request made in the last 20 seconds. */
export function takeAutoMatch() {
  const fresh = autoMatchAt && Date.now() - autoMatchAt < 20_000;
  autoMatchAt = 0;
  return Boolean(fresh);
}
export const hasAutoMatch = () => Boolean(autoMatchAt);

export function requestAutoMatch() {
  autoMatchAt = Date.now();
}

// Kept in localStorage (not sessionStorage) so closing the tab and coming back
// still rejoins the running game. Rooms live 2h on the server, so expire too.
const storeKey = (game) => `fg-duel:${game}`;
const STORE_TTL_MS = 2 * 60 * 60 * 1000;
const readEntry = (game) => {
  try {
    const raw = localStorage.getItem(storeKey(game));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.code || Date.now() - Number(entry.at) > STORE_TTL_MS) {
      localStorage.removeItem(storeKey(game));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
};
export const readStored = (game) => readEntry(game)?.code ?? "";
export const writeStored = (game, code, status) => {
  try {
    if (code) localStorage.setItem(storeKey(game), JSON.stringify({ code, status: status ?? null, at: Date.now() }));
    else localStorage.removeItem(storeKey(game));
  } catch {
  }
};

export const forgetDuel = (game) => writeStored(game, "");

/** Games with an unfinished online room, newest first — for the "resume" banner. */
export function activeDuels(games) {
  return games
    .map((game) => ({ game, ...readEntry(game) }))
    .filter((entry) => entry.code && entry.status === "playing")
    .sort((a, b) => b.at - a.at);
}

export function hasDuelEntry(game) {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    // ?otaq=123456 joins a room, ?onlayn=1 opens the online mode directly (home page shortcuts).
    if (params.get("otaq") || params.get("onlayn")) return true;
  } catch {
  }
  return Boolean(readStored(game));
}

