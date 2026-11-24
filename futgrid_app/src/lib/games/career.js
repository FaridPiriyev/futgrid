export const ROUNDS = 10;
export const MAX_WRONG = 3;
import { clubFameTier } from "./fame";
import { tr } from "../../i18n";

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

const year = (d) => (typeof d === "string" && /^\d{4}/.test(d) ? d.slice(0, 4) : null);

export function pathIds(data, p) {
  const out = [];
  for (const id of p.club_history ?? []) {
    if (!data.clubsById.has(id)) continue;
    if (out[out.length - 1] !== id) out.push(id);
  }
  return out;
}

export const pathKey = (data, p) => pathIds(data, p).join(">");

const time = (d) => (d ? Date.parse(d) : NaN);

function stintRuns(p) {
  const list = (p.club_stints ?? [])
    .filter((s) => s.club_id != null && !Number.isNaN(time(s.from)))
    .sort((a, b) => time(a.from) - time(b.from));
  const runs = [];
  for (const s of list) {
    const last = runs[runs.length - 1];
    if (last && last.club_id === s.club_id) last.to = s.to ?? null;
    else runs.push({ club_id: s.club_id, from: s.from, to: s.to ?? null });
  }
  return runs;
}

function alignYears(ids, runs) {
  const n = ids.length;
  const m = runs.length;
  const suf = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      suf[i][j] = ids[i] === runs[j].club_id ? 1 + suf[i + 1][j + 1] : Math.max(suf[i + 1][j], suf[i][j + 1]);
  const match = new Array(n).fill(-1);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ids[i] === runs[j].club_id && suf[i][j] === 1 + suf[i + 1][j + 1]) match[i++] = j++;
    else if (suf[i][j + 1] >= suf[i + 1][j]) j++;
    else i++;
  }
  return match.map((a, k) => {
    if (a < 0) return null;
    const next = match.slice(k + 1).find((x) => x >= 0) ?? m;
    let to = runs[a].to;
    for (let b = a + 1; b < next; b++) if (runs[b].club_id === runs[a].club_id) to = runs[b].to;
    return { from: runs[a].from, to };
  });
}

export function careerPath(data, p) {
  const ids = pathIds(data, p);
  const spans = alignYears(ids, stintRuns(p));
  spans.forEach((s, k) => {
    if (!s || year(s.to)) return;
    const next = spans.slice(k + 1).find(Boolean);
    if (next) s.to = next.from;
  });
  return ids.map((id, k) => {
    const s = spans[k];
    const from = year(s?.from);
    const to = s ? year(s.to) ?? (p.is_active === false ? null : tr("indi")) : null;
    return {
      club: data.clubsById.get(id),
      years: from ? `${from}${to && to !== from ? `–${to}` : ""}` : null,
    };
  });
}

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
