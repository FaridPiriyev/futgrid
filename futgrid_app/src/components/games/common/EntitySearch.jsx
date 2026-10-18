import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchEntities } from "../../../lib/games/common";
import EntityBadge from "./EntityBadge";
import { FONT } from "./ui";

export default function EntitySearch({ data, types = ["club", "country"], onSelect, disabled = false, focusKey, placeholder, accent = "border-blue-500", secret = false }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => (disabled ? [] : searchEntities(data, query, { types })), [data, query, disabled, types]);

  useEffect(() => {
    setQuery("");
    if (!disabled) inputRef.current?.focus();
  }, [focusKey, disabled]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const pick = (e) => {
    setQuery("");
    onSelect(e);
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
    }
  };

  return (
    <div className="relative">
      <label className="relative block">
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
          aria-controls="entity-search-list"
          className={`w-full border-2 bg-white/5 py-3 pl-12 pr-4 ${secret ? "[-webkit-text-security:disc]" : ""} ${FONT} text-base text-white placeholder-neutral-500 outline-none transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 md:text-lg ${
            disabled ? "border-white/10" : `${accent} focus:bg-white/10`
          }`}
        />
      </label>

      {results.length > 0 && (
        <ul
          id="entity-search-list"
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto border border-white/10 bg-[#0b0e14] shadow-2xl"
        >
          {results.map((e, i) => (
            <li key={e.key} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(e)}
                className={`flex w-full items-center gap-3 border-l-2 px-4 py-2 text-left transition-colors duration-150 ${
                  i === active ? "border-l-blue-500 bg-blue-500/15" : "border-l-transparent hover:bg-white/5"
                }`}
              >
                <span className="flex h-8 w-10 shrink-0 items-center justify-center">
                  <EntityBadge entity={e} size="h-8 w-8" flagSize="w-9" />
                </span>
                <span className={`min-w-0 flex-1 truncate ${FONT} text-base font-bold uppercase tracking-wide text-white`}>{e.label}</span>
                <span className={`shrink-0 ${FONT} text-xs uppercase tracking-wider text-neutral-500`}>{e.type === "club" ? "Klub" : "Ölkə"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!disabled && query.trim().length >= 2 && results.length === 0 && (
        <p className={`absolute inset-x-0 top-full z-30 mt-1 border border-white/10 bg-[#0b0e14] px-4 py-3 ${FONT} text-sm text-neutral-500`}>
          Tapılmadı.
        </p>
      )}
    </div>
  );
}
