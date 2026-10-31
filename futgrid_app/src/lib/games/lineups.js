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

export function buildMatcher(match, sides) {
  const counts = new Map();
  for (const s of sides)
    for (const p of match[s].players)
      for (const t of new Set(norm(p.name).split(" "))) counts.set(t, (counts.get(t) ?? 0) + 1);
  const shared = new Set([...counts].filter(([, n]) => n > 1).map(([t]) => t));
  const slots = [];
  for (const s of sides)
    match[s].players.forEach((p, i) => slots.push({ side: s, index: i, keys: keysFor(p, shared) }));
  return (guess, found) => {
    const g = norm(guess);
    if (g.length < 3) return null;
    return slots.find((slot) => !found.has(`${slot.side}:${slot.index}`) && slot.keys.has(g)) ?? null;
  };
}

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
