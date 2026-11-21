import { getLang } from "../i18n";

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Gündəlik oyunlar Bakı vaxtı ilə 00:00-da yenilənir (backend-dəki bakuDateKey ilə eyni hesab).
const BAKU_OFFSET_MS = 4 * 60 * 60 * 1000;
export const todayKey = (date = new Date()) =>
  new Date(date.getTime() + BAKU_OFFSET_MS).toISOString().slice(0, 10);

// Brauzerlərin çoxunda Azərbaycan dili üçün ay adları yoxdur ("M11 22" çıxır), ona görə əl ilə yazırıq.
const AZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
const LOCALE = { en: "en-GB", ru: "ru-RU" };
// "2026-11-22" → "22 noyabr" (dil seçiminə görə)
export function todayLabel(date = new Date()) {
  const key = todayKey(date);
  const [, month, day] = key.split("-").map(Number);
  const lang = getLang();
  if (!LOCALE[lang]) return `${day} ${AZ_MONTHS[month - 1]}`;
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(new Date(`${key}T12:00:00Z`));
  } catch {
    return `${day} ${AZ_MONTHS[month - 1]}`;
  }
}

export function shuffle(arr, random = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
