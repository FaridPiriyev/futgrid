// Ultimate 11: hər raundda KOMANDA (klub) + DÖVR (5 illik) barabanı fırlanır,
// həmin klubda həmin dövrdə oynamış 4 futbolçudan biri heyətə seçilir.
import { clubFameTier, playerFame } from "./fame";
import { playerRating } from "./rating";
import { tr } from "../../i18n";

export const ROUNDS = 11;
export const OPTIONS = 4;
const ERA_STEP = 5;
const FIRST_ERA = 1985;

// Meydançada yerlər (x, y faizlə; y=0 rəqib qapısı tərəfi)
export const FORMATIONS = {
  "4-3-3": [
    ["GK", "GK", 50, 88],
    ["DF", "LB", 13, 66], ["DF", "CB", 37, 71], ["DF", "CB", 63, 71], ["DF", "RB", 87, 66],
    ["MF", "CM", 24, 45], ["MF", "CM", 50, 49], ["MF", "CM", 76, 45],
    ["FW", "LW", 17, 20], ["FW", "ST", 50, 14], ["FW", "RW", 83, 20],
  ],
  "4-4-2": [
    ["GK", "GK", 50, 88],
    ["DF", "LB", 13, 66], ["DF", "CB", 37, 71], ["DF", "CB", 63, 71], ["DF", "RB", 87, 66],
    ["MF", "LM", 13, 42], ["MF", "CM", 37, 47], ["MF", "CM", 63, 47], ["MF", "RM", 87, 42],
    ["FW", "ST", 35, 16], ["FW", "ST", 65, 16],
  ],
  "3-5-2": [
    ["GK", "GK", 50, 88],
    ["DF", "CB", 24, 69], ["DF", "CB", 50, 72], ["DF", "CB", 76, 69],
    ["MF", "LWB", 9, 45], ["MF", "CM", 31, 50], ["MF", "CAM", 50, 36], ["MF", "CM", 69, 50], ["MF", "RWB", 91, 45],
    ["FW", "ST", 35, 15], ["FW", "ST", 65, 15],
  ],
};

export const newLineup = (formation) =>
  (FORMATIONS[formation] ?? FORMATIONS["4-3-3"]).map(([pos, label, x, y]) => ({
    pos,
    label,
    x,
    y,
    pick: null,
  }));

const year = (d) => (d ? Number(String(d).slice(0, 4)) : null);
export const eraLabel = (start) => `${start}–${String(start + ERA_STEP - 1).slice(2)}`;

const MIN_FAME = { easy: 2.2, normal: 1.4, hard: 0.6 };
const CLUB_TIER = { easy: 1, normal: 2, hard: 3 };

// Klub+dövr kombinasiyaları: ən azı 6 oyunçu və 3 fərqli mövqe olanlar.
export function buildCombos(data, difficulty = "normal") {
  const cacheKey = `_ultimate_${difficulty}`;
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
        // dövrdə ən azı 1 tam mövsüm
        if (Math.min(to, e + ERA_STEP - 1) - Math.max(from, e) < 1) continue;
        const key = `${club.id}|${e}`;
        let combo = map.get(key);
        if (!combo) map.set(key, (combo = { key, club, era: e, players: [] }));
        if (!combo.players.includes(p)) combo.players.push(p);
      }
    }
  }

  const combos = [...map.values()].filter((c) => {
    const pos = new Set(c.players.map((p) => p.position));
    return c.players.length >= 6 && pos.size >= 3;
  });
  for (const c of combos) c.players.sort((a, b) => playerRating(b) - playerRating(a));
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

// Kombinasiyadan 4 seçim: ən azı biri boş mövqeyə uyğun olur.
function drawOptions(combo, lineup, random, star = false) {
  const used = usedIds(lineup);
  const open = openPositions(lineup);
  const pool = combo.players.filter((p) => !used.has(p.id)).slice(0, 14);
  const out = [];
  if (star && pool.length) out.push(pool[0]);
  while (out.length < OPTIONS && out.length < pool.length) {
    const rest = pool.filter((p) => !out.includes(p));
    out.push(pickWeighted(rest, (p) => Math.max(1, playerRating(p) - 60), random));
  }
  if (!out.some((p) => open.has(p.position))) {
    const fit = pool.find((p) => open.has(p.position) && !out.includes(p));
    if (fit) out[out.length - 1] = fit;
  }
  return out.sort((a, b) => playerRating(b) - playerRating(a));
}

const comboFits = (combo, lineup) => {
  const used = usedIds(lineup);
  const open = openPositions(lineup);
  return combo.players.some((p) => !used.has(p.id) && open.has(p.position));
};

export function spin(combos, lineup, random, { club, era, avoid } = {}) {
  const narrow = (l, f) => {
    const n = l.filter(f);
    return n.length ? n : l;
  };
  let list = combos.filter((c) => comboFits(c, lineup) && c.key !== avoid);
  if (club) list = narrow(list, (c) => c.club.id === club);
  if (era) list = narrow(list, (c) => c.era === era);
  if (!list.length) list = combos.filter((c) => comboFits(c, lineup));
  if (!list.length) return null;
  const combo = pickWeighted(list, (c) => Math.sqrt(c.players.length), random);
  return { combo, options: drawOptions(combo, lineup, random) };
}

// Komandanı yenilə: eyni dövr, başqa klub. Dövrü yenilə: eyni klub, başqa dövr.
export function reroll(combos, round, lineup, random, what) {
  const { combo } = round;
  const opts =
    what === "club"
      ? { era: combo.era, avoid: combo.key }
      : { club: combo.club.id, avoid: combo.key };
  const strict = combos.filter(
    (c) =>
      c.key !== combo.key &&
      comboFits(c, lineup) &&
      (what === "club" ? c.era === combo.era : c.club.id === combo.club.id),
  );
  if (strict.length) {
    const next = pickWeighted(strict, (c) => Math.sqrt(c.players.length), random);
    return { combo: next, options: drawOptions(next, lineup, random) };
  }
  return spin(combos, lineup, random, { avoid: opts.avoid });
}

export const starOptions = (round, lineup, random) => ({
  ...round,
  options: drawOptions(round.combo, lineup, random, true),
  star: true,
});

export function place(lineup, player, combo, slotIndex = null) {
  const idx =
    slotIndex ?? lineup.findIndex((s) => !s.pick && s.pos === player.position);
  if (idx < 0 || lineup[idx].pick || lineup[idx].pos !== player.position) return lineup;
  const next = [...lineup];
  next[idx] = {
    ...next[idx],
    pick: { player, rating: playerRating(player), club: combo.club, era: combo.era },
  };
  return next;
}

export const removeAt = (lineup, idx) =>
  lineup.map((s, i) => (i === idx ? { ...s, pick: null } : s));

export const isComplete = (lineup) => lineup.every((s) => s.pick);

// Komanda reytinqi: orta reytinq + kimya (eyni klub+dövr +0.75, eyni ölkə +0.25; maks +5)
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

export const POWERS = ["club", "era", "star", "trade", "double"];
export const freshPowers = () => Object.fromEntries(POWERS.map((k) => [k, 1]));
