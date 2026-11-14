import {
  clubFameReady,
  clubFameTier,
  coachFameTier,
  countryFameTier,
} from "./fame.js";
import type {
  Category,
  CategoryPool,
  Entity,
  EntityIndex,
  GameData,
  RawCountry,
  RawPlayer,
} from "./types.js";

export type { Category, Entity } from "./types.js";

const TROPHY_PICKS = [
  { id: "ucl", min: 1, label: "Champions League", tier: 1 },
  { id: "world_cup", min: 1, label: "World Cup", tier: 1 },
  { id: "euro", min: 1, label: "European Championship", tier: 1 },
  { id: "copa_america", min: 1, label: "Copa America", tier: 1 },
  { id: "ballon_dor", min: 1, label: "Ballon d'Or", tier: 1 },
  { id: "premier_league", min: 1, label: "Premier League", tier: 1 },
  { id: "la_liga", min: 1, label: "La Liga", tier: 1 },
  { id: "bundesliga", min: 1, label: "Bundesliga", tier: 1 },
  { id: "serie_a", min: 1, label: "Serie A", tier: 1 },
  { id: "ligue_1", min: 1, label: "Ligue 1", tier: 1 },
  { id: "ucl", min: 2, label: "Champions League x2", tier: 2 },
  { id: "europa_league", min: 1, label: "Europa League", tier: 2 },
  { id: "club_world_cup", min: 1, label: "Club World Cup", tier: 2 },
  { id: "uefa_super_cup", min: 1, label: "UEFA Super Cup", tier: 2 },
  { id: "nations_league", min: 1, label: "Nations League", tier: 2 },
  { id: "golden_boy", min: 1, label: "Golden Boy", tier: 2 },
  { id: "eredivisie", min: 1, label: "Eredivisie", tier: 2 },
  { id: "primeira_liga", min: 1, label: "Primeira Liga", tier: 2 },
  { id: "conference_league", min: 1, label: "Conference League", tier: 3 },
  { id: "fa_cup", min: 1, label: "FA Cup", tier: 3 },
  { id: "copa_del_rey", min: 1, label: "Copa del Rey", tier: 3 },
  { id: "dfb_pokal", min: 1, label: "DFB Pokal", tier: 3 },
  { id: "coppa_italia", min: 1, label: "Coppa Italia", tier: 3 },
  { id: "coupe_de_france", min: 1, label: "Coupe de France", tier: 3 },
  { id: "super_lig", min: 1, label: "Super Lig", tier: 3 },
  { id: "scottish_premiership", min: 1, label: "Scottish Premiership", tier: 3 },
  { id: "saudi_pro_league", min: 1, label: "Saudi Pro League", tier: 3 },
  { id: "mls_cup", min: 1, label: "MLS Cup", tier: 3 },
  { id: "golden_shoe", min: 1, label: "Golden Shoe", tier: 3 },
];

export function countryName(code: string, data: GameData): string {
  const country: RawCountry | undefined = data.countriesByCode.get(code);
  return country?.name_en ?? country?.name ?? code;
}

export function countryFlag(code: string, data: GameData): string {
  const country = data.countriesByCode.get(code);
  if (country?.flag) return country.flag;
  if (!/^[A-Z]{2}$/.test(code)) return "";
  try {
    return String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
  } catch {
    return "";
  }
}

const trophyCount = (player: RawPlayer, id: string): number =>
  player.trophies?.find((trophy) => trophy.id === id)?.count ?? 0;

const groupBy = (players: RawPlayer[], keysOf: (player: RawPlayer) => string[]): Map<string, Set<number>> => {
  const map = new Map<string, Set<number>>();
  for (const player of players) {
    for (const key of keysOf(player)) {
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)?.add(player.id);
    }
  }
  return map;
};

const tierByRank = (rank: number, easy: number, normal: number): number =>
  rank < easy ? 1 : rank < normal ? 2 : 3;

