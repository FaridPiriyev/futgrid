import { useEffect } from "react";
import { X } from "lucide-react";
import { FONT } from "./ui";

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
        className="relative w-full max-w-lg border border-white/10 bg-[#0b0e14] p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-blue-500" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Bağla"
            className="absolute right-4 top-4 text-neutral-500 transition-colors duration-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {eyebrow && (
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-blue-500`}>{eyebrow}</p>
        )}
        {title && (
          <h2 className={`mt-1 pr-8 ${FONT} text-2xl font-bold uppercase leading-tight text-white md:text-3xl`}>
            {title}
          </h2>
        )}
        {children && <div className="mt-5">{children}</div>}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}
