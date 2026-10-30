import { FONT } from "./ui";

export function Loader({ text = "Oyunçular yüklənir..." }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-line/10 border-t-accent" />
      <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>{text}</p>
    </div>
  );
}

export function Notice({ title, text }) {
  return (
    <div className="mx-auto max-w-xl border border-line/10 bg-surface/85 p-6 text-center">
      <p className={`${FONT} text-xl font-bold uppercase text-ink`}>{title}</p>
      <p className={`mt-2 ${FONT} text-base font-light text-muted`}>{text}</p>
    </div>
  );
}