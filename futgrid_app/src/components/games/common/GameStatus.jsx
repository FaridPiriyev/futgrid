import { FONT } from "./ui";

export function Loader({ text = "Oyunçular yüklənir..." }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
      <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-neutral-400`}>{text}</p>
    </div>
  );
}

export function Notice({ title, text }) {
  return (
    <div className="mx-auto max-w-xl border border-white/10 bg-[#0b0e14]/85 p-6 text-center">
      <p className={`${FONT} text-xl font-bold uppercase text-white`}>{title}</p>
      <p className={`mt-2 ${FONT} text-base font-light text-neutral-400`}>{text}</p>
    </div>
  );
}
