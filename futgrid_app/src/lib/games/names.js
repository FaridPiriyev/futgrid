import { tr } from "../../i18n";

const NAMES = {
  overall: () => tr("Ümumi reytinq"),
  xox: () => tr("Futbol X0X"),
  orta: () => tr("Ortaq Oyunçu"),
  auction: () => tr("Açıq Artırma"),
  higherLower: () => tr("Yüksək yoxsa Aşağı?"),
  twoLetters: () => tr("İki hərf"),
  sual: () => tr("20 sual"),
  sekil: () => tr("Kimdir bu?"),
  wordle: () => tr("Futbol Wordle"),
  career: () => tr("Karyera yolu"),
  lineups: () => tr("Heyəti xatırla"),
  fiveClubs: () => tr("5 klub"),
  clubOrder: () => tr("Klubları sırala"),
  pyramid: () => tr("Piramida"),
};

export const gameName = (id) => (NAMES[id] ? NAMES[id]() : id);

export const DUEL_GAME_IDS = ["xox", "orta", "auction", "higherLower", "twoLetters", "sual", "sekil"];

/** Online duel game id → page path (used for friend invites). */
export const DUEL_GAME_PATHS = {
  xox: "/oyunlar/futbol-x0x",
  orta: "/oyunlar/ortaq-oyuncu",
  auction: "/oyunlar/auksion",
  higherLower: "/oyunlar/yuksek-asagi",
  twoLetters: "/oyunlar/iki-herf",
  sual: "/oyunlar/20-sual",
  sekil: "/oyunlar/kimdir-bu",
};

/** Games that have their own rating (each starts at 1000), in menu order. */
export const RATED_GAME_IDS = [
  "xox",
  "orta",
  "auction",
  "higherLower",
  "twoLetters",
  "sual",
  "sekil",
  "wordle",
  "career",
  "lineups",
  "fiveClubs",
  "clubOrder",
  "pyramid",
];

/** Catalog card key → rating/game id used by the API. */
export const CATALOG_GAME_ID = {
  x0x: "xox",
  ortaq: "orta",
  auksion: "auction",
  yuksek: "higherLower",
  wordle: "wordle",
  karyera: "career",
  heyet: "lineups",
  besklub: "fiveClubs",
  sirala: "clubOrder",
  piramida: "pyramid",
  ikiherf: "twoLetters",
  sual: "sual",
  sekil: "sekil",
};
