import MATCHES from "../../data/famous-matches.json";
import { norm } from "../data";
import { getLang } from "../../i18n";

export const playableSides = (m) =>
  ["home", "away"].filter((s) => m[s]?.players?.length === 11);

export const matches = MATCHES.filter((m) => playableSides(m).length > 0);

export function lines(formation) {
  return [1, ...String(formation).split("-").map(Number).filter(Boolean)];
}

export function layout(team) {
  const rows = lines(team.formation);
  const out = [];
  let i = 0;
  rows.forEach((n, r) => {
    const y = 88 - (r * 76) / Math.max(1, rows.length - 1);
    for (let k = 0; k < n && i < team.players.length; k++, i++) {
      const x = 100 - ((k + 1) * 100) / (n + 1);
      out.push({ index: i, x, y, line: r === 0 ? "GK" : r === 1 ? "DF" : r === rows.length - 1 ? "FW" : "MF" });
    }
  });
  return out;
}

function keysFor(player, shared) {
  const full = norm(player.name);
  const tokens = full.split(" ");
  const keys = new Set([full, full.replace(/ /g, "")]);
  for (let k = 1; k < tokens.length; k++) keys.add(tokens.slice(k).join(" "));
  for (const t of tokens) if (t.length >= 4 && !shared.has(t)) keys.add(t);
  for (const a of player.aliases ?? []) keys.add(norm(a));
  return keys;
}

function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const fuzzyLimit = (len) => (len >= 8 ? 2 : len >= 5 ? 1 : 0);

export function buildMatcher(match, sides) {
  const counts = new Map();
  for (const s of sides)
    for (const p of match[s].players)
      for (const t of new Set(norm(p.name).split(" "))) counts.set(t, (counts.get(t) ?? 0) + 1);
  const shared = new Set([...counts].filter(([, n]) => n > 1).map(([t]) => t));
  const slots = [];
  for (const s of sides)
    match[s].players.forEach((p, i) => slots.push({ side: s, index: i, id: `${s}:${i}`, keys: [...keysFor(p, shared)] }));

  const unique = (list) => {
    const ids = new Set(list.map((x) => x.id));
    return ids.size === 1 ? list[0] : ids.size > 1 ? "many" : null;
  };

  return (guess, found, { live = false } = {}) => {
    const g = norm(guess);
    if (g.length < 3) return null;
    const open = slots.filter((slot) => !found.has(slot.id));
    const exact = open.filter((slot) => slot.keys.includes(g));
    if (exact.length) return exact[0];
    if (g.length < 4) return null;
    const prefix = unique(open.filter((slot) => slot.keys.some((k) => k.length > g.length && k.startsWith(g))));
    if (prefix && prefix !== "many") return prefix;
    if (live) return null;
    const max = fuzzyLimit(g.length);
    if (max) {
      const near = unique(open.filter((slot) => slot.keys.some((k) => k.length >= 4 && distance(g, k, max) <= max)));
      if (near && near !== "many") return near;
      if (near === "many" || prefix === "many") return "many";
    }
    return prefix === "many" ? "many" : null;
  };
}

export const decadeOf = (m) => Math.floor(Number(m.date.slice(0, 4)) / 10) * 10;

export function kindOf(m) {
  const c = norm(m.competition);
  if (c.includes("cempionlar liqasi")) return "ucl";
  if (c.includes("dunya kuboku")) return "wc";
  if (c.includes("avropa cempionati")) return "euro";
  return "league";
}

export const DECADES = [...new Set(matches.map(decadeOf))].sort((a, b) => a - b);
export const KINDS = ["ucl", "wc", "euro", "league"].filter((k) => matches.some((m) => kindOf(m) === k));

export const filterMatches = (filter) =>
  matches.filter(
    (m) =>
      (!filter?.decades?.length || filter.decades.includes(decadeOf(m))) &&
      (!filter?.kinds?.length || filter.kinds.includes(kindOf(m))),
  );

const MONTHS = {
  az: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
};

export const dateLabel = (d) => {
  const [y, m, day] = d.split("-");
  const months = MONTHS[getLang()] ?? MONTHS.az;
  return `${Number(day)} ${months[Number(m) - 1]} ${y}`;
};
