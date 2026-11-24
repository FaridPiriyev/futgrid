import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Keyboard } from "lucide-react";
import { findByFullName } from "../../../lib/data";
import { FONT } from "./ui";

import { tr } from "../../../i18n";

export default function NameGuess({ data, onGuess, onUnknown, disabled = false, focusKey, placeholder, pickFrom }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setText("");
    if (!disabled) inputRef.current?.focus({ preventScroll: true });
  }, [focusKey, disabled]);

  const submit = (e) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value || disabled) return;
    const found = findByFullName(data, value);
    if (!found.length) {
      onUnknown?.(value);
      return;
    }
    setText("");
    onGuess(pickFrom ? pickFrom(found) : found[0]);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <label className="relative block min-w-0 flex-1">
        <Keyboard className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? tr("Futbolçunun tam adını yaz...")}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="send"
          className={`w-full border-2 bg-line/5 py-2.5 pl-11 pr-3 md:py-3 md:pl-12 md:pr-4 ${FONT} text-base text-ink placeholder-faint outline-none transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60 md:text-lg ${
            disabled ? "border-line/10" : "border-accent focus:bg-line/10"
          }`}
        />
      </label>
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className={`inline-flex shrink-0 items-center gap-1.5 bg-accent px-4 ${FONT} text-sm font-black uppercase tracking-wide text-white transition-opacity duration-200 disabled:opacity-40 md:px-5 md:text-base`}
      >
        <CornerDownLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{tr("Yaz")}</span>
      </button>
    </form>
  );
}
