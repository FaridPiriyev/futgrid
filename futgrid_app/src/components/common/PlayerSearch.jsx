import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { birthYear, searchPlayers } from "../../../lib/data";
import { FONT } from "./ui";

export default function PlayerSearch({
  data,
  onSelect,
  onCancel,
  disabled = false,
  focusKey,
  placeholder = "Oyunçunun adını yaz...",
  rightSlot,
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => (disabled ? [] : searchPlayers(data, query)), [data, query, disabled]);

  useEffect(() => {
    setQuery("");
    if (!disabled) inputRef.current?.focus();
  }, [focusKey, disabled]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const pick = (p) => {
    setQuery("");
    onSelect(p);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setQuery("");
      onCancel?.();
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
          <input
            ref={inputRef}
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="player-search-list"
            className={`w-full border-2 bg-white/5 py-3 pl-12 pr-4 ${FONT} text-base text-white placeholder-neutral-500 outline-none transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 md:text-lg ${
              disabled ? "border-white/10" : "border-blue-500 focus:bg-white/10"
            }`}
          />
        </label>
        {rightSlot}
      </div>

      {results.length > 0 && (
        <ul
          id="player-search-list"
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto border border-white/10 bg-[#0b0e14] shadow-2xl"
        >
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className={`flex w-full items-center justify-between gap-3 border-l-2 px-4 py-3 text-left transition-colors duration-150 ${
                  i === active ? "border-l-blue-500 bg-blue-500/15" : "border-l-transparent hover:bg-white/5"
                }`}
              >
                <span className={`truncate ${FONT} text-base font-bold uppercase tracking-wide text-white`}>{p.name}</span>
                <span className={`shrink-0 ${FONT} text-sm text-neutral-400`}>
                  {[birthYear(p), p.position, p.nationality_code].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!disabled && query.trim().length >= 2 && results.length === 0 && (
        <p className={`absolute inset-x-0 top-full z-30 mt-1 border border-white/10 bg-[#0b0e14] px-4 py-3 ${FONT} text-sm text-neutral-500`}>
          Bu adla oyunçu tapılmadı.
        </p>
      )}
    </div>
  );
}
