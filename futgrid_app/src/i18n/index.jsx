import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en from "./en.json";
import ru from "./ru.json";

const DICTS = { en, ru };
const KEY = "fg-lang";

export const LANGS = [
  { code: "az", label: "AZ", name: "Azərbaycanca" },
  { code: "en", label: "EN", name: "English" },
  { code: "ru", label: "RU", name: "Русский" },
];

const read = () => {
  try {
    const v = localStorage.getItem(KEY);
    return LANGS.some((l) => l.code === v) ? v : "az";
  } catch {
    return "az";
  }
};

let current = read();

export const getLang = () => current;

export function tr(text, vars, context) {
  if (text == null || typeof text !== "string") return text;
  const dict = DICTS[current];
  let out =
    current === "az"
      ? text
      : ((context && dict?.[`${context}|${text}`]) ?? dict?.[text] ?? text);
  if (vars)
    out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return out;
}

const LangContext = createContext({ lang: current, setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(current);

  const setLang = useCallback((next) => {
    if (!LANGS.some((l) => l.code === next)) return;
    current = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setLangState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
