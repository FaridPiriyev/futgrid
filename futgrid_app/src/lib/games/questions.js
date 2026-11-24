import { tr } from "../../i18n";
import { datasetFor } from "../data";
import { byFame } from "./fame";
import { ageOf } from "./playerInfo";

const TOP5 = ["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];
const BIG_SIX = /^(arsenal|chelsea|liverpool|manchester-city|manchester-united|tottenham-hotspur)$/;

const clubsOf = (data, p) => (p.club_history ?? []).map((id) => data.clubsById.get(id)).filter(Boolean);
const confed = (data, code) => data.countriesByCode.get(code)?.confederation ?? null;
const trophy = (p, id) => (p.trophies ?? []).some((t) => t.id === id && (t.count ?? 1) > 0);
const hasClubs = (p) => (p.club_history ?? []).length > 0;
const maxValue = (p) => Math.max(p.market_value?.amount_eur ?? 0, p.market_value?.highest_eur ?? 0);

const inLeague = (league) => (p, data) => (hasClubs(p) ? clubsOf(data, p).some((c) => c.league === league) : null);
const inCountry = (cc) => (p, data) => (hasClubs(p) ? clubsOf(data, p).some((c) => c.country_id === cc) : null);
const isPos = (pos) => (p) => (p.position ? p.position === pos : null);
const fromConfed = (...list) => (p, data) => {
  const c = confed(data, p.nationality_code);
  return c ? list.includes(c) : null;
};

export const QUESTION_GROUPS = [
  {
    key: "general",
    get label() {
      return tr("Ümumi");
    },
    items: [
      { id: "active", get text() { return tr("Hazırda oynayır?"); }, test: (p) => p.is_active !== false },
      { id: "age30", get text() { return tr("30 yaşdan böyükdür?"); }, test: (p) => { const a = ageOf(p); return a == null ? null : a > 30; } },
      { id: "born2000", get text() { return tr("2000-ci ildən sonra doğulub?"); }, test: (p) => (p.birth_date ? Number(p.birth_date.slice(0, 4)) >= 2000 : null) },
      { id: "left", get text() { return tr("Sol ayaqlıdır?"); }, test: (p) => (p.preferred_foot ? p.preferred_foot === "left" : null) },
    ],
  },
  {
    key: "position",
    get label() {
      return tr("Mövqe");
    },
    items: [
      { id: "gk", get text() { return tr("Qapıçıdır?"); }, test: isPos("GK") },
      { id: "df", get text() { return tr("Müdafiəçidir?"); }, test: isPos("DF") },
      { id: "mf", get text() { return tr("Yarımmüdafiəçidir?"); }, test: isPos("MF") },
      { id: "fw", get text() { return tr("Hücumçudur?"); }, test: isPos("FW") },
    ],
  },
  {
    key: "nation",
    get label() {
      return tr("Milliyyət");
    },
    items: [
      { id: "uefa", get text() { return tr("Avropalıdır?"); }, test: fromConfed("UEFA") },
      { id: "conmebol", get text() { return tr("Cənubi Amerikalıdır?"); }, test: fromConfed("CONMEBOL") },
      { id: "caf", get text() { return tr("Afrikalıdır?"); }, test: fromConfed("CAF") },
      { id: "afc", get text() { return tr("Asiya və ya Okeaniyadandır?"); }, test: fromConfed("AFC", "OFC") },
      { id: "concacaf", get text() { return tr("Şimali və ya Mərkəzi Amerikadandır?"); }, test: fromConfed("CONCACAF") },
    ],
  },
  {
    key: "league",
    get label() {
      return tr("Liqalar");
    },
    items: [
      { id: "top5", get text() { return tr("Top-5 liqada oynayıb?"); }, test: (p, d) => (hasClubs(p) ? clubsOf(d, p).some((c) => TOP5.includes(c.league)) : null) },
      { id: "pl", get text() { return tr("Premyer Liqada oynayıb?"); }, test: inLeague("Premier League") },
      { id: "laliga", get text() { return tr("La Liqada oynayıb?"); }, test: inLeague("La Liga") },
      { id: "seriea", get text() { return tr("Serie A-da oynayıb?"); }, test: inLeague("Serie A") },
      { id: "bundes", get text() { return tr("Bundesliqada oynayıb?"); }, test: inLeague("Bundesliga") },
      { id: "ligue1", get text() { return tr("Liqa 1-də oynayıb?"); }, test: inLeague("Ligue 1") },
      { id: "tr", get text() { return tr("Türkiyədə oynayıb?"); }, test: inCountry("TR") },
      { id: "az", get text() { return tr("Azərbaycanda oynayıb?"); }, test: inCountry("AZ") },
      { id: "outside", get text() { return tr("Avropadan kənarda oynayıb?"); }, test: (p, d) => (hasClubs(p) ? clubsOf(d, p).some((c) => confed(d, c.country_id === "GB" ? "GB-ENG" : c.country_id) !== "UEFA") : null) },
    ],
  },
  {
    key: "club",
    get label() {
      return tr("Klublar");
    },
    items: [
      { id: "bigsix", get text() { return tr("İngiltərənin “böyük altılığında” oynayıb?"); }, test: (p, d) => (hasClubs(p) ? clubsOf(d, p).some((c) => BIG_SIX.test(c.slug)) : null) },
      { id: "clubs4", get text() { return tr("4 və ya daha çox klubda oynayıb?"); }, test: (p) => (hasClubs(p) ? p.club_history.length >= 4 : null) },
      { id: "oneclub", get text() { return tr("Bütün karyerası bir klubdadır?"); }, test: (p) => (hasClubs(p) ? new Set(p.club_history).size === 1 : null) },
    ],
  },
  {
    key: "trophy",
    get label() {
      return tr("Kuboklar");
    },
    items: [
      { id: "ucl", get text() { return tr("Çempionlar Liqasını qazanıb?"); }, test: (p) => trophy(p, "ucl") },
      { id: "wc", get text() { return tr("Dünya çempionudur?"); }, test: (p) => trophy(p, "world_cup") },
      { id: "cont", get text() { return tr("Avropa və ya Kopa Amerika çempionudur?"); }, test: (p) => trophy(p, "euro") || trophy(p, "copa_america") },
      { id: "bdor", get text() { return tr("Qızıl topu qazanıb?"); }, test: (p) => trophy(p, "ballon_dor") },
    ],
  },
  {
    key: "numbers",
    get label() {
      return tr("Rəqəmlər");
    },
    items: [
      { id: "caps50", get text() { return tr("Milli komandada 50+ oyunu var?"); }, test: (p) => (p.international?.caps ?? 0) >= 50 },
      { id: "value50", get text() { return tr("Bazar dəyəri 50 mln €-ya çatıb?"); }, test: (p) => (maxValue(p) ? maxValue(p) >= 5e7 : null) },
    ],
  },
];

export const QUESTIONS = new Map(QUESTION_GROUPS.flatMap((g) => g.items.map((q) => [q.id, { ...q, group: g.key }])));

export function entityQuestion(entity) {
  if (entity.type === "club")
    return {
      id: entity.key,
      get text() {
        return tr("{club} klubunda oynayıb?", { club: entity.label });
      },
      entity,
      test: (p) => (hasClubs(p) ? p.club_history.includes(entity.club.id) : entity.ids.has(p.id)),
    };
  return {
    id: entity.key,
    get text() {
      return tr("{country} futbolçusudur?", { country: entity.label });
    },
    entity,
    test: (p) => (p.nationality_code ? p.nationality_code === entity.code : null),
  };
}

export function answerOf(question, player, data) {
  const v = question.test(player, data);
  return v == null ? null : Boolean(v);
}

const POOLS = { easy: 120, normal: 450, hard: 1400 };

export function secretPool(data, { difficulty = "normal", era = "all" } = {}) {
  const key = `_qpool_${difficulty}_${era}`;
  if (data[key]) return data[key];
  const set = datasetFor(data, era);
  const ok = set.players.filter((p) => p.nationality_code && p.position && hasClubs(p) && p.birth_date);
  const ranked = [...ok].sort(byFame);
  data[key] = ranked.slice(0, POOLS[difficulty] ?? POOLS.normal);
  return data[key];
}

export function pickSecret(data, settings, avoid = new Set()) {
  const pool = secretPool(data, settings).filter((p) => !avoid.has(p.id));
  const list = pool.length ? pool : secretPool(data, settings);
  return list[Math.floor(Math.random() * list.length)];
}
