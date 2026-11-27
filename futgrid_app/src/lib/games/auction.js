import { playerRating } from "./rating";
import { pickClue } from "./auctionClues";

import { tr } from "../../i18n";
export const POS_ORDER = ["GK", "DF", "MF", "FW"];
export const TEAM_SIZE = 5;
export const DEFAULT_FORMATION = { GK: 1, DF: 1, MF: 1, FW: 2 };

export const ANY = "ANY";
export const FREE_FORMATION = { ANY: TEAM_SIZE };
export const isFree = (f) => Number(f?.ANY) === TEAM_SIZE;
export const formationTotal = (f) =>
  isFree(f) ? TEAM_SIZE : POS_ORDER.reduce((s, pos) => s + Math.max(0, Number(f?.[pos]) || 0), 0);
export const validFormation = (f) => formationTotal(f) === TEAM_SIZE;
export const formationSlots = (f) =>
  isFree(f)
    ? Array(TEAM_SIZE).fill(ANY)
    : POS_ORDER.flatMap((pos) =>
        Array(Math.max(0, Number((validFormation(f) ? f : DEFAULT_FORMATION)[pos]) || 0)).fill(pos),
      );
const fits = (slot, pos) => slot.pos === pos || slot.pos === ANY;

export const SLOTS = formationSlots(DEFAULT_FORMATION);

const LINE_Y = { GK: 86, DF: 64, MF: 41, FW: 16 };
export function pitchSpots(positions) {
  const total = {};
  for (const pos of positions) total[pos] = (total[pos] ?? 0) + 1;
  const seen = {};
  return positions.map((pos) => {
    const n = total[pos];
    const i = (seen[pos] = (seen[pos] ?? -1) + 1);
    const x = ((i + 1) / (n + 1)) * 100;
    const stagger = n >= 4 ? (i % 2 ? 7 : -6) : 0;
    return [x, Math.max(8, Math.min(90, (LINE_Y[pos] ?? 41) + stagger))];
  });
}
export const BUDGET = 40;
export const MIN_BID = 2;
export const MAX_LOTS = 30;
export const SOLD_MS = 1700;
/** Automatic sales: the card is shown alone for this long before the "Avtomatik" stamp lands. */
export const AUTO_REVEAL_MS = 1300;
export const SIDE_KEYS = ["A", "B"];

export const TIERS = [
  { min: 89, key: "star", get label() {
    return tr("Ulduz");
  }, start: 4 },
  { min: 85, key: "good", get label() {
    return tr("Yaxşı");
  }, start: 2 },
  { min: 0, key: "base", get label() {
    return tr("Adi");
  }, start: 1 },
];

const POOL_SIZES = {
  stars: { GK: 30, DF: 70, MF: 70, FW: 80 },
  wide: { GK: 120, DF: 300, MF: 300, FW: 320 },
};

export const money = (halves) => {
  const v = halves / 2;
  return `${Number.isInteger(v) ? v : v.toFixed(1)} ₼`;
};

export const tierOf = (rating) => TIERS.find((t) => rating >= t.min);

export function buildPool(data, key, { mystery = false } = {}) {
  const sizes = POOL_SIZES[key] ?? POOL_SIZES.stars;
  const by = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of data.players) {
    if (p.is_active === false || !by[p.position]) continue;
    if (!(p.market_value?.amount_eur > 0)) continue;
    by[p.position].push(p);
  }
  for (const pos of Object.keys(by))
    by[pos] = by[pos]
      .sort(
        (a, b) =>
          playerRating(b) - playerRating(a) ||
          b.market_value.amount_eur - a.market_value.amount_eur,
      )
      .slice(0, sizes[pos]);
  if (mystery) Object.defineProperty(by, "mystery", { value: data, enumerable: false });
  return by;
}

export const newTeam = (formation) => ({
  money: BUDGET,
  slots: formationSlots(formation).map((pos) => ({ pos, pick: null })),
});

export const openCount = (team, pos) =>
  team.slots.filter((s) => !s.pick && (!pos || fits(s, pos))).length;

export const slotPos = (s) => (s.pos === ANY ? s.pick?.player?.position ?? ANY : s.pos);

export const isFull = (team) => openCount(team) === 0;

export function maxBid(team) {
  return openCount(team) ? team.money : -1;
}

export const otherSide = (side) => (side === "A" ? "B" : "A");
export const isBroke = (team) => openCount(team) > 0 && team.money <= 0;
const canBuy = (team) => openCount(team) > 0 && team.money > 0;

