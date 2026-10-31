import { useEffect } from "react";
import { X } from "lucide-react";
import { FONT } from "./ui";

import { tr } from "../../../i18n";
export default function ResultModal({ open, onClose, eyebrow, title, children, actions }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg border border-line/10 bg-surface p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={tr("Bağla")}
            className="absolute right-4 top-4 text-faint transition-colors duration-300 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {eyebrow && (
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-accent`}>{tr(eyebrow)}</p>
        )}
        {title && (
          <h2 className={`mt-1 pr-8 ${FONT} text-2xl font-bold uppercase leading-tight text-ink md:text-3xl`}>
            {tr(title)}
          </h2>
        )}
        {children && <div className="mt-5">{children}</div>}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}
