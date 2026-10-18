export const CATEGORY_TYPES = [
  { key: "club", label: "Klublar", locked: true },
  { key: "country", label: "Ölkələr" },
  { key: "trophy", label: "Kuboklar" },
  { key: "coach", label: "Məşqçilər" },
];

const TROPHY_PICKS = [
  { id: "ucl", min: 1, label: "Çempionlar Liqası", tier: 1 },
  { id: "world_cup", min: 1, label: "Dünya Kuboku", tier: 1 },
  { id: "euro", min: 1, label: "Avropa Çempionatı", tier: 1 },
  { id: "copa_america", min: 1, label: "Kopa Amerika", tier: 1 },
  { id: "ballon_dor", min: 1, label: "Qızıl Top", tier: 1 },
  { id: "premier_league", min: 1, label: "Premyer Liqa", tier: 1 },
  { id: "la_liga", min: 1, label: "La Liga", tier: 1 },
  { id: "bundesliga", min: 1, label: "Bundesliqa", tier: 1 },
  { id: "serie_a", min: 1, label: "Serie A", tier: 1 },
  { id: "ligue_1", min: 1, label: "Liqa 1", tier: 1 },
  { id: "ucl", min: 2, label: "Çempionlar Liqası", tier: 2 },
  { id: "europa_league", min: 1, label: "Avropa Liqası", tier: 2 },
  { id: "club_world_cup", min: 1, label: "Klublararası DÇ", tier: 2 },
  { id: "uefa_super_cup", min: 1, label: "UEFA Superkuboku", tier: 2 },
  { id: "nations_league", min: 1, label: "Millətlər Liqası", tier: 2 },
  { id: "golden_boy", min: 1, label: "Qızıl Oğlan", tier: 2 },
  { id: "eredivisie", min: 1, label: "Eredivisie", tier: 2 },
  { id: "primeira_liga", min: 1, label: "Primeyra Liqa", tier: 2 },
  { id: "conference_league", min: 1, label: "Konfrans Liqası", tier: 3 },
  { id: "fa_cup", min: 1, label: "İngiltərə Kuboku", tier: 3 },
  { id: "copa_del_rey", min: 1, label: "İspaniya Kuboku", tier: 3 },
  { id: "dfb_pokal", min: 1, label: "Almaniya Kuboku", tier: 3 },
  { id: "coppa_italia", min: 1, label: "İtaliya Kuboku", tier: 3 },
  { id: "coupe_de_france", min: 1, label: "Fransa Kuboku", tier: 3 },
  { id: "super_lig", min: 1, label: "Süper Liq", tier: 3 },
  {
    id: "scottish_premiership",
    min: 1,
    label: "Şotlandiya çempionatı",
    tier: 3,
  },
  { id: "saudi_pro_league", min: 1, label: "Səudiyyə Pro Liqası", tier: 3 },
  { id: "mls_cup", min: 1, label: "MLS Kuboku", tier: 3 },
  { id: "golden_shoe", min: 1, label: "Qızıl Buts", tier: 3 },
];

