import type { GameData, RawPlayer } from "@futgrid/game-core";

type Answer = boolean | null;
type Test = (player: RawPlayer, data: GameData) => Answer;

const TOP5 = ["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];
const BIG_SIX = /^(arsenal|chelsea|liverpool|manchester-city|manchester-united|tottenham-hotspur)$/;

const clubsOf = (data: GameData, player: RawPlayer) =>
  (player.club_history ?? []).map((id) => data.clubsById.get(id)).filter(Boolean) as Record<string, any>[];
const confed = (data: GameData, code?: string | null) =>
  ((code && (data.countriesByCode.get(code) as Record<string, any> | undefined)?.confederation) as string | undefined) ?? null;
const trophy = (player: RawPlayer, id: string) => (player.trophies ?? []).some((entry) => entry.id === id && (entry.count ?? 1) > 0);
const hasClubs = (player: RawPlayer) => (player.club_history ?? []).length > 0;
const maxValue = (player: RawPlayer) => Math.max(player.market_value?.amount_eur ?? 0, player.market_value?.highest_eur ?? 0);

function ageOf(player: RawPlayer, now = new Date()): number | null {
  if (!player.birth_date) return null;
  const birth = new Date(player.birth_date);
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

const inLeague = (league: string): Test => (p, d) => (hasClubs(p) ? clubsOf(d, p).some((c) => c.league === league) : null);
const inCountry = (code: string): Test => (p, d) => (hasClubs(p) ? clubsOf(d, p).some((c) => c.country_id === code) : null);
const isPos = (pos: string): Test => (p) => (p.position ? p.position === pos : null);
const fromConfed = (...list: string[]): Test => (p, d) => {
  const value = confed(d, p.nationality_code);
  return value ? list.includes(value) : null;
};

export const QUESTION_TESTS: Record<string, Test> = {
  active: (p) => p.is_active !== false,
  age30: (p) => {
    const age = ageOf(p);
    return age == null ? null : age > 30;
  },
  born2000: (p) => (p.birth_date ? Number(p.birth_date.slice(0, 4)) >= 2000 : null),
  left: (p) => (p.preferred_foot ? p.preferred_foot === "left" : null),
  gk: isPos("GK"),
  df: isPos("DF"),
  mf: isPos("MF"),
  fw: isPos("FW"),
  uefa: fromConfed("UEFA"),
  conmebol: fromConfed("CONMEBOL"),
  caf: fromConfed("CAF"),
  afc: fromConfed("AFC", "OFC"),
  concacaf: fromConfed("CONCACAF"),
  top5: (p, d) => (hasClubs(p) ? clubsOf(d, p).some((c) => TOP5.includes(c.league)) : null),
  pl: inLeague("Premier League"),
  laliga: inLeague("La Liga"),
  seriea: inLeague("Serie A"),
  bundes: inLeague("Bundesliga"),
  ligue1: inLeague("Ligue 1"),
  tr: inCountry("TR"),
  az: inCountry("AZ"),
  outside: (p, d) =>
    hasClubs(p) ? clubsOf(d, p).some((c) => confed(d, c.country_id === "GB" ? "GB-ENG" : c.country_id) !== "UEFA") : null,
  bigsix: (p, d) => (hasClubs(p) ? clubsOf(d, p).some((c) => BIG_SIX.test(String(c.slug ?? ""))) : null),
  clubs4: (p) => (hasClubs(p) ? (p.club_history ?? []).length >= 4 : null),
  oneclub: (p) => (hasClubs(p) ? new Set(p.club_history).size === 1 : null),
  ucl: (p) => trophy(p, "ucl"),
  wc: (p) => trophy(p, "world_cup"),
  cont: (p) => trophy(p, "euro") || trophy(p, "copa_america"),
  bdor: (p) => trophy(p, "ballon_dor"),
  caps50: (p) => (p.international?.caps ?? 0) >= 50,
  value50: (p) => (maxValue(p) ? maxValue(p) >= 5e7 : null),
};

export interface AskedQuestion {
  id: string;
  kind: "question" | "club" | "country";
  label?: string;
  answer: Answer;
}

export function askQuestion(data: GameData, secret: RawPlayer, id: string): AskedQuestion | null {
  const test = QUESTION_TESTS[id];
  if (test) {
    const value = test(secret, data);
    return { id, kind: "question", answer: value == null ? null : Boolean(value) };
  }
  const club = /^club:(\d+)$/.exec(id);
  if (club) {
    const clubId = Number(club[1]);
    const entry = data.clubsById.get(clubId);
    if (!entry) return null;
    return {
      id,
      kind: "club",
      label: entry.name,
      answer: hasClubs(secret) ? (secret.club_history ?? []).includes(clubId) : null,
    };
  }
  const country = /^country:([A-Z]{2}(?:-[A-Z]{3})?)$/.exec(id);
  if (country) {
    const code = country[1] as string;
    const entry = data.countriesByCode.get(code);
    if (!entry) return null;
    return {
      id,
      kind: "country",
      label: entry.name ?? code,
      answer: secret.nationality_code ? secret.nationality_code === code : null,
    };
  }
  return null;
}