export function deciderOf(teams) {
  for (const side of SIDE_KEYS) {
    const other = otherSide(side);
    if (canBuy(teams[side]) && isBroke(teams[other])) return side;
  }
  return null;
}

export const takePrice = (lot, team) => Math.min(lot.start, team.money);

export function decideOptions(state) {
  const { lot, teams, phase } = state;
  if (phase !== "decide" || !lot) return { take: false, give: false, skip: false };
  const d = lot.decider;
  const take = openCount(teams[d], lot.pos) > 0;
  const give = openCount(teams[otherSide(d)], lot.pos) > 0;
  return { take, give, skip: !give };
}

export const nextPrice = (lot) => (lot.leader ? lot.price + 1 : MIN_BID);

export function canBid(state, side) {
  const { lot, teams, phase } = state;
  if (phase !== "bid" || !lot) return false;
  if (lot.passed[side] || lot.leader === side) return false;
  if (!lot.leader && side !== lot.opener) return false;
  const team = teams[side];
  return openCount(team, lot.pos) > 0 && maxBid(team) >= nextPrice(lot);
}

export const canPass = (state, side) =>
  state.phase === "bid" && Boolean(state.lot?.leader) && state.lot.leader !== side && !state.lot.passed[side];

export function bidAmount(lot, inc) {
  return lot.leader ? lot.price + inc : MIN_BID * inc;
}

const fairPrice = (rating) =>
  1 + 19 * Math.max(0, (rating - 70) / 24) ** 2;

const NOISE = {
  easy: [0.55, 1.05],
  normal: [0.85, 1.15],
  hard: [0.95, 1.15],
};

export function botLimit(lot, team, difficulty, random) {
  if (!openCount(team, lot.pos)) return 0;
  const cap = maxBid(team);
  const slotsLeft = openCount(team);
  const perSlot = team.money / slotsLeft;
  let w =
    fairPrice(lot.expected ?? lot.rating) * Math.min(2, Math.max(0.5, (perSlot / 8) ** 0.7));
  if (slotsLeft === 1 && difficulty !== "easy")
    w = Math.max(w, cap * ((lot.expected ?? lot.rating) >= 80 ? 1 : 0.7));
  const [lo, hi] = NOISE[difficulty] ?? NOISE.normal;
  w *= lo + random() * (hi - lo);
  return Math.max(0, Math.min(cap, Math.floor(w)));
}

function pickLot(pool, teams, used, random) {
  const weightsFor = (sides) => {
    const weights = {};
    const FREE_W = { GK: 1, DF: 3, MF: 3, FW: 3 };
    for (const pos of POS_ORDER) {
      if (!sides.every((side) => openCount(teams[side], pos) > 0)) continue;
      let w = 0;
      for (const side of sides)
        for (const s of teams[side].slots) {
          if (s.pick) continue;
          if (s.pos === ANY) w += FREE_W[pos] / 10;
          else if (s.pos === pos) w += 1;
        }
      if (w > 0) weights[pos] = w;
    }
    return weights;
  };
  let weights = weightsFor(SIDE_KEYS);
  if (!Object.keys(weights).length)
    weights = Object.assign({}, ...SIDE_KEYS.map((side) => weightsFor([side])));
  const options = Object.entries(weights).filter(([pos]) =>
    pool[pos].some((p) => !used.has(p.id)),
  );
  if (!options.length) return null;
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = random() * total;
  let pos = options[0][0];
  for (const [p, w] of options) {
    r -= w;
    if (r < 0) {
      pos = p;
      break;
    }
  }
  if (pool.mystery) {
    const hit = pickClue(pool.mystery, pos, used, random);
    if (hit) {
      const rating = playerRating(hit.player);
      return { player: hit.player, pos, rating, tier: tierOf(hit.expected), start: MIN_BID, clue: hit.clue, expected: hit.expected };
    }
  }
  const free = pool[pos].filter((p) => !used.has(p.id));
  const player = free[Math.floor(random() * free.length)];
  const rating = playerRating(player);
  const tier = tierOf(rating);
  return { player, pos, rating, tier, start: MIN_BID };
}