function clubCategories(data: GameData, minPlayers: number): Category[] {
  const value = new Map<number, number>();
  for (const player of data.players) {
    if (!player.current_club_id || player.is_active === false) continue;
    value.set(
      player.current_club_id,
      (value.get(player.current_club_id) ?? 0) + (player.market_value?.amount_eur ?? 0),
    );
  }
  const curated = clubFameReady(data);
  return data.clubs
    .map((club) => ({ club, ids: data.playersByClub.get(club.id) }))
    .filter(({ ids }) => ids && ids.size >= minPlayers)
    .sort(
      (a, b) =>
        (value.get(b.club.id) ?? 0) - (value.get(a.club.id) ?? 0) ||
        (b.ids?.size ?? 0) - (a.ids?.size ?? 0),
    )
    .map(({ club, ids }, index) => ({
      key: `club:${club.id}`,
      type: "club",
      club,
      label: club.name,
      ids: ids as Set<number>,
      tier: curated ? clubFameTier(club) : tierByRank(index, 30, 80),
    }));
}

function countryCategories(data: GameData): Category[] {
  const byCountry = groupBy(data.players, (player) =>
    player.nationality_code ? [player.nationality_code] : [],
  );
  return [...byCountry]
    .filter(([, ids]) => ids.size >= 10)
    .sort((a, b) => b[1].size - a[1].size)
    .map(([code, ids]) => {
      const info = data.countriesByCode.get(code);
      return {
        key: `country:${code}`,
        type: "country",
        code,
        label: countryName(code, data),
        flag: countryFlag(code, data),
        flagUrls: [
          info?.flag_url,
          `https://flagcdn.com/${code.toLowerCase()}.svg`,
        ].filter((url): url is string => Boolean(url)),
        ids,
        tier: countryFameTier(code),
      };
    });
}

function trophyCategories(data: GameData): Category[] {
  return TROPHY_PICKS.map((trophy) => ({
    key: `trophy:${trophy.id}:${trophy.min}`,
    type: "trophy" as const,
    trophyId: trophy.id,
    min: trophy.min,
    label: trophy.label,
    tier: trophy.tier,
    image: data.trophiesById.get(trophy.id)?.image_url ?? null,
    ids: new Set(
      data.players
        .filter((player) => trophyCount(player, trophy.id) >= trophy.min)
        .map((player) => player.id),
    ),
  })).filter((category) => category.ids.size >= 3);
}

function coachCategories(data: GameData): Category[] {
  if (!data.coaches.length) return [];
  const byCoach = groupBy(data.players, (player) => player.coach_ids ?? []);
  return [...byCoach]
    .filter(([id, ids]) => ids.size >= 5 && data.coachesById.has(id))
    .sort((a, b) => b[1].size - a[1].size)
    .filter(([id], index) => index < 150 || coachFameTier(id) < 3)
    .map(([id, ids]) => {
      const coach = data.coachesById.get(id);
      return {
        key: `coach:${id}`,
        type: "coach" as const,
        coachId: id,
        coach,
        label: coach?.name ?? id,
        photo: coach?.photo_url ?? null,
        ids,
        tier: coachFameTier(id),
      };
    });
}

export function buildCategoryPool(data: GameData, options: { minClubPlayers?: number } = {}): CategoryPool {
  if (data._categoryPool) return data._categoryPool;
  data._categoryPool = {
    club: clubCategories(data, options.minClubPlayers ?? 15),
    country: countryCategories(data),
    trophy: trophyCategories(data),
    coach: coachCategories(data),
  };
  return data._categoryPool;
}

export function conflicts(a: Category, b: Category): boolean {
  if (a.key === b.key) return true;
  if (a.type === "country" && b.type === "country") return true;
  if (a.type === "trophy" && b.type === "trophy" && a.trophyId === b.trophyId) return true;
  return false;
}

