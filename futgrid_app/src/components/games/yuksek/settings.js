const KEY = "futgrid:yuksek:settings";

export const DEFAULT_SETTINGS = {
  difficulty: "normal",
};

export const OPTIONS = {
  difficulty: [
    { value: "easy", label: "Asan", sub: "ən bahalı 300 oyunçu" },
    { value: "normal", label: "Normal", sub: "ilk 1200 oyunçu" },
    { value: "hard", label: "Çətin", sub: "hamısı" },
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
