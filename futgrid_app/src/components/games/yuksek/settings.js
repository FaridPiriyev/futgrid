import { tr } from "../../../i18n";
const KEY = "futgrid:yuksek:settings";

export const DEFAULT_SETTINGS = {
  difficulty: "normal",
  // compare: iki oyunçunun dəyəri müqayisə olunur; line: oyunçunun dəyəri verilmiş məbləğdən çox/az/bərabər?
  mode: "compare",
};

export const OPTIONS = {
  mode: [
    { value: "compare", get label() {
    return tr("İki oyunçu");
  }, get sub() {
    return tr("kimin dəyəri yüksəkdir?");
  } },
    { value: "line", get label() {
    return tr("Rəqəmlə");
  }, get sub() {
    return tr("çox, az, yoxsa bərabər?");
  } },
  ],
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
      return {
        ...DEFAULT_SETTINGS,
        difficulty: saved.difficulty,
        mode: OPTIONS.mode.some((o) => o.value === saved.mode) ? saved.mode : DEFAULT_SETTINGS.mode,
      };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}
