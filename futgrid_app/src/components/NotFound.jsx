import { Link } from "react-router-dom";
import { tr } from "../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className={`${FONT} text-sm font-extrabold uppercase tracking-[0.3em] text-accent`}>404</p>
      <h1 className={`${FONT} mt-3 text-4xl font-black uppercase text-ink`}>{tr("Səhifə tapılmadı")}</h1>
      <p className={`${BODY} mt-3 text-ink/70`}>{tr("Axtardığın ünvan mövcud deyil və ya köçürülüb.")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className={`${FONT} rounded-lg bg-accent px-5 py-2.5 text-sm font-extrabold uppercase tracking-wider text-black`}>
          {tr("Ana səhifə")}
        </Link>
        <Link to="/oyunlar" className={`${FONT} rounded-lg border border-line/20 px-5 py-2.5 text-sm font-extrabold uppercase tracking-wider text-ink`}>
          {tr("Oyunlara bax")}
        </Link>
      </div>
    </main>
  );
}