const SPECIAL_COUNTRIES = {
  "GB-ENG": {
    name: "İngiltərə",
    flag: "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  },
  "GB-SCT": {
    name: "Şotlandiya",
    flag: "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  },
  "GB-WLS": {
    name: "Uels",
    flag: "🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
  },
  "GB-NIR": { name: "Şimali İrlandiya", flag: "🇬🇧" },
};

let regionNames = null;
export function countryName(code, data) {
  const c = data?.countriesByCode?.get(code);
  if (c) return c.name;
  if (SPECIAL_COUNTRIES[code]) return SPECIAL_COUNTRIES[code].name;
  try {
    regionNames ??= new Intl.DisplayNames(["az", "en"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryFlag(code, data) {
  const c = data?.countriesByCode?.get(code);
  if (c?.flag) return c.flag;
  if (SPECIAL_COUNTRIES[code]) return SPECIAL_COUNTRIES[code].flag;
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

const trophyCount = (p, id) => p.trophies?.find((t) => t.id === id)?.count ?? 0;

const tierByRank = (rank, easy, normal) =>
  rank < easy ? 1 : rank < normal ? 2 : 3;

const groupBy = (players, keysOf) => {
  const map = new Map();
  for (const p of players) {
    for (const k of keysOf(p)) {
      if (!map.has(k)) map.set(k, new Set());
      map.get(k).add(p.id);
    }
  }
  return map;
};

function clubCategories(data, minPlayers) {
  const value = new Map();
  for (const p of data.players) {
    if (!p.current_club_id || p.is_active === false) continue;
    value.set(
      p.current_club_id,
      (value.get(p.current_club_id) ?? 0) + (p.market_value?.amount_eur ?? 0),
    );
  }
  return data.clubs
    .map((c) => ({ c, ids: data.playersByClub.get(c.id) }))
    .filter(({ ids }) => ids && ids.size >= minPlayers)
    .sort(
      (a, b) =>
        (value.get(b.c.id) ?? 0) - (value.get(a.c.id) ?? 0) ||
        b.ids.size - a.ids.size,
    )
    .map(({ c, ids }, i) => ({
      key: `club:${c.id}`,
      type: "club",
      club: c,
      label: c.name,
      ids,
      tier: tierByRank(i, 30, 80),
    }));
}

function countryCategories(data) {
  const byCountry = groupBy(data.players, (p) =>
    p.nationality_code ? [p.nationality_code] : [],
  );
  return [...byCountry]
    .filter(([, ids]) => ids.size >= 10)
    .sort((a, b) => b[1].size - a[1].size)
    .map(([code, ids], i) => {
      const info = data.countriesByCode.get(code);
      const tier = info?.fifa_rank
        ? info.fifa_rank <= 40
          ? 1
          : info.fifa_rank <= 100
            ? 2
            : 3
        : tierByRank(i, 25, 60);
      return {
        key: `country:${code}`,
        type: "country",
        code,
        label: countryName(code, data),
        flag: countryFlag(code, data),
        flagUrls: [
          info?.flag_url,
          `https://flagcdn.com/${code.toLowerCase()}.svg`,
        ].filter(Boolean),
        ids,
        tier,
      };
    });
}

function trophyCategories(data) {
  return TROPHY_PICKS.map((t) => ({
    key: `trophy:${t.id}:${t.min}`,
    type: "trophy",
    trophyId: t.id,
    min: t.min,
    label: t.label,
    tier: t.tier,
    image: data.trophiesById.get(t.id)?.image_url ?? null,
    ids: new Set(
      data.players
        .filter((p) => trophyCount(p, t.id) >= t.min)
        .map((p) => p.id),
    ),
  })).filter((c) => c.ids.size >= 3);
}

function coachCategories(data) {
  if (!data.coaches.length) return [];
  const byCoach = groupBy(data.players, (p) => p.coach_ids ?? []);
  return [...byCoach]
    .filter(([id, ids]) => ids.size >= 5 && data.coachesById.has(id))
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 150)
    .map(([id, ids], i) => {
      const coach = data.coachesById.get(id);
      return {
        key: `coach:${id}`,
        type: "coach",
        coachId: id,
        coach,
        label: coach.name,
        sub: "ilə işləyib",
        photo: coach.photo_url ?? null,
        ids,
        tier: tierByRank(i, 20, 60),
      };
    });
}

export function buildCategoryPool(data, { minClubPlayers = 15 } = {}) {
  if (data._categoryPool) return data._categoryPool;
  data._categoryPool = {
    club: clubCategories(data, minClubPlayers),
    country: countryCategories(data),
    trophy: trophyCategories(data),
    coach: coachCategories(data),
  };
  return data._categoryPool;
}

export function conflicts(a, b) {
  if (a.key === b.key) return true;
  if (a.type === "country" && b.type === "country") return true;
  if (a.type === "trophy" && b.type === "trophy" && a.trophyId === b.trophyId)
    return true;
  return false;
}
