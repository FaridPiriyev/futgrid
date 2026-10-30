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
    text: "text-blue-400",
    border: "border-blue-500",
    soft: "bg-blue-500/10",
    solid: "bg-blue-500 text-white",
    bar: "bg-blue-500",
    ring: "#3b82f6",
    shadow: "shadow-[0_0_0_1px_rgba(59,130,246,0.45),0_20px_60px_-30px_rgba(59,130,246,0.7)]",
  },
  B: {
    text: "text-amber-300",
    border: "border-amber-400",
    soft: "bg-amber-400/10",
    solid: "bg-amber-400 text-black",
    bar: "bg-amber-400",
    ring: "#fbbf24",
    shadow: "shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_20px_60px_-30px_rgba(251,191,36,0.6)]",
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
