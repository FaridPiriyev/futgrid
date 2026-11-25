import { clubFameTier, playerFame } from "./fame";
import { playerRating } from "./rating";
import { countryName } from "./x0xCategories";
import { LEGEND_SQUADS } from "./legendSquads";
import { tr } from "../../i18n";

export const ROUNDS = 11;
export const OPTIONS = 4;
const ERA_STEP = 5;
const FIRST_ERA = 1985;
const LEGEND_SHARE = 0.38;

export const FORMATIONS = {
  "4-3-3": [
    ["GK", "GK", 50, 89],
    ["DF", "LB", 13, 67], ["DF", "CB", 37, 72], ["DF", "CB", 63, 72], ["DF", "RB", 87, 67],
    ["MF", "CM", 22, 46], ["MF", "CM", 50, 50], ["MF", "CM", 78, 46],
    ["FW", "LW", 16, 21], ["FW", "ST", 50, 15], ["FW", "RW", 84, 21],
  ],
  "4-4-2": [
    ["GK", "GK", 50, 89],
    ["DF", "LB", 13, 67], ["DF", "CB", 37, 72], ["DF", "CB", 63, 72], ["DF", "RB", 87, 67],
    ["MF", "LM", 13, 42], ["MF", "CM", 37, 47], ["MF", "CM", 63, 47], ["MF", "RM", 87, 42],
    ["FW", "ST", 34, 17], ["FW", "ST", 66, 17],
  ],
  "3-5-2": [
    ["GK", "GK", 50, 89],
    ["DF", "CB", 24, 70], ["DF", "CB", 50, 73], ["DF", "CB", 76, 70],
    ["MF", "LWB", 11, 45], ["MF", "CM", 31, 51], ["MF", "CAM", 50, 35], ["MF", "CM", 69, 51], ["MF", "RWB", 89, 45],
    ["FW", "ST", 34, 15], ["FW", "ST", 66, 15],
  ],
};

const SIDE_OF = (label, x) => (/^L/.test(label) ? -1 : /^R/.test(label) ? 1 : x < 40 ? -0.5 : x > 60 ? 0.5 : 0);

export const newLineup = (formation) =>
  (FORMATIONS[formation] ?? FORMATIONS["4-3-3"]).map(([pos, label, x, y]) => ({
    pos,
    label,
    x,
    y,
    side: SIDE_OF(label, x),
    pick: null,
  }));

const year = (d) => (d ? Number(String(d).slice(0, 4)) : null);
export const eraLabel = (start) => `${start}–${String(Math.min(start + ERA_STEP - 1, new Date().getFullYear())).slice(2)}`;
export const comboEra = (combo) => combo.eraText ?? eraLabel(combo.era);

const MIN_FAME = { easy: 2.2, normal: 1.4, hard: 0.6 };
const CLUB_TIER = { easy: 1, normal: 2, hard: 3 };

const nameKey = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function nameIndex(data) {
  if (data._u11Names) return data._u11Names;
  const map = new Map();
  for (const p of data.players) {
    const k = nameKey(p.name);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  }
  data._u11Names = map;
  return map;
}

function resolveLegend(data, squad, names) {
  const index = nameIndex(data);
  let best = null;
  let bestScore = -Infinity;
  for (const n of names)
    for (const p of index.get(nameKey(n)) ?? []) {
      let s = 0;
      if (squad.club) s += p.club_history?.includes(squad.club) ? 4 : -10;
      if (squad.nation) s += p.nationality_code === squad.nation ? 4 : -10;
      const by = year(p.birth_date);
      if (by) s += by >= squad.year - 41 && by <= squad.year - 16 ? 2 : -6;
      if (p.photo_url) s += 0.5;
      if (s > bestScore) {
        best = p;
        bestScore = s;
      }
    }
  return bestScore >= 0 ? best : null;
}

const slug = (s) => nameKey(s).replace(/ /g, "-");

const ROLE_POS = { GK: "GK", CB: "DF", LB: "DF", RB: "DF", DF: "DF", MF: "MF", LM: "MF", RM: "MF", FW: "FW", ST: "FW", LW: "FW", RW: "FW" };
const ROLE_SIDE = { GK: 0, CB: 0, LB: -1, RB: 1, MF: 0, LM: -1, RM: 1, ST: 0, LW: -1, RW: 1 };

