export const ROUNDS = 10;
export const MAX_WRONG = 3;
import { clubFameTier } from "./fame";
import { tr } from "../../i18n";

// Səviyyələr tanınmışlıq reytinqinə görə ayrı zolaqlardır:
// asan — futbola baxanların demək olar hamısının tanıdığı ulduzlar,
// orta — azarkeşlərin bildiyi tanınmış oyunçular,
// çətin — futbolu yaxından izləyənlərin bildiyi oyunçular.
export const TIERS = {
  easy: { minPeak: 40e6, from: 0, to: 100 },
  normal: { minPeak: 15e6, from: 50, to: 450 },
  hard: { minPeak: 4e6, from: 320, to: 1800 },
};
export const POOL = Object.fromEntries(Object.entries(TIERS).map(([k, t]) => [k, t.to - t.from]));

const RECOGNITION_TROPHY = { ballon_dor: 2, world_cup: 1, ucl: 0.4, euro: 0.4, copa_america: 0.4 };
const peak = (p) => Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0);

const popularity = (p) =>
  Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0);

const year = (d) => (d ? d.slice(0, 4) : null);

export function pathIds(data, p) {
  const out = [];
  for (const id of p.club_history ?? []) {
    if (!data.clubsById.has(id)) continue;
    if (out[out.length - 1] !== id) out.push(id);
  }
  return out;
}

export const pathKey = (data, p) => pathIds(data, p).join(">");

export function careerPath(data, p) {
  const stints = [...(p.club_stints ?? [])];
  return pathIds(data, p).map((id) => {
    const i = stints.findIndex((s) => s.club_id === id);
    const s = i >= 0 ? stints.splice(i, 1)[0] : null;
    const from = year(s?.from);
    const to = s ? year(s.to) ?? (p.is_active === false ? null : tr("indi")) : null;
    return {
      club: data.clubsById.get(id),
      years: from ? `${from}${to && to !== from ? `–${to}` : ""}` : null,
    };
  });
}

// Tanınmışlıq: pik bazar dəyəri əsasdır, böyük kuboklar, millidəki oyunlar və böyük klublar əlavə xal verir.
function recognition(data, p) {
  let t = 0;
  for (const x of p.trophies ?? []) t += (RECOGNITION_TROPHY[x.id] ?? 0) * Math.min(x.count ?? 1, 3);
  const caps = Math.min(p.international?.caps ?? 0, 150);
  const big = pathIds(data, p).filter((id) => clubFameTier(data.clubsById.get(id)) === 1).length;
  return Math.log10(Math.max(peak(p), 1e5) / 1e6) * 2.4 + caps / 70 + Math.min(t, 3) + Math.min(big, 3) * 0.25;
}

export function careerPool(data, difficulty) {
  if (!data._career) {
    const scored = data.players
      .filter((p) => popularity(p) > 0 && pathIds(data, p).length >= 3)
      .map((p) => ({ p, score: recognition(data, p) }))
      .sort((a, b) => b.score - a.score);
    data._career = scored;
  }
  const tier = TIERS[difficulty] ?? TIERS.normal;
  return data._career
    .filter(({ p }) => peak(p) >= tier.minPeak)
    .slice(tier.from, tier.to)
    .map(({ p }) => p);
}

export function pickRounds(pool, random = Math.random, n = ROUNDS) {
  const picked = [];
  const used = new Set();
  let guard = 0;
  while (picked.length < Math.min(n, pool.length) && guard++ < 5000) {
    const p = pool[Math.floor(random() * pool.length)];
    if (used.has(p.id)) continue;
    used.add(p.id);
    picked.push(p);
  }
  return picked;
}

export const roundPoints = (hints) => Math.max(1, 3 - hints);
