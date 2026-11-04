import { tr } from "../../../i18n";
const KEY = "futgrid:x0x:settings";

export const DEFAULT_SETTINGS = {
  era: "all",
  difficulty: "normal",
  steals: "none",
  bestOf: "unlimited",
  timer: 60,
  multipleChoice: false,
  categories: { club: true, country: true, trophy: true, coach: true },
  names: { X: "", O: "" },
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
  steals: [
    { value: "none", get label() {
    return tr("Oğurlama yox");
  } },
    { value: 3, get label() {
    return tr("3 oğurlama");
  } },
    { value: "unlimited", get label() {
    return tr("Limitsiz");
  } },
  ],
  timer: [
    { value: 15, get label() {
    return tr("Sürətli");
  }, get sub() {
    return tr("15 san.");
  } },
    { value: 40, get label() {
    return tr("Normal");
  }, get sub() {
    return tr("40 san.");
  } },
    { value: 60, get label() {
    return tr("Taktik");
  }, get sub() {
    return tr("60 san.");
  } },
    { value: 0, get label() {
    return tr("Limitsiz");
  }, get sub() {
    return tr("vaxt yoxdur");
  } },
  ],
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved) {
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        categories: {
          ...DEFAULT_SETTINGS.categories,
          ...saved.categories,
          club: true,
        },
        names: { ...DEFAULT_SETTINGS.names, ...saved.names },
        era: "all",
        bestOf: "unlimited",
      };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export const winsNeeded = (bestOf) =>
  bestOf === "unlimited" ? Infinity : Math.ceil(bestOf / 2);

export const playerName = (settings, mark) =>
  settings.names?.[mark]?.trim() || (mark === "X" ? tr("Oyunçu 1") : tr("Oyunçu 2"));