function autofill(state, pool, random) {
  const used = new Set(state.used);
  const teams = {};
  const log = [...state.log];
  for (const side of SIDE_KEYS) {
    const team = state.teams[side];
    let cash = team.money;
    const slots = team.slots.map((s) => {
      if (s.pick) return s;
      const pos = s.pos === ANY ? ["DF", "MF", "FW"][Math.floor(random() * 3)] : s.pos;
      const free = pool[pos].filter((p) => !used.has(p.id));
      const tail = free.slice(-Math.max(3, Math.floor(free.length * 0.15)));
      const list = tail.length ? tail : free;
      const player = list[Math.floor(random() * list.length)];
      if (!player) return s;
      used.add(player.id);
      const price = cash >= 1 ? 1 : 0;
      cash -= price;
      log.push({ player, winner: side, price, auto: true });
      return {
        ...s,
        pick: { player, rating: playerRating(player), price, auto: true },
      };
    });
    teams[side] = { money: cash, slots };
  }
  return { ...state, teams, used, log, lot: null, phase: "done" };
}

export function openLot(state, pool, random, now, timerMs) {
  if (SIDE_KEYS.every((s) => isFull(state.teams[s])))
    return { ...state, lot: null, phase: "done" };
  const info =
    state.lotNo < MAX_LOTS ? pickLot(pool, state.teams, state.used, random) : null;
  if (!info) return autofill(state, pool, random);
  const used = new Set(state.used);
  used.add(info.player.id);
  const takers = SIDE_KEYS.filter((side) => openCount(state.teams[side], info.pos) > 0);
  const turn = state.nextOpener ?? "A";
  const opener = takers.includes(turn) ? turn : takers[0];
  const lot = {
    ...info,
    id: `${state.lotNo + 1}-${info.player.id}`,
    price: 0,
    leader: null,
    opener,
    decider: null,
    passed: { A: false, B: false },
    history: [],
  };
  const next = {
    ...state,
    used,
    lotNo: state.lotNo + 1,
    nextOpener: otherSide(turn),
    phase: "bid",
    outcome: null,
    deadline: now + timerMs,
    lot,
  };
  if (takers.length === 1) return assign(next, opener, Math.min(MIN_BID, state.teams[opener].money), now, { auto: true });
  if (state.teams[opener].money < MIN_BID) return openWith(next, opener, state.teams[opener].money, now, timerMs);
  return next;
}

function openWith(state, side, amount, now, timerMs) {
  return {
    ...state,
    deadline: now + timerMs,
    lot: { ...state.lot, price: amount, leader: side, history: [{ side, amount, auto: true }, ...state.lot.history] },
  };
}

export function newGame(pool, random, now, timerMs, formation) {
  return openLot(
    {
      teams: { A: newTeam(formation), B: newTeam(formation) },
      used: new Set(),
      lotNo: 0,
      lot: null,
      phase: "bid",
      outcome: null,
      deadline: 0,
      log: [],
    },
    pool,
    random,
    now,
    timerMs,
  );
}

export function placeBid(state, side, inc, now, timerMs) {
  if (!canBid(state, side)) return state;
  return placeBidExact(state, side, bidAmount(state.lot, inc), now, timerMs);
}

export function placeBidExact(state, side, amount, now, timerMs) {
  if (!canBid(state, side)) return state;
  const lot = state.lot;
  amount = Math.round(amount);
  if (amount < nextPrice(lot) || amount > maxBid(state.teams[side])) return state;
  return {
    ...state,
    deadline: now + timerMs,
    lot: {
      ...lot,
      price: amount,
      leader: side,
      history: [{ side, amount }, ...lot.history],
    },
  };
}

export function passLot(state, side) {
  if (!canPass(state, side)) return state;
  return {
    ...state,
    lot: { ...state.lot, passed: { ...state.lot.passed, [side]: true } },
  };
}

function assign(state, winner, price, now, extra = {}) {
  const { lot } = state;
  const team = state.teams[winner];
  let placed = false;
  const slots = team.slots.map((s) => {
    if (placed || s.pick || !fits(s, lot.pos)) return s;
    placed = true;
    return {
      ...s,
      pick: { player: lot.player, rating: lot.rating, price, ...extra },
    };
  });
  return {
    ...state,
    teams: { ...state.teams, [winner]: { money: team.money - price, slots } },
    phase: "sold",
    soldAt: now,
    outcome: { winner, price, ...extra },
    log: [...state.log, { player: lot.player, winner, price, ...extra }],
  };
}

export function decideLot(state, choice, now) {
  const opts = decideOptions(state);
  if (!opts[choice]) return state;
  const { lot } = state;
  const d = lot.decider;
  if (choice === "take")
    return assign(state, d, takePrice(lot, state.teams[d]), now, { decided: true });
  if (choice === "give")
    return assign(state, otherSide(d), 0, now, { gift: true });
  return {
    ...state,
    phase: "sold",
    soldAt: now,
    outcome: { winner: null },
    log: [...state.log, { player: lot.player, winner: null, price: 0 }],
  };
}

