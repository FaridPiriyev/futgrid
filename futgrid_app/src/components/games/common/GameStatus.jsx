import { FONT } from "./ui";

import { tr } from "../../../i18n";
/**
 * Skeleton placeholder instead of a spinner: grey shapes roughly where the game's
 * header, board and controls will appear, so the page doesn't jump when data arrives.
 */
export function Loader({ text = "Oyunçular yüklənir...", variant = "game" }) {
  const bar = "animate-pulse rounded-xl bg-line/8 motion-reduce:animate-none";
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-4xl py-6">
      {variant === "game" ? (
        <>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className={`${bar} h-16`} />
            <div className={`${bar} h-10 w-10 rounded-full`} />
            <div className={`${bar} h-16`} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`${bar} aspect-[4/3]`} style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div className={`${bar} mt-4 h-12`} />
        </>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`${bar} h-14`} style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}
      <p className={`mt-4 text-center ${FONT} text-xs uppercase tracking-[0.2em] text-muted`}>{tr(text)}</p>
    </div>
  );
}

export function Notice({ title, text }) {
  return (
    <div className="mx-auto max-w-xl border border-line/10 bg-surface/85 p-6 text-center">
      <p className={`${FONT} text-xl font-bold uppercase text-ink`}>{tr(title)}</p>
      <p className={`mt-2 ${FONT} text-base font-light text-muted`}>{tr(text)}</p>
    </div>
  );
}
