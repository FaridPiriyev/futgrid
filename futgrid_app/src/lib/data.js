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
    throw new Error(`${file} tapılmadı`);
  }
  return JSON.parse(text);
};

function buildIndex({ clubs, players, trophies, countries, coaches }) {
  const clubsById = new Map(clubs.map((c) => [c.id, c]));
  const playersById = new Map();
  const playersByClub = new Map();

  for (const p of players) {
    p._name = norm(p.name);
    p._tokens = p._name.split(" ");
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

export function loadData() {
  if (!cache) {
    cache = Promise.all([
      getJson("clubs.json"),
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
