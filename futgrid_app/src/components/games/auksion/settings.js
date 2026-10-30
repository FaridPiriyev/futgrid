const KEY = "futgrid:auksion:settings";

export const DEFAULT_SETTINGS = {
  pool: "stars",
  timer: 10,
  bot: "normal",
  names: { A: "", B: "" },
};

export const OPTIONS = {
  pool: [
    { value: "stars", label: "Ulduzlar", sub: "ən güclü oyunçular" },
    { value: "wide", label: "Geniş", sub: "daha çox sürpriz" },
  ],
  timer: [
    { value: 10, label: "10 san" },
    { value: 15, label: "15 san" },
    { value: 20, label: "20 san" },
  ],
  bot: [
    { value: "easy", label: "Asan", sub: "tez-tez güzəştə gedir" },
    { value: "normal", label: "Orta", sub: "ağıllı alıcı" },
    { value: "hard", label: "Çətin", sub: "pulunu dəqiq xərcləyir" },
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
  if (mode === "solo") return { A: "Sən", B: "Bot" };
  return {
    A: settings.names?.A?.trim() || "Oyunçu 1",
    B: settings.names?.B?.trim() || "Oyunçu 2",
  };
}