export function buildLegendCombos(data) {
  if (data._u11Legends) return data._u11Legends;
  const out = [];
  for (const sq of LEGEND_SQUADS) {
    let club;
    if (sq.club) {
      const c = data.clubsById.get(sq.club);
      if (!c) continue;
      club = { ...c, id: `legend:${sq.id}`, baseId: c.id };
    } else {
      const info = data.countriesByCode.get(sq.nation);
      const name = countryName(sq.nation, data);
      club = {
        id: `legend:${sq.id}`,
        name,
        short_name: name,
        logo_url: info?.flag_url ?? `https://flagcdn.com/${sq.nation.toLowerCase()}.svg`,
        nation: sq.nation,
      };
    }
    const players = [];
    for (const line of sq.players) {
      const [role, rating, ...rest] = line.split(" ");
      const pos = ROLE_POS[role];
      if (!pos) continue;
      const [label, nat] = rest.join(" ").split("@");
      const names = label.split("/");
      const found = resolveLegend(data, sq, names);
      const base = found ?? {
        id: `legend:${slug(names[0])}`,
        name: names[0],
        nationality_code: nat ?? sq.nation ?? null,
        stub: true,
      };
      players.push({ ...base, position: pos, role, _rating: Number(rating), _fame: undefined });
    }
    if (players.length < 8) continue;
    out.push({
      key: `legend:${sq.id}`,
      club,
      era: sq.year,
      eraText: sq.season,
      legend: true,
      players,
    });
  }
  data._u11Legends = out;
  return out;
}

export function buildCombos(data, difficulty = "normal") {
  const cacheKey = `_ultimate2_${difficulty}`;
  if (data[cacheKey]) return data[cacheKey];
  const nowYear = new Date().getFullYear();
  const minFame = MIN_FAME[difficulty] ?? MIN_FAME.normal;
  const maxTier = CLUB_TIER[difficulty] ?? 2;
  const map = new Map();

  for (const p of data.players) {
    if (!p.position || !p.club_stints?.length) continue;
    if (playerFame(p) < minFame) continue;
    for (const s of p.club_stints) {
      const club = data.clubsById.get(s.club_id);
      if (!club?.logo_url || clubFameTier(club) > maxTier) continue;
      const from = year(s.from);
      const to = year(s.to) ?? (p.is_active === false ? from : nowYear);
      if (!from || !to || to < FIRST_ERA) continue;
      const first = Math.max(FIRST_ERA, from - ((from - FIRST_ERA) % ERA_STEP));
      for (let e = first; e <= to; e += ERA_STEP) {
        if (Math.min(to, e + ERA_STEP - 1) - Math.max(from, e) < 1) continue;
        const key = `${club.id}|${e}`;
        let combo = map.get(key);
        if (!combo) map.set(key, (combo = { key, club, era: e, players: [] }));
        if (!combo.players.includes(p)) combo.players.push(p);
      }
    }
  }

  const regular = [...map.values()].filter((c) => {
    const pos = new Set(c.players.map((p) => p.position));
    return c.players.length >= 6 && pos.size >= 3;
  });
  for (const c of regular) c.players = c.players.sort((a, b) => playerRating(b) - playerRating(a)).slice(0, 14);
  const combos = [...regular, ...buildLegendCombos(data)];
  data[cacheKey] = combos;
  return combos;
}

const openPositions = (lineup) => new Set(lineup.filter((s) => !s.pick).map((s) => s.pos));
const usedIds = (lineup) => new Set(lineup.filter((s) => s.pick).map((s) => s.pick.player.id));

export const canPlace = (lineup, player) => openPositions(lineup).has(player.position);

