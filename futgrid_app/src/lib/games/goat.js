import { norm } from "../data";
import { shuffle } from "../random";
import { GOAT_PLAYERS } from "./goatPlayers";

import { tr } from "../../i18n";
export const SIZES = [16, 32, 64, 128];
const HISTORY_KEY = "futgrid:goat:history";

export function roundName(size) {
  if (size === 2) return tr("Final");
  if (size === 4) return tr("Yarımfinal");
  if (size === 8) return tr("Çeyrək final");
  return tr("Son {n}", { n: size, half: size / 2 });
}

export function startBracket(size, random = Math.random) {
  const list = GOAT_PLAYERS.slice(0, size);
  return { alive: shuffle(list, random), winners: [], index: 0, out: {} };
}

export const pairOf = (state) => [state.alive[state.index * 2], state.alive[state.index * 2 + 1]];

export const matchesIn = (state) => state.alive.length / 2;

export function pick(state, winner) {
  const [a, b] = pairOf(state);
  const loser = winner.id === a.id ? b : a;
  const out = { ...state.out, [loser.id]: state.alive.length };
  const winners = [...state.winners, winner];
  if (state.index + 1 < matchesIn(state))
    return { ...state, winners, index: state.index + 1, out };
  if (winners.length === 1) return { alive: winners, winners: [], index: 0, out, champion: winner };
  return { alive: winners, winners: [], index: 0, out };
}

export function standings(state, size) {
  const list = GOAT_PLAYERS.slice(0, size);
  const groups = (n) => list.filter((p) => state.out[p.id] === n);
  return {
    champion: state.champion,
    final: groups(2),
    semi: groups(4),
    quarter: groups(8),
  };
}

const LOCAL = (id) => `/images/goat/${id}.jpg`;

export function photoIndex(data) {
  if (!data) return new Map(GOAT_PLAYERS.map((g) => [g.id, [LOCAL(g.id)]]));
  if (data._goatPhotos) return data._goatPhotos;
  const bySlug = new Map();
  const byName = new Map();
  for (const p of data.players) {
    if (!p.photo_url) continue;
    const better = (prev) => !prev || (p.market_value?.highest_eur ?? 0) > (prev.market_value?.highest_eur ?? 0);
    if (p.slug && better(bySlug.get(p.slug))) bySlug.set(p.slug, p);
    const k = norm(p.name);
    if (better(byName.get(k))) byName.set(k, p);
  }
  const out = new Map();
  for (const g of GOAT_PLAYERS) {
    const hit =
      bySlug.get(g.id) ??
      [g.name, ...(g.aliases ?? [])].map((n) => byName.get(norm(n))).find(Boolean);
    out.set(g.id, [LOCAL(g.id), hit?.photo_url].filter(Boolean));
  }
  data._goatPhotos = out;
  return out;
}

export function readHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveResult(size, result) {
  const entry = {
    size,
    champion: result.champion.id,
    final: result.final.map((p) => p.id),
    semi: result.semi.map((p) => p.id),
    at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...readHistory()].slice(0, 30)));
  } catch {}
  const api = import.meta.env?.VITE_API_URL;
  if (api)
    fetch(`${api.replace(/\/$/, "")}/goat/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {});
  return entry;
}
