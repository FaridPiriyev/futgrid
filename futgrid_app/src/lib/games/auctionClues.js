import winners from "../../data/trophy-winners.json";
import { clubFameTier, countryFameTier } from "./fame";
import { countryName } from "./x0xCategories";
import { playerRating } from "./rating";
import { tr } from "../../i18n";

const POSITIONS = ["GK", "DF", "MF", "FW"];
const MIN_CANDIDATES = 3;

const TROPHY_LABEL = {
  get ucl() {
    return tr("Çempionlar Liqası");
  },
  get europa_league() {
    return tr("Avropa Liqası");
  },
  get premier_league() {
    return tr("Premyer Liqa");
  },
  get la_liga() {
    return tr("La Liga");
  },
  get serie_a() {
    return tr("Serie A");
  },
  get bundesliga() {
    return tr("Bundesliqa");
  },
  get ligue_1() {
    return tr("Liqa 1");
  },
  get world_cup() {
    return tr("Dünya Kuboku");
  },
  get euro() {
    return tr("Avropa Çempionatı");
  },
  get copa_america() {
    return tr("Kopa Amerika");
  },
};
const CLUB_TROPHIES = ["ucl", "europa_league", "premier_league", "la_liga", "serie_a", "bundesliga", "ligue_1"];
const NATION_TROPHIES = ["world_cup", "euro", "copa_america"];

const trophyCount = (p, id) => p.trophies?.find((t) => t.id === id)?.count ?? 0;
const DAY = 86400000;
const time = (s) => (s ? new Date(s).getTime() : NaN);

function wasAt(p, clubId, when) {
  for (const s of p.club_stints ?? []) {
    if (s.club_id !== clubId) continue;
    const from = time(s.from);
    const to = s.to ? time(s.to) : Date.now();
    if (from - 60 * DAY <= when && when <= to + 200 * DAY) return true;
  }
  return false;
}

const eligible = (p) =>
  p.position &&
  POSITIONS.includes(p.position) &&
  Math.max(p.market_value?.highest_eur ?? 0, p.market_value?.amount_eur ?? 0) >= 2e6;

function seasonsWon(trophyId, slugOrCode) {
  const t = winners.trophies?.[trophyId];
  if (!t) return [];
  const [mm, dd] = (t.end ?? "05-30").split("-");
  return Object.entries(t.seasons)
    .filter(([, w]) => w === slugOrCode)
    .map(([season]) => {
      const year = Number(season.slice(0, 4)) + (season.includes("-") ? 1 : 0);
      return new Date(`${year}-${mm}-${dd}`).getTime();
    });
}

export function buildClueIndex(data) {
  if (data._auctionClues) return data._auctionClues;
  const players = data.players.filter(eligible);
  const clues = [];
  const add = (key, label, list, weight) => {
    const byPos = {};
    for (const p of list) (byPos[p.position] ??= []).push(p.id);
    clues.push({ key, label, byPos, weight });
  };

  const famousClubs = data.clubs.filter((c) => clubFameTier(c) === 1);
  const clubName = (c) => c.name;

  for (const c of famousClubs) {
    for (const trophyId of CLUB_TROPHIES) {
      const dates = seasonsWon(trophyId, c.slug);
      if (!dates.length) continue;
      const list = players.filter(
        (p) => trophyCount(p, trophyId) > 0 && dates.some((d) => wasAt(p, c.id, d)),
      );
      if (list.length >= MIN_CANDIDATES)
        add(
          `wonwith:${c.id}:${trophyId}`,
          () => tr("{club} ilə {trophy} qazanıb", { club: clubName(c), trophy: TROPHY_LABEL[trophyId] }),
          list,
          trophyId === "ucl" ? 3 : 2,
        );
    }
  }

  for (const trophyId of NATION_TROPHIES) {
    const codes = new Set(Object.values(winners.trophies?.[trophyId]?.seasons ?? {}));
    for (const code of codes) {
      const list = players.filter((p) => p.nationality_code === code && trophyCount(p, trophyId) > 0);
      if (list.length >= MIN_CANDIDATES)
        add(
          `nation:${code}:${trophyId}`,
          () => tr("{country} millisi ilə {trophy} qazanıb", { country: countryName(code, data), trophy: TROPHY_LABEL[trophyId] }),
          list,
          3,
        );
    }
  }

  {
    const list = players.filter((p) => trophyCount(p, "ballon_dor") > 0);
    if (list.length >= MIN_CANDIDATES) add("ballon", () => tr("Qızıl Top qazanıb"), list, 2);
  }

  for (let i = 0; i < famousClubs.length; i++)
    for (let j = i + 1; j < famousClubs.length; j++) {
      const a = famousClubs[i];
      const b = famousClubs[j];
      const list = players.filter((p) => p.club_history?.includes(a.id) && p.club_history?.includes(b.id));
      if (list.length >= MIN_CANDIDATES)
        add(`pair:${a.id}:${b.id}`, () => tr("Həm {a}, həm də {b} klubunda oynayıb", { a: clubName(a), b: clubName(b) }), list, 1);
    }

  const famousCountries = [...new Set(players.map((p) => p.nationality_code))].filter(
    (code) => code && countryFameTier(code) === 1,
  );
  for (const c of famousClubs)
    for (const code of famousCountries) {
      const list = players.filter((p) => p.nationality_code === code && p.club_history?.includes(c.id));
      if (list.length >= MIN_CANDIDATES)
        add(
          `cc:${c.id}:${code}`,
          () => tr("{country} vətəndaşı, {club} klubunda oynayıb", { country: countryName(code, data), club: clubName(c) }),
          list,
          1,
        );
    }

  data._auctionClues = clues;
  return clues;
}

export function pickClue(data, pos, used, random) {
  const options = buildClueIndex(data)
    .map((c) => ({ c, ids: (c.byPos[pos] ?? []).filter((id) => !used.has(id)) }))
    .filter(({ ids }) => ids.length >= MIN_CANDIDATES);
  if (!options.length) return null;
  const total = options.reduce((s, o) => s + o.c.weight, 0);
  let r = random() * total;
  let pick = options[0];
  for (const o of options) {
    r -= o.c.weight;
    if (r < 0) {
      pick = o;
      break;
    }
  }
  const player = data.playersById.get(pick.ids[Math.floor(random() * pick.ids.length)]);
  const ratings = pick.ids.map((id) => playerRating(data.playersById.get(id)));
  const expected = Math.round(ratings.reduce((s, x) => s + x, 0) / ratings.length);
  return {
    player,
    clue: { key: pick.c.key, label: pick.c.label, count: pick.ids.length, best: Math.max(...ratings) },
    expected,
  };
}