function pickWeighted(list, weight, random) {
  let total = 0;
  for (const x of list) total += weight(x);
  let r = random() * total;
  for (const x of list) {
    r -= weight(x);
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

function shuffle(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const fitting = (combo, lineup) => {
  const used = usedIds(lineup);
  const open = openPositions(lineup);
  return combo.players.filter((p) => !used.has(p.id) && open.has(p.position));
};

function drawOptions(combo, lineup, random) {
  const pool = fitting(combo, lineup);
  const out = [];
  const byPos = new Map();
  for (const p of pool) {
    if (!byPos.has(p.position)) byPos.set(p.position, []);
    byPos.get(p.position).push(p);
  }
  const weight = (p) => Math.max(1, playerRating(p) - 60);
  for (const list of shuffle([...byPos.values()], random)) {
    if (out.length >= Math.min(2, OPTIONS)) break;
    out.push(pickWeighted(list, weight, random));
  }
  while (out.length < OPTIONS && out.length < pool.length) {
    const rest = pool.filter((p) => !out.includes(p));
    out.push(pickWeighted(rest, weight, random));
  }
  return shuffle(out, random);
}

export function spin(combos, lineup, random, { avoid } = {}) {
  const skip = avoid instanceof Set ? avoid : new Set(avoid ? [avoid] : []);
  const scored = combos
    .filter((c) => !skip.has(c.key))
    .map((c) => ({ c, n: fitting(c, lineup).length }))
    .filter((x) => x.n > 0);
  if (!scored.length) return null;
  const need = Math.min(OPTIONS, Math.max(...scored.map((x) => x.n)));
  let list = scored.filter((x) => x.n >= Math.min(need, 3));
  if (!list.length) list = scored;
  const legends = list.filter((x) => x.c.legend);
  const regular = list.filter((x) => !x.c.legend);
  const pool = legends.length && (!regular.length || random() < LEGEND_SHARE) ? legends : regular;
  const { c: combo } = pickWeighted(pool, (x) => Math.sqrt(x.c.players.length), random);
  return { combo, options: drawOptions(combo, lineup, random) };
}

export function bestSlot(lineup, player) {
  const roleSide = player.role ? ROLE_SIDE[player.role] : undefined;
  const foot = player.preferred_foot === "left" ? -1 : player.preferred_foot === "right" ? 1 : 0;
  const h = player.height_cm ?? 0;
  const wide = player.position === "DF" && h ? (h <= 180 ? 2.5 : h >= 185 ? -1 : 0) : 0;
  let best = -1;
  let bestScore = -Infinity;
  lineup.forEach((s, i) => {
    if (s.pick || s.pos !== player.position) return;
    let score;
    if (roleSide !== undefined) score = -Math.abs(s.side - roleSide) * 3;
    else {
      score = -Math.abs(s.side) * 2 + (s.side ? wide : 0);
      if (foot && s.side) score += Math.sign(s.side) === foot ? 1.5 : -0.5;
    }
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

export function place(lineup, player, combo, slotIndex = null) {
  const idx = slotIndex ?? bestSlot(lineup, player);
  if (idx < 0 || lineup[idx].pick || lineup[idx].pos !== player.position) return lineup;
  const next = [...lineup];
  next[idx] = {
    ...next[idx],
    pick: { player, rating: playerRating(player), club: combo.club, era: combo.era, eraText: comboEra(combo), legend: Boolean(combo.legend) },
  };
  return next;
}

export function swapSlots(lineup, a, b) {
  if (a === b || lineup[a]?.pos !== lineup[b]?.pos) return lineup;
  const next = [...lineup];
  next[a] = { ...lineup[a], pick: lineup[b].pick };
  next[b] = { ...lineup[b], pick: lineup[a].pick };
  return next;
}

export const isComplete = (lineup) => lineup.every((s) => s.pick);

export function teamScore(lineup) {
  const picks = lineup.filter((s) => s.pick).map((s) => s.pick);
  if (!picks.length) return { overall: 0, avg: 0, chem: 0, links: [] };
  const avg = picks.reduce((s, p) => s + p.rating, 0) / picks.length;
  const links = [];
  let chem = 0;
  for (let i = 0; i < picks.length; i++)
    for (let j = i + 1; j < picks.length; j++) {
      const a = picks[i];
      const b = picks[j];
      if (a.club.id === b.club.id && a.era === b.era) {
        chem += 0.75;
        links.push({ a, b, type: "club" });
      } else if (a.player.nationality_code && a.player.nationality_code === b.player.nationality_code) {
        chem += 0.25;
        links.push({ a, b, type: "country" });
      }
    }
  chem = Math.round(Math.min(5, chem) * 10) / 10;
  return { overall: Math.min(99, Math.round(avg + chem)), avg: Math.round(avg * 10) / 10, chem, links };
}

export function verdict(overall) {
  if (overall >= 90) return tr("Əfsanəvi komanda!");
  if (overall >= 86) return tr("Dünya klassı");
  if (overall >= 82) return tr("Çempionlar Liqası səviyyəsi");
  if (overall >= 78) return tr("Güclü komanda");
  return tr("Yaxşı başlanğıc — yenə cəhd et");
}