export function botDecision(state) {
  const opts = decideOptions(state);
  const { lot } = state;
  if (!lot) return "skip";
  if (opts.take && (!opts.give || lot.rating >= 84)) return "take";
  if (opts.give) return "give";
  return opts.take ? "take" : "skip";
}

function close(state, now) {
  const { lot } = state;
  const log = [...state.log];
  if (!lot.leader) {
    log.push({ player: lot.player, winner: null, price: 0 });
    return { ...state, phase: "sold", soldAt: now, outcome: { winner: null }, log };
  }
  const team = state.teams[lot.leader];
  let placed = false;
  const slots = team.slots.map((s) => {
    if (placed || s.pick || !fits(s, lot.pos)) return s;
    placed = true;
    return {
      ...s,
      pick: { player: lot.player, rating: lot.rating, price: lot.price },
    };
  });
  log.push({ player: lot.player, winner: lot.leader, price: lot.price });
  return {
    ...state,
    teams: {
      ...state.teams,
      [lot.leader]: { money: team.money - lot.price, slots },
    },
    phase: "sold",
    soldAt: now,
    outcome: { winner: lot.leader, price: lot.price },
    log,
  };
}

export function tick(state, pool, random, now, timerMs) {
  if (state.phase === "sold") {
    const hold = state.outcome?.auto ? SOLD_MS + AUTO_REVEAL_MS : SOLD_MS;
    return now - state.soldAt >= hold
      ? openLot(state, pool, random, now, timerMs)
      : state;
  }
  if (state.phase === "decide") return state;
  if (state.phase !== "bid" || !state.lot) return state;
  const lot = state.lot;
  if (!lot.leader) {
    if (now < state.deadline) return state;
    const cash = state.teams[lot.opener].money;
    return openWith(state, lot.opener, Math.min(MIN_BID, cash), now, timerMs);
  }
  const others = SIDE_KEYS.filter((s) => canBid(state, s));
  if (!others.length || now >= state.deadline) return close(state, now);
  return state;
}

/** Chemistry points per pair of players (must match backend/src/modules/duel/games/auction.ts). */
export const CHEM = { club: 3, country: 3, league: 1, cap: 20 };

/**
 * Team score = sum of ratings + chemistry.
 * Every pair of players earns: same club +3, same country +3, same league (different club) +1.
 * Chemistry is capped at +20. Also returns grouped links and per-player chemistry for the UI.
 */
export function teamStrength(team, data) {
  const picks = team.slots.map((s) => s.pick).filter(Boolean);
  const ratings = picks.reduce((s, p) => s + p.rating, 0);
  const leagueOf = (p) => data?.clubsById?.get(p.current_club_id)?.league ?? null;
  const links = [];
  const groups = new Map();
  const perPlayer = new Map();
  let raw = 0;
  const add = (type, key, label, a, b, pts) => {
    links.push({ type, key, a, b, pts });
    raw += pts;
    perPlayer.set(a.id, (perPlayer.get(a.id) ?? 0) + pts);
    perPlayer.set(b.id, (perPlayer.get(b.id) ?? 0) + pts);
    const id = `${type}:${key}`;
    if (!groups.has(id)) groups.set(id, { type, key, label, players: new Map(), pts: 0 });
    const g = groups.get(id);
    g.players.set(a.id, a);
    g.players.set(b.id, b);
    g.pts += pts;
  };
  for (let i = 0; i < picks.length; i++)
    for (let j = i + 1; j < picks.length; j++) {
      const a = picks[i].player;
      const b = picks[j].player;
      if (a.current_club_id && a.current_club_id === b.current_club_id) {
        add("club", a.current_club_id, null, a, b, CHEM.club);
      } else {
        const la = leagueOf(a);
        if (la && la === leagueOf(b)) add("league", la, la, a, b, CHEM.league);
      }
      if (a.nationality_code && a.nationality_code === b.nationality_code)
        add("country", a.nationality_code, null, a, b, CHEM.country);
    }
  const chem = Math.min(CHEM.cap, raw);
  const spent = picks.reduce((s, p) => s + p.price, 0);
  return {
    ratings,
    chem,
    chemRaw: raw,
    total: ratings + chem,
    links,
    groups: [...groups.values()]
      .map((g) => ({ ...g, players: [...g.players.values()] }))
      .sort((x, y) => y.pts - x.pts),
    perPlayer,
    spent,
  };
}
