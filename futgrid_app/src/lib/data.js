import { tr } from "../i18n";
import { MANUAL_PHOTOS } from "./manualPhotos";
import marketValuesCsv from "../data/market-values.csv?raw";
const BASE = "/data";

let cache = null;

export const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/đ/g, "d")
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getJson = async (file, optional = false) => {
  const res = await fetch(`${BASE}/${file}`);
  const text = res.ok ? await res.text() : "";
  if (!res.ok || text.trimStart().startsWith("<")) {
    if (optional) return null;
    throw new Error(tr("{file} tapılmadı", { file }));
  }
  return JSON.parse(text);
};

const manualBySlug = new Map(Object.entries(MANUAL_PHOTOS));
const manualByName = new Map(
  Object.entries(MANUAL_PHOTOS).map(([key, url]) => [norm(key), url]),
);

export function manualPhoto(slug, name) {
  return manualBySlug.get(slug) ?? manualByName.get(norm(name)) ?? null;
}

/*
 * Bazar dəyəri düzəlişləri: src/data/market-values.csv faylında "new_m" sütununa
 * yazılan dəyər (milyon €, məs. 45 və ya 3,5) players.json-dakı dəyərin yerinə keçir.
 * Sətirdə id varsa id ilə, yoxdursa adla tapılır. 0 yazsan dəyər sıfırlanır.
 */
export function parseValueFixes(text) {
  const byId = new Map();
  const byName = new Map();
  const lines = String(text ?? "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const header = lines.shift() ?? "";
  const sep = header.includes(";") ? ";" : ",";
  const head = header
    .split(sep)
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const iId = head.indexOf("id");
  const iName = head.indexOf("name");
  const iNew = head.indexOf("new_m");
  if (iNew < 0) return { byId, byName };
  for (const line of lines) {
    const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const raw = (cells[iNew] ?? "").replace(/\s/g, "").replace(",", ".");
    if (!raw) continue;
    const millions = Number(raw);
    if (!Number.isFinite(millions) || millions < 0) continue;
    const eur = Math.round(millions * 1e6);
    const id = iId >= 0 ? cells[iId] : "";
    if (id) byId.set(String(id), eur);
    else if (iName >= 0 && cells[iName]) byName.set(norm(cells[iName]), eur);
  }
  return { byId, byName };
}

const VALUE_FIXES = parseValueFixes(marketValuesCsv);

function applyValueFix(p) {
  const eur =
    VALUE_FIXES.byId.get(String(p.id)) ?? VALUE_FIXES.byName.get(p._name);
  if (eur === undefined) return;
  const mv = { ...(p.market_value ?? {}) };
  mv.amount_eur = eur;
  mv.highest_eur = Math.max(mv.highest_eur ?? 0, eur);
  p.market_value = mv;
}

function buildIndex({ clubs, players, trophies, countries, coaches }) {
  const clubsById = new Map(clubs.map((c) => [c.id, c]));
  const playersById = new Map();
  const playersByClub = new Map();

  for (const p of players) {
    const manual = manualPhoto(p.slug, p.name);
    if (manual) p.photo_url = manual;
    p._name = norm(p.name);
    p._tokens = p._name.split(" ");
    applyValueFix(p);
    playersById.set(p.id, p);
    for (const clubId of new Set(p.club_history ?? [])) {
      if (!playersByClub.has(clubId)) playersByClub.set(clubId, new Set());
      playersByClub.get(clubId).add(p.id);
    }
  }

  return {
    clubs,
    players,
    trophies: trophies ?? [],
    countries: countries ?? [],
    coaches: coaches ?? [],
    clubsById,
    playersById,
    playersByClub,
    trophiesById: new Map((trophies ?? []).map((t) => [t.id, t])),
    countriesByCode: new Map((countries ?? []).map((c) => [c.code, c])),
    coachesById: new Map((coaches ?? []).map((c) => [c.id, c])),
  };
}

// Yalnız klublar (loqolar üçün) — ana səhifədəki zolaq bütün datanı gözləmədən istifadə edir.
let clubsCache = null;
export function loadClubs() {
  if (!clubsCache)
    clubsCache = getJson("clubs.json").catch((e) => {
      clubsCache = null;
      throw e;
    });
  return clubsCache;
}

export function prefetchData() {
  if (cache || typeof window === "undefined") return;
  const run = () => loadData().catch(() => {});
  const idle = () =>
    "requestIdleCallback" in window
      ? window.requestIdleCallback(run, { timeout: 3000 })
      : run();
  setTimeout(idle, 2500);
}

export function loadData() {
  if (!cache) {
    cache = Promise.all([
      loadClubs(),
      getJson("players.json"),
      getJson("trophies.json", true),
      getJson("countries.json", true),
      getJson("coaches.json", true),
    ])
      .then(([clubs, players, trophies, countries, coaches]) =>
        buildIndex({ clubs, players, trophies, countries, coaches }),
      )
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

export function datasetFor(data, era) {
  if (era === "all") return data;
  data._active ??= buildIndex({
    ...data,
    players: data.players.filter((p) => p.is_active !== false),
  });
  return data._active;
}

export function searchPlayers(data, query, limit = 8) {
  const q = norm(query);
  if (q.length < 2) return [];
  const words = q.split(" ");
  const hits = [];

  for (const p of data.players) {
    if (!words.every((w) => p._tokens.some((t) => t.startsWith(w)))) continue;
    const rank = p._name === q ? 0 : p._name.startsWith(q) ? 1 : 2;
    hits.push({ p, rank, value: p.market_value?.amount_eur ?? 0 });
  }

  hits.sort((a, b) => a.rank - b.rank || b.value - a.value);
  return hits.slice(0, limit).map((h) => h.p);
}

export const birthYear = (p) => p.birth_date?.slice(0, 4) ?? null;

function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function fullNameIndex(data) {
  if (data._fullNames) return data._fullNames;
  const map = new Map();
  const add = (key, p) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    if (!map.get(key).includes(p)) map.get(key).push(p);
  };
  for (const p of data.players) {
    const name = p._name ?? norm(p.name);
    add(name, p);
    const t = name.split(" ");
    if (t.length > 2) add(`${t[0]} ${t[t.length - 1]}`, p);
  }
  data._fullNames = map;
  return map;
}

/**
 * Yazılan mətni yalnız futbolçunun TAM adı ilə uyğunlaşdırır (təklif siyahısı olmadan).
 * "messi" və ya "l m" kimi yarımçıq yazı qəbul olunmur; uzun adlarda 1-2 hərflik səhvə icazə var.
 */
export function findByFullName(data, text) {
  const q = norm(text);
  if (q.length < 3) return [];
  const map = fullNameIndex(data);
  const value = (p) =>
    Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0);
  const exact = map.get(q);
  if (exact) return [...exact].sort((a, b) => value(b) - value(a));
  const max = q.length >= 12 ? 2 : q.length >= 6 ? 1 : 0;
  if (!max) return [];
  let best = max + 1;
  let hits = [];
  for (const [key, list] of map) {
    if (key.split(" ").length !== q.split(" ").length) continue;
    const d = editDistance(q, key, Math.min(max, best));
    if (d < best) {
      best = d;
      hits = [...list];
    } else if (d === best && d <= max) hits.push(...list);
  }
  return best <= max
    ? [...new Set(hits)].sort((a, b) => value(b) - value(a))
    : [];
}
