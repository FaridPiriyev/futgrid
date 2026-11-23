import { tr } from "../../../i18n";

export const LEVELS = [
  { value: "easy", get label() { return tr("Asan"); }, get sub() { return tr("ən məşhurlar"); } },
  { value: "normal", get label() { return tr("Normal"); }, get sub() { return tr("tanınmışlar"); } },
  { value: "hard", get label() { return tr("Çətin"); }, get sub() { return tr("geniş seçim"); } },
];
export const ERAS = [
  { value: "active", get label() { return tr("Aktiv"); }, get sub() { return tr("indiki futbolçular"); } },
  { value: "all", get label() { return tr("Bütün zamanlar"); }, get sub() { return tr("legendlər daxil"); } },
];
export const LIMITS = [10, 15, 20].map((n) => ({ value: n, get label() { return tr("{n} sual", { n }); } }));
