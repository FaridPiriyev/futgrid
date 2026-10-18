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
    text: "text-blue-400",
    border: "border-blue-500",
    bg: "bg-blue-500/15",
    solid: "bg-blue-500 text-white",
    ring: "ring-blue-500",
    dot: "bg-blue-400",
    glow: "rgba(59,130,246,0.65)",
  },
  B: {
    text: "text-amber-300",
    border: "border-amber-400",
    bg: "bg-amber-400/10",
    solid: "bg-amber-400 text-black",
    ring: "ring-amber-400",
    dot: "bg-amber-300",
    glow: "rgba(251,191,36,0.6)",
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
