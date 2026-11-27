import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { tr } from "../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const KEY = "fg-install-dismissed";

// Captured once for the whole app: the browser fires it only once per page load.
let deferred = null;
const listeners = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    listeners.forEach((fn) => fn(true));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((fn) => fn(false));
  });
}

const standalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * "Install FutGrid as an app" card on the home page (Android/desktop Chrome: real prompt;
 * iPhone: short "Share → Add to Home Screen" hint). Dismissal is remembered for 30 days.
 */
export default function InstallPrompt() {
  const { pathname } = useLocation();
  const [available, setAvailable] = useState(Boolean(deferred));
  const [dismissed, setDismissed] = useState(() => {
    try {
      return Date.now() - Number(localStorage.getItem(KEY) ?? 0) < 30 * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    listeners.add(setAvailable);
    // Don't greet people with it immediately.
    const id = setTimeout(() => setReady(true), 20_000);
    return () => {
      listeners.delete(setAvailable);
      clearTimeout(id);
    };
  }, []);

  if (pathname !== "/" || dismissed || !ready || standalone()) return null;
  const ios = isIos();
  if (!available && !ios) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      // private mode
    }
  };
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    close();
  };

  return (
    <div className="fixed inset-x-3 bottom-[84px] z-[56] mx-auto flex max-w-md items-center gap-3 rounded-[16px] border border-accent/40 bg-surface p-3 shadow-2xl md:bottom-5">
      <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className={`${FONT} text-sm font-extrabold uppercase text-ink`}>{tr("FutGrid-i tətbiq kimi quraşdır")}</p>
        <p className={`${FONT} text-xs text-muted`}>
          {ios ? (
            <>
              {tr("Safari-də")} <Share className="inline h-3.5 w-3.5" /> {tr("“Paylaş” → “Ana ekrana əlavə et” seç")}
            </>
          ) : (
            tr("Bir toxunuşla aç, bildirişlər gəlsin")
          )}
        </p>
      </div>
      {!ios ? (
        <button
          type="button"
          onClick={() => void install()}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-accent-lo px-3 ${FONT} text-xs font-bold uppercase text-white hover:bg-accent`}
        >
          <Download className="h-4 w-4" />
          {tr("Quraşdır")}
        </button>
      ) : null}
      <button type="button" onClick={close} aria-label={tr("Bağla")} className="shrink-0 text-faint hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
