const KEY = "futgrid:x0x:settings";

export const DEFAULT_SETTINGS = {
  era: "active",
  difficulty: "normal",
  steals: "none",
  bestOf: 5,
  timer: 60,
  multipleChoice: false,
  categories: { club: true, country: true, trophy: true, coach: true },
  names: { X: "", O: "" },
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
  steals: [
    { value: "none", label: "Oğurlama yox" },
    { value: 3, label: "3 oğurlama" },
    { value: "unlimited", label: "Limitsiz" },
  ],
  bestOf: [
    { value: 3, label: "3 raund", sub: "2 qələbə" },
    { value: 5, label: "5 raund", sub: "3 qələbə" },
    { value: 7, label: "7 raund", sub: "4 qələbə" },
    { value: "unlimited", label: "Limitsiz", sub: "sonsuz" },
  ],
  timer: [
    { value: 15, label: "Sürətli", sub: "15 san." },
    { value: 40, label: "Normal", sub: "40 san." },
    { value: 60, label: "Taktik", sub: "60 san." },
    { value: 0, label: "Limitsiz", sub: "vaxt yoxdur" },
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
  settings.names?.[mark]?.trim() || (mark === "X" ? "Oyunçu 1" : "Oyunçu 2");
