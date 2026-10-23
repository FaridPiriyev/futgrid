import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "fg-theme";

const readTheme = () => {
  if (typeof document === "undefined") return "dark";
  const current = document.documentElement.dataset.theme;
  if (current) return current === "light" ? "light" : "dark";
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

export default function ThemeToggle({ className = "h-9 w-9", tabIndex }) {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
    window.dispatchEvent(new Event("fg-theme"));
  }, [theme]);

  useEffect(() => {
    const sync = () => setTheme(readTheme());
    window.addEventListener("fg-theme", sync);
    return () => window.removeEventListener("fg-theme", sync);
  }, []);

  const light = theme === "light";

  return (
    <button
      type="button"
      tabIndex={tabIndex}
      onClick={() => setTheme(light ? "dark" : "light")}
      aria-label={light ? "Tünd rejimə keç" : "Açıq rejimə keç"}
      title={light ? "Tünd rejim" : "Açıq rejim"}
      className={`relative flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-110 active:scale-95 ${className}`}
    >
      <Sun
        className={`absolute h-5 w-5 text-amber-400 transition-all duration-500 ease-out ${
          light
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`absolute h-5 w-5 text-sky-300 transition-all duration-500 ease-out ${
          light
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
