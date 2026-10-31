import { playerRating } from "./rating";

import { tr } from "../../i18n";
export const SLOTS = ["GK", "DF", "MF", "FW", "FW"];
export const BUDGET = 40;
export const MAX_LOTS = 30;
export const SOLD_MS = 1700;
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

export function buildPool(data, key) {
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
  return by;
}

export const newTeam = () => ({
  money: BUDGET,
  slots: SLOTS.map((pos) => ({ pos, pick: null })),
});

export const openCount = (team, pos) =>
  team.slots.filter((s) => !s.pick && (!pos || s.pos === pos)).length;

export const isFull = (team) => openCount(team) === 0;

export function maxBid(team) {
  const open = openCount(team);
  return open ? team.money - (open - 1) : -1;
}

export const nextPrice = (lot) => (lot.leader ? lot.price + 1 : lot.start);

export function canBid(state, side) {
  const { lot, teams, phase } = state;
  if (phase !== "bid" || !lot) return false;
  if (lot.passed[side] || lot.leader === side) return false;
  const team = teams[side];
  return openCount(team, lot.pos) > 0 && maxBid(team) >= nextPrice(lot);
}

export function bidAmount(lot, inc) {
  return (lot.leader ? lot.price : lot.start - 1) + inc;
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
    fairPrice(lot.rating) * Math.min(2, Math.max(0.5, (perSlot / 8) ** 0.7));
  if (slotsLeft === 1 && difficulty !== "easy")
    w = Math.max(w, cap * (lot.rating >= 80 ? 1 : 0.7));
  const [lo, hi] = NOISE[difficulty] ?? NOISE.normal;
  w *= lo + random() * (hi - lo);
  return Math.max(0, Math.min(cap, Math.floor(w)));
}

function pickLot(pool, teams, used, random) {
  const weights = {};
  for (const t of Object.values(teams))
    for (const s of t.slots) if (!s.pick) weights[s.pos] = (weights[s.pos] ?? 0) + 1;
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
  const free = pool[pos].filter((p) => !used.has(p.id));
  const player = free[Math.floor(random() * free.length)];
  const rating = playerRating(player);
  const tier = tierOf(rating);
  return { player, pos, rating, tier, start: tier.start };
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
      const free = pool[s.pos].filter((p) => !used.has(p.id));
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
  return {
    ...state,
    used,
    lotNo: state.lotNo + 1,
    phase: "bid",
    outcome: null,
    deadline: now + timerMs,
    lot: {
      ...info,
      id: `${state.lotNo + 1}-${info.player.id}`,
      price: info.start,
      leader: null,
      passed: { A: false, B: false },
      history: [],
    },
  };
}

export function newGame(pool, random, now, timerMs) {
  return openLot(
    {
      teams: { A: newTeam(), B: newTeam() },
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
  const lot = state.lot;
  const amount = bidAmount(lot, inc);
  if (amount > maxBid(state.teams[side])) return state;
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
  if (state.phase !== "bid" || !state.lot || state.lot.leader === side)
    return state;
  return {
    ...state,
    lot: { ...state.lot, passed: { ...state.lot.passed, [side]: true } },
  };
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
    if (placed || s.pick || s.pos !== lot.pos) return s;
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
    return now - state.soldAt >= SOLD_MS
      ? openLot(state, pool, random, now, timerMs)
      : state;
  }
  if (state.phase !== "bid" || !state.lot) return state;
  const others = SIDE_KEYS.filter((s) => canBid(state, s));
  if (!others.length || now >= state.deadline) return close(state, now);
  return state;
}

export function teamStrength(team) {
  const picks = team.slots.map((s) => s.pick).filter(Boolean);
  const ratings = picks.reduce((s, p) => s + p.rating, 0);
  let club = 0;
  let nation = 0;
  const links = [];
  for (let i = 0; i < picks.length; i++)
    for (let j = i + 1; j < picks.length; j++) {
      const a = picks[i].player;
      const b = picks[j].player;
      if (a.current_club_id && a.current_club_id === b.current_club_id) {
        club += 2;
        links.push({ type: "club", a, b });
      }
      if (a.nationality_code && a.nationality_code === b.nationality_code) {
        nation += 1;
        links.push({ type: "country", a, b });
      }
    }
  const chem = Math.min(10, club + nation);
  const spent = picks.reduce((s, p) => s + p.price, 0);
  return { ratings, chem, total: ratings + chem, links, spent };
}
