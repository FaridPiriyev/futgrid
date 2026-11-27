import { useEffect } from "react";
import { X } from "lucide-react";
import ProfileCard from "./ProfileCard";
import { tr } from "../../i18n";

export default function ProfileModal({ username, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr("Oyunçu profili")}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[20px] border border-line/10 bg-surface p-5 shadow-2xl animate-[duelIn_0.25s_ease-out] sm:rounded-[20px] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{"@keyframes duelIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }"}</style>
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-accent via-yellow to-accent" />
        <button
          type="button"
          onClick={onClose}
          aria-label={tr("Bağla")}
          className="absolute right-4 top-4 text-faint transition-colors duration-200 hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>
        <ProfileCard username={username} />
      </div>
    </div>
  );
}
