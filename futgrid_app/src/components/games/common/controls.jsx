import { Check } from "lucide-react";
import { FONT } from "./ui";

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex overflow-hidden border border-white/10">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 border-r border-white/10 px-3 py-2.5 text-left transition-colors duration-200 last:border-r-0 ${
              active ? "bg-blue-500 text-white" : "bg-white/5 text-neutral-300 hover:bg-white/10"
            }`}
          >
            <span className={`block ${FONT} text-sm font-bold uppercase tracking-wide md:text-base`}>{o.label}</span>
            {o.sub && (
              <span className={`block ${FONT} text-xs ${active ? "text-blue-100" : "text-neutral-500"}`}>{o.sub}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, sub, Icon }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 py-2 text-left"
    >
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-white/5 text-blue-400">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block ${FONT} text-base font-bold uppercase tracking-wide text-white`}>{label}</span>
        {sub && <span className={`block ${FONT} text-sm text-neutral-500`}>{sub}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-blue-500" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function Checkbox({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 py-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors duration-200 ${
          checked ? "border-blue-500 bg-blue-500" : "border-white/25 bg-white/5"
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </span>
      <span className={`${FONT} text-base text-neutral-200`}>{label}</span>
    </button>
  );
}

export function Panel({ title, sub, children, className = "" }) {
  return (
    <section className={`border border-white/10 bg-[#0b0e14]/85 p-4 backdrop-blur-sm md:p-6 ${className}`}>
      {title && <h2 className={`${FONT} text-xl font-bold uppercase tracking-wide text-white md:text-2xl`}>{title}</h2>}
      {sub && <p className={`${FONT} text-sm text-neutral-500`}>{sub}</p>}
      <div className={title || sub ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
