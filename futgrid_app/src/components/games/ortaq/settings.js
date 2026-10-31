import { tr } from "../../../i18n";
const KEY = "futgrid:ortaq:settings";

export const DEFAULT_SETTINGS = {
  era: "active",
  difficulty: "normal",
  target: 5,
  rounds: 10,
  names: { A: "", B: "" },
};

export const OPTIONS = {
  era: [
    { value: "active", get label() {
    return tr("Aktiv");
  }, get sub() {
    return tr("indiki heyətlər");
  } },
    { value: "all", get label() {
    return tr("Bütün zamanlar");
  }, get sub() {
    return tr("legendlər daxil");
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
  targetPresets: [1, 3, 5, 10],
  rounds: [
    { value: 5, get label() {
    return tr("5 sual");
  } },
    { value: 10, get label() {
    return tr("10 sual");
  } },
    { value: 20, get label() {
    return tr("20 sual");
  } },
  ],
};

export const SIDES = {
  A: {
    text: "text-accent-hi",
    border: "border-accent",
    bg: "bg-accent/15",
    solid: "bg-accent text-white",
    ring: "ring-accent",
    dot: "bg-accent-hi",
    glow: "color-mix(in srgb, var(--fg-accent) 65%, transparent)",
  },
  B: {
    text: "text-gold-hi",
    border: "border-gold",
    bg: "bg-gold/10",
    solid: "bg-gold text-black",
    ring: "ring-gold",
    dot: "bg-gold-hi",
    glow: "color-mix(in srgb, var(--fg-gold) 60%, transparent)",
  },
};

export const otherSide = (s) => (s === "A" ? "B" : "A");

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved) {
      const target =
        saved.target === "unlimited" ||
        (Number.isInteger(saved.target) && saved.target > 0)
          ? saved.target
          : DEFAULT_SETTINGS.target;
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        target,
        names: { ...DEFAULT_SETTINGS.names, ...saved.names },
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

export const sideName = (settings, side) =>
  settings.names?.[side]?.trim() || (side === "A" ? tr("Oyunçu 1") : tr("Oyunçu 2"));