export function entityIndex(data: GameData): EntityIndex {
  if (data._entities) return data._entities;
  const clubs: Entity[] = data.clubs
    .filter((club) => data.playersByClub.get(club.id)?.size)
    .map((club) => ({
      key: `club:${club.id}`,
      type: "club",
      club,
      label: club.name,
      image: club.logo_url ?? null,
      short: club.short_name,
      ids: data.playersByClub.get(club.id) as Set<number>,
    }));

  const byCountry = new Map<string, Set<number>>();
  for (const player of data.players) {
    if (!player.nationality_code) continue;
    if (!byCountry.has(player.nationality_code)) byCountry.set(player.nationality_code, new Set());
    byCountry.get(player.nationality_code)?.add(player.id);
  }

  const countries: Entity[] = [...byCountry].map(([code, ids]) => {
    const info = data.countriesByCode.get(code);
    return {
      key: `country:${code}`,
      type: "country",
      code,
      label: countryName(code, data),
      flag: countryFlag(code, data),
      images: [info?.flag_url, `https://flagcdn.com/${code.toLowerCase()}.svg`].filter(
        (url): url is string => Boolean(url),
      ),
      ids,
    };
  });

  const all = [...clubs, ...countries];
  data._entities = {
    clubs,
    countries,
    all,
    byKey: new Map(all.map((entity) => [entity.key, entity])),
  };
  return data._entities;
}

const intersect = (a: Set<number>, b: Set<number>): number[] => {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  const out: number[] = [];
  for (const id of small) if (large.has(id)) out.push(id);
  return out;
};

export function pairProblem(a: Entity | null, b: Entity | null): string | null {
  if (!a || !b) return "missing";
  if (a.key === b.key) return "same";
  if (a.type === "country" && b.type === "country") return "two-countries";
  return null;
}

export interface DifficultyRule {
  firstTier: number;
  maxTier: number;
  minAnswers: number;
}

export const COMMON_DIFFICULTY: Record<string, DifficultyRule> = {
  easy: { firstTier: 1, maxTier: 1, minAnswers: 6 },
  normal: { firstTier: 1, maxTier: 2, minAnswers: 4 },
  hard: { firstTier: 3, maxTier: 3, minAnswers: 1 },
};

export function randomPair(
  data: GameData,
  options: {
    difficulty?: string;
    random: () => number;
    avoid?: Set<string>;
    tries?: number;
  },
): { a: Entity; b: Entity; key: string; answers: number } | null {
  const pool = buildCategoryPool(data);
  const difficulty = options.difficulty ?? "normal";
  const rule = COMMON_DIFFICULTY[difficulty] ?? COMMON_DIFFICULTY.normal;
  const avoid = options.avoid ?? new Set<string>();
  const tries = options.tries ?? 400;
  const random = options.random;

  for (let step = 0; step <= 2; step++) {
    const tier = Math.min(3, rule.maxTier + step);
    const clubs = pool.club.filter((category) => category.tier <= tier);
    const firsts = pool.club.filter((category) => category.tier <= Math.min(3, rule.firstTier + step));
    const countries = pool.country.filter((category) => category.tier <= tier);
    if (clubs.length < 2 || !firsts.length) continue;
    for (let attempt = 0; attempt < tries; attempt++) {
      const a = firsts[Math.floor(random() * firsts.length)];
      const second = random() < 0.4 && countries.length ? countries : clubs;
      const b = second[Math.floor(random() * second.length)];
      if (!a || !b) continue;
      const key = [a.key, b.key].sort().join("|");
      if (avoid.has(key)) continue;
      const n = intersect(a.ids, b.ids).length;
      if (n < Math.max(1, rule.minAnswers - step)) continue;
      const byKey = entityIndex(data).byKey;
      const first = byKey.get(a.key);
      const other = byKey.get(b.key);
      if (!first || !other) continue;
      return { a: first, b: other, key, answers: n };
    }
  }
  return null;
}

export function commonPlayers(
  data: GameData,
  a: Entity,
  b: Entity,
): RawPlayer[] {
  return intersect(a.ids, b.ids)
    .map((id) => data.playersById.get(id))
    .filter((player): player is RawPlayer => Boolean(player))
    .sort(
      (x, y) =>
        (y.market_value?.amount_eur ?? y.market_value?.highest_eur ?? 0) -
        (x.market_value?.amount_eur ?? x.market_value?.highest_eur ?? 0),
    );
}

export const isCommon = (a: Entity, b: Entity, player: RawPlayer): boolean =>
  a.ids.has(player.id) && b.ids.has(player.id);
