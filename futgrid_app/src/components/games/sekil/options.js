import { tr } from "../../../i18n";

export const GRID_OPTIONS = [
  { value: 16, get label() { return tr("16 xana"); }, get sub() { return tr("4 × 4"); } },
  { value: 24, get label() { return tr("24 xana"); }, get sub() { return tr("4 × 6, daha uzun"); } },
];
export const LEVELS = [
  { value: "easy", get label() { return tr("Asan"); }, get sub() { return tr("ən məşhurlar"); } },
  { value: "normal", get label() { return tr("Orta"); }, get sub() { return tr("tanınmışlar"); } },
  { value: "hard", get label() { return tr("Çətin"); }, get sub() { return tr("geniş seçim"); } },
];
export const ERAS = [
  { value: "active", get label() { return tr("Aktiv"); }, get sub() { return tr("indiki futbolçular"); } },
  { value: "all", get label() { return tr("Bütün zamanlar"); }, get sub() { return tr("legendlər daxil"); } },
];
export const SPEEDS = [2, 3, 4].map((n) => ({ value: n, get label() { return tr("{n} san", { n }); } }));
export const ROUNDS = [5, 10].map((n) => ({ value: n, get label() { return tr("{n} futbolçu", { n }); } }));
export const TARGETS = [3, 5].map((n) => ({ value: n, get label() { return tr("{n} xal", { n }); } }));
