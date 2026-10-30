import { birthYear } from "../../../lib/data";
import { FONT } from "../common/ui";

export default function X0XChoices({ options, onSelect }) {
  if (!options.length) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
      {options.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p)}
          className="group flex items-center gap-3 border border-line/10 bg-line/5 px-3 py-2 text-left transition-colors duration-200 hover:border-accent hover:bg-accent/15"
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center bg-accent ${FONT} text-sm font-bold text-white`}
          >
            {String.fromCharCode(65 + i)}
          </span>
          <span className="min-w-0">
            <span
              className={`block truncate ${FONT} text-base font-bold uppercase tracking-wide text-ink`}
            >
              {p.name}
            </span>
            <span className={`block ${FONT} text-xs text-faint`}>
              {[birthYear(p), p.position, p.nationality_code]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
