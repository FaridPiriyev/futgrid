import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { birthYear, searchPlayers } from "../../../lib/data";
import { FONT, listPlacement, useMobileInput } from "./ui";

import { tr } from "../../../i18n";
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
  const box = useMobileInput(inputRef);

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
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
          <input
            ref={inputRef}
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={tr(placeholder)}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="player-search-list"
            className={`w-full border-2 bg-line/5 py-2.5 pl-11 pr-3 md:py-3 md:pl-12 md:pr-4 ${FONT} text-base text-ink placeholder-faint outline-none transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 md:text-lg ${
              disabled ? "border-line/10" : "border-accent focus:bg-line/10"
            }`}
          />
        </label>
        {rightSlot}
      </div>

      {results.length > 0 && (
        <ul
          id="player-search-list"
          role="listbox"
          style={box.maxHeight ? { maxHeight: box.maxHeight } : undefined}
          className={`fg-scroll absolute inset-x-0 z-40 max-h-80 overflow-y-auto overscroll-contain rounded-xl border border-edge bg-surface p-1.5 shadow-[0_26px_50px_-22px_var(--fg-shadow)] ${listPlacement(box)}`}
        >
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left md:px-3.5 md:py-3 transition-colors duration-150 ${
                  i === active ? "bg-accent/12 shadow-[inset_3px_0_0_var(--fg-accent)]" : "hover:bg-line/5"
                }`}
              >
                <span className={`truncate ${FONT} text-sm font-bold uppercase tracking-wide text-ink md:text-base`}>{p.name}</span>
                <span className={`shrink-0 ${FONT} text-xs text-muted md:text-sm`}>
                  {[birthYear(p), p.position, p.nationality_code].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!disabled && query.trim().length >= 2 && results.length === 0 && (
        <p className={`absolute inset-x-0 z-40 rounded-xl border border-edge bg-surface px-4 py-3 shadow-[0_26px_50px_-22px_var(--fg-shadow)] ${listPlacement(box)} ${FONT} text-sm text-faint`}>
          {tr("Bu adla oyunçu tapılmadı.")}
        </p>
      )}
    </div>
  );
}
