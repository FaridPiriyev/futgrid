import { tr } from "../../../i18n";

export const LEVELS = [
  { value: "easy", get label() {
    return tr("Asan");
  }, get sub() {
    return tr("çox cavablı hərflər");
  } },
  { value: "normal", get label() {
    return tr("Normal");
  }, get sub() {
    return tr("orta");
  } },
  { value: "hard", get label() {
    return tr("Çətin");
  }, get sub() {
    return tr("bütün hərflər");
  } },
];

export const TIMES = [10, 15, 20].map((n) => ({
  value: n,
  get label() {
    return tr("{n} san.", { n });
  },
  get sub() {
    return tr("hər növbəyə");
  },
}));

export const SOLO_TIMES = [30, 45, 60].map((n) => ({
  value: n,
  get label() {
    return tr("{n} san.", { n });
  },
  get sub() {
    return tr("hər raunda");
  },
}));

export const ROUNDS = [3, 5, 10].map((n) => ({
  value: n,
  get label() {
    return tr("{n} raund", { n });
  },
}));

export const TARGETS = [3, 5, 7].map((n) => ({
  value: n,
  get label() {
    return tr("{n} xal", { n });
  },
}));
