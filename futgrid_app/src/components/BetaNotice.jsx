import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FlaskConical, MessageSquareWarning, X } from "lucide-react";
import { tr } from "../i18n";
import { CONTACT_EMAIL } from "../lib/contact";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";
const STORAGE_KEY = "futgrid:beta-notice";
const HIDE_FOR_MS = 3 * 24 * 60 * 60 * 1000;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < HIDE_FOR_MS;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    return;
  }
}

export default function BetaNotice() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpen(!dismissedRecently());
      setReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!ready || pathname.startsWith("/admin")) return null;

  const close = () => {
    rememberDismiss();
    setOpen(false);
  };

  return (
    <>
      <style>{`
        @keyframes fgBetaIn { from { opacity: 0; transform: translateX(-110%); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fgBetaTab { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .fg-beta-anim { animation: none !important; } }
      `}</style>

      {open ? (
        <aside
          role="status"
          aria-label={tr("Test mərhələsi")}
          className="fg-beta-anim fixed inset-x-3 bottom-[84px] z-40 animate-[fgBetaIn_0.5s_cubic-bezier(0.2,0.8,0.2,1)_both] sm:inset-x-auto md:bottom-5 sm:left-5 sm:w-[22rem]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-yellow/40 bg-surface shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-yellow" />
            <div className="p-3.5 pl-4.5 sm:p-4 sm:pl-5">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-yellow/15 text-yellow">
                  <FlaskConical className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`inline-flex items-center gap-1.5 ${FONT} text-[11px] font-bold uppercase tracking-[0.16em] text-yellow`}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="fg-beta-anim absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow" />
                    </span>
                    {tr("Test mərhələsi")}
                  </p>
                  <p className={`mt-1 ${FONT} text-base font-extrabold uppercase leading-tight text-ink sm:text-lg`}>
                    {tr("Sayt hələ test rejimindədir")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label={tr("Bağla")}
                  className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-line/10 hover:text-ink"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
              <p className={`mt-2.5 ${BODY} text-[13px] leading-relaxed text-muted sm:text-sm`}>
                {tr(
                  "Bəzi oyunlarda xəta (bug) və ya yavaşlıq ola bilər. Gördüyün problemi anketdə yazmağı unutma — hər mesajı oxuyuruq.",
                )}
              </p>
              <div className="mt-3 flex items-center gap-2 sm:mt-4">
                <Link
                  to="/#contact"
                  onClick={close}
                  className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] bg-yellow px-4 ${FONT} text-sm font-extrabold uppercase tracking-wide text-on-yellow transition-transform hover:-translate-y-0.5`}
                >
                  <MessageSquareWarning className="h-4 w-4" />
                  {tr("Problemi bildir")}
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className={`h-10 rounded-[10px] border border-line/15 px-4 ${FONT} text-sm font-bold uppercase tracking-wide text-muted transition-colors hover:border-line/30 hover:text-ink`}
                >
                  {tr("Anladım")}
                </button>
              </div>
              <p className={`mt-3 ${BODY} text-xs text-faint`}>
                {tr("və ya yaz:")}{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-muted underline-offset-2 hover:text-ink hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={tr("Test mərhələsi haqqında")}
          className={`fg-beta-anim fixed bottom-36 md:bottom-24 left-0 z-40 flex animate-[fgBetaTab_0.4s_ease-out_both] items-center gap-1.5 rounded-r-lg border border-l-0 border-yellow/40 bg-surface py-2 pl-1.5 pr-2 ${FONT} text-[11px] font-bold uppercase tracking-[0.14em] text-yellow shadow-lg transition-[padding] hover:pl-3`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Beta
        </button>
      )}
    </>
  );
}
