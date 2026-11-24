import { tr } from "../../i18n";

const NAMES = {
  overall: () => tr("Bütün duellər"),
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
