import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { tr } from "../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";

/** Shows messages sent with `window.dispatchEvent(new CustomEvent("fg:notice", { detail: text }))`. */
export default function NoticeToast() {
  const [text, setText] = useState("");
  useEffect(() => {
    let timer;
    const onNotice = (event) => {
      setText(String(event.detail ?? ""));
      clearTimeout(timer);
      timer = setTimeout(() => setText(""), 7000);
    };
    window.addEventListener("fg:notice", onNotice);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("fg:notice", onNotice);
    };
  }, []);
  if (!text) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-20 z-[65] mx-auto flex max-w-md items-start gap-2.5 rounded-[14px] border border-yellow/40 bg-surface p-3.5 shadow-2xl">
      <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-yellow" />
      <p className={`flex-1 ${FONT} text-sm text-ink`}>{text}</p>
      <button type="button" onClick={() => setText("")} aria-label={tr("Bağla")} className="shrink-0 text-faint hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
