import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Swords, X } from "lucide-react";
import { activeDuels, forgetDuel } from "../lib/games/duelStore";
import { DUEL_GAME_IDS, DUEL_GAME_PATHS, gameName } from "../lib/games/names";
import { tr } from "../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";

/** "You have an unfinished online game — go back" strip, shown on every page except that game's. */
export default function ResumeDuelBanner() {
  const { pathname } = useLocation();
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    const [latest] = activeDuels(DUEL_GAME_IDS);
    setEntry(latest && DUEL_GAME_PATHS[latest.game] !== pathname ? latest : null);
  }, [pathname]);

  if (!entry) return null;
  const href = `${DUEL_GAME_PATHS[entry.game]}?otaq=${entry.code}`;
  return (
    <div className="fixed inset-x-3 bottom-[84px] z-[55] md:bottom-5 mx-auto flex max-w-xl items-center gap-3 rounded-[14px] border border-accent/40 bg-surface/95 p-3 shadow-2xl backdrop-blur">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
        <Swords className="h-5 w-5" />
      </span>
      <p className={`min-w-0 flex-1 ${FONT} text-sm text-ink`}>
        <span className="block font-extrabold uppercase">{tr("Yarımçıq oyunun var")}</span>
        <span className="block truncate text-xs text-muted">{gameName(entry.game)}</span>
      </p>
      <Link
        to={href}
        onClick={() => setEntry(null)}
        className={`inline-flex h-9 shrink-0 items-center rounded-[10px] bg-accent-lo px-3.5 ${FONT} text-xs font-bold uppercase tracking-wider text-white hover:bg-accent`}
      >
        {tr("Qayıt")}
      </Link>
      <button
        type="button"
        aria-label={tr("Bağla")}
        onClick={() => {
          forgetDuel(entry.game);
          setEntry(null);
        }}
        className="shrink-0 text-faint hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
