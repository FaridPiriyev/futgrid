import { tr } from "../../../i18n";
const KEY = "futgrid:yuksek:settings";

export const DEFAULT_SETTINGS = {
  difficulty: "normal",
};

export const OPTIONS = {
  difficulty: [
    { value: "easy", get label() {
    return tr("Asan");
  }, get sub() {
    return tr("ən məşhurlar");
  } },
    { value: "normal", get label() {
    return tr("Normal");
  }, get sub() {
    return tr("tanınmışlar");
  } },
    { value: "hard", get label() {
    return tr("Çətin");
  }, get sub() {
    return tr("hamısı");
  } },
  ],
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && OPTIONS.difficulty.some((o) => o.value === saved.difficulty))
      return { ...DEFAULT_SETTINGS, difficulty: saved.difficulty };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
