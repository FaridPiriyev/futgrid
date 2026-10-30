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
    { value: "active", label: "Aktiv", sub: "indiki heyətlər" },
    { value: "all", label: "Bütün zamanlar", sub: "legendlər daxil" },
  ],
  difficulty: [
    { value: "easy", label: "Asan", sub: "top klublar, FIFA ilk 40" },
    { value: "normal", label: "Normal", sub: "FIFA ilk 100" },
    { value: "hard", label: "Çətin", sub: "hamısı" },
  ],
  targetPresets: [1, 3, 5, 10],
  rounds: [
    { value: 5, label: "5 sual" },
    { value: 10, label: "10 sual" },
    { value: 20, label: "20 sual" },
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
  settings.names?.[side]?.trim() || (side === "A" ? "Oyunçu 1" : "Oyunçu 2");
