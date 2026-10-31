import { Check, Lock } from "lucide-react";
import { FONT } from "./ui";

export const SETTINGS_CARD =
  "relative overflow-hidden rounded-2xl border border-edge bg-surface p-5 shadow-[0_30px_60px_-44px_var(--fg-shadow)] md:p-8";

const COLS = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 @xl:grid-cols-4",
  5: "grid-cols-2 @2xl:grid-cols-5",
};

export function Field({ label, hint, children }) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <p
          className={`flex items-center gap-2 ${FONT} text-xs font-extrabold uppercase tracking-[0.18em] text-ink`}
        >
          <span aria-hidden="true" className="h-3 w-1 rounded-full bg-accent" />
          {label}
        </p>
        {hint && (
          <span className={`${FONT} text-xs text-muted`}>{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="@container">
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-2 ${COLS[options.length] ?? "grid-cols-2 @md:grid-cols-3"}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`group relative min-w-0 rounded-xl border-2 px-2 py-2.5 text-left @sm:px-3.5 transition-[border-color,background-color,translate,box-shadow] duration-200 ${
              active
                ? "border-accent bg-accent/8 shadow-[0_10px_24px_-16px_var(--fg-accent)]"
                : "border-edge bg-surface hover:-translate-y-0.5 hover:border-accent/40"
            }`}
          >
            <span
              className={`block leading-tight hyphens-auto break-words ${FONT} text-xs font-extrabold uppercase tracking-normal @sm:pr-5 @sm:text-sm @sm:tracking-wide @lg:text-[15px] ${
                active ? "text-accent" : "text-ink"
              }`}
            >
              {o.label}
            </span>
            {o.sub && (
              <span
                className={`mt-0.5 block leading-tight ${FONT} text-xs ${
                  active ? "text-ink-soft" : "text-muted"
                }`}
              >
                {o.sub}
              </span>
            )}
            <span
              aria-hidden="true"
              className={`absolute right-2.5 top-2.5 hidden h-4.5 w-4.5 place-items-center @sm:grid rounded-full transition-[background-color,box-shadow,scale] duration-200 ${
                active
                  ? "scale-100 bg-accent text-white"
                  : "scale-90 bg-transparent shadow-[inset_0_0_0_2px_var(--fg-edge)]"
              }`}
            >
              {active && <Check className="h-3 w-3" strokeWidth={3.5} />}
            </span>
          </button>
        );
      })}
    </div>
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
      className={`flex w-full items-center gap-3.5 rounded-xl border-2 px-3.5 py-3 text-left transition-colors duration-200 ${
        checked
          ? "border-accent/50 bg-accent/5"
          : "border-edge bg-surface hover:border-accent/30"
      }`}
    >
      {Icon && (
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors duration-200 ${
            checked ? "bg-accent text-white" : "bg-page-2 text-accent"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={`block ${FONT} text-[15px] font-extrabold uppercase tracking-wide text-ink`}
        >
          {label}
        </span>
        {sub && (
          <span className={`block ${FONT} text-sm text-muted`}>{sub}</span>
        )}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-accent" : "bg-dim/40"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

export function Checkbox({ checked, onChange, label, disabled = false, locked = false }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border-2 py-1.5 pl-1.5 pr-4 text-left transition-[border-color,background-color] duration-200 disabled:cursor-not-allowed ${
        checked
          ? "border-accent bg-accent text-white"
          : "border-edge bg-surface text-ink enabled:hover:border-accent/40"
      } ${disabled && !locked ? "opacity-45" : ""}`}
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-white/20" : "bg-page-2"
        }`}
      >
        {locked ? (
          <Lock className="h-3 w-3" strokeWidth={3} />
        ) : (
          checked && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
        )}
      </span>
      <span className={`${FONT} text-sm font-bold uppercase tracking-wide`}>
        {label}
      </span>
    </button>
  );
}

export function Panel({ title, sub, children, className = "" }) {
  return (
    <section className={`${SETTINGS_CARD} ${className}`}>
      {title && (
        <h2
          className={`${FONT} text-xl font-black uppercase tracking-wide text-ink md:text-2xl`}
        >
          {title}
        </h2>
      )}
      {sub && <p className={`${FONT} text-sm text-muted`}>{sub}</p>}
      <div className={title || sub ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

export function SettingsHeader({ title, accent, sub, step }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-edge pb-4">
      <div>
        <h2
          className={`${FONT} text-2xl font-black uppercase leading-none tracking-wide text-ink md:text-3xl`}
        >
          {title}
          {accent && <span className="text-accent"> · {accent}</span>}
        </h2>
        {sub && (
          <p className={`mt-1.5 ${FONT} text-sm text-muted md:text-base`}>
            {sub}
          </p>
        )}
      </div>
      {step && (
        <span
          className={`rounded-full bg-yellow px-3 py-1 ${FONT} text-xs font-black uppercase tracking-[0.14em] text-on-yellow`}
        >
          {step}
        </span>
      )}
    </div>
  );
}
