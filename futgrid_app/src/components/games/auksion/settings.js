import { tr } from "../../../i18n";
import { DEFAULT_FORMATION, validFormation } from "../../../lib/games/auction";
const KEY = "futgrid:auksion:settings";

export const DEFAULT_SETTINGS = {
  pool: "stars",
  timer: 10,
  bot: "normal",
  names: { A: "", B: "" },
  formation: DEFAULT_FORMATION,
  // Gizli oyunçu: lotda ad yox, ipucu görünür ("Barcelona ilə ÇL qazanıb").
  mystery: false,
};

// Hazır heyət şablonları (qapıçı · müdafiə · orta · hücum)
export const FORMATION_PRESETS = [
  { key: "classic", f: { GK: 1, DF: 1, MF: 1, FW: 2 }, get label() {
    return tr("Klassik");
  } },
  { key: "attack", f: { GK: 0, DF: 0, MF: 0, FW: 5 }, get label() {
    return tr("Tam hücum");
  } },
  { key: "wall", f: { GK: 1, DF: 3, MF: 0, FW: 1 }, get label() {
    return tr("Beton müdafiə");
  } },
  { key: "mid", f: { GK: 1, DF: 1, MF: 2, FW: 1 }, get label() {
    return tr("Orta xətt");
  } },
  { key: "free", f: { GK: 0, DF: 2, MF: 1, FW: 2 }, get label() {
    return tr("Qapıçısız");
  } },
];

export const OPTIONS = {
  pool: [
    { value: "stars", get label() {
    return tr("Ulduzlar");
  }, get sub() {
    return tr("ən güclü oyunçular");
  } },
    { value: "wide", get label() {
    return tr("Geniş");
  }, get sub() {
    return tr("daha çox sürpriz");
  } },
  ],
  timer: [
    { value: 10, get label() {
    return tr("10 san");
  } },
    { value: 15, get label() {
    return tr("15 san");
  } },
    { value: 20, get label() {
    return tr("20 san");
  } },
  ],
  bot: [
    { value: "easy", get label() {
    return tr("Asan");
  }, get sub() {
    return tr("tez-tez güzəştə gedir");
  } },
    { value: "normal", get label() {
    return tr("Orta");
  }, get sub() {
    return tr("ağıllı alıcı");
  } },
    { value: "hard", get label() {
    return tr("Çətin");
  }, get sub() {
    return tr("pulunu dəqiq xərcləyir");
  } },
  ],
};

export const SIDES = {
  A: {
    text: "text-accent-hi",
    border: "border-accent",
    soft: "bg-accent/10",
    solid: "bg-accent text-white",
    bar: "bg-accent",
    ring: "var(--fg-accent)",
    shadow: "shadow-[0_0_0_1px_color-mix(in_srgb,var(--fg-accent)_45%,transparent),0_20px_60px_-30px_color-mix(in_srgb,var(--fg-accent)_70%,transparent)]",
  },
  B: {
    text: "text-gold-hi",
    border: "border-gold",
    soft: "bg-gold/10",
    solid: "bg-gold text-black",
    bar: "bg-gold",
    ring: "var(--fg-gold)",
    shadow: "shadow-[0_0_0_1px_color-mix(in_srgb,var(--fg-gold)_45%,transparent),0_20px_60px_-30px_color-mix(in_srgb,var(--fg-gold)_60%,transparent)]",
  },
};

export const KEYS = {
  A: { bids: ["1", "2", "3"], pass: "q" },
  B: { bids: ["8", "9", "0"], pass: "p" },
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved)
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        names: { ...DEFAULT_SETTINGS.names, ...saved.names },
        formation: validFormation(saved.formation)
          ? { ...DEFAULT_FORMATION, ...saved.formation }
          : DEFAULT_FORMATION,
      };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function sideNames(mode, settings) {
  if (mode === "solo") return { A: tr("Sən"), B: "Bot" };
  return {
    A: settings.names?.A?.trim() || tr("Oyunçu 1"),
    B: settings.names?.B?.trim() || tr("Oyunçu 2"),
  };
}
