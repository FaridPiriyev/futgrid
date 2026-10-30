import { useEffect, useMemo, useState } from "react";
import { Flag as FlagIcon, RotateCcw, Timer, Trophy } from "lucide-react";
import { clubsOf, pickClubs } from "../../../lib/games/fiveClubs";
import ClubBadge from "../common/ClubBadge";
import PlayerSearch from "../common/PlayerSearch";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";

export const FIVE_KEYFRAMES = `
@keyframes fcIn { from { opacity: 0; transform: translateY(18px) scale(.94); } to { opacity: 1; transform: none; } }
@keyframes fcHit { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--fg-accent) 70%, transparent); transform: scale(1); } 40% { transform: scale(1.06); } 100% { box-shadow: 0 0 0 14px transparent; transform: scale(1); } }
@keyframes fcShake { 0%,100% { transform: translateX(0); } 25%,75% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
@keyframes fcPop { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
`;

function ClubTile({ club, flash, index, count }) {
  return (
    <div
      className="animate-[fcIn_0.5s_cubic-bezier(.2,.8,.2,1)_both]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div
        key={flash}
        className={`relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl border border-line/15 bg-surface shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)] ${
          flash ? "animate-[fcHit_0.7s_ease-out]" : ""
        }`}
      >
        <span className="flex flex-1">
          <ClubBadge club={club} />
        </span>
        <span className={`border-t border-line/10 py-1.5 text-center ${FONT} text-xs font-bold text-accent`}>
          {count} cavab
        </span>
      </div>
    </div>
  );
}

export default function FiveClubsGame({ data, difficulty, seconds }) {
  const [round, setRound] = useState(0);
  const set = useMemo(() => pickClubs(data, difficulty), [data, difficulty, round]);
  const [found, setFound] = useState([]);
  const [left, setLeft] = useState(seconds);
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);
  const [flash, setFlash] = useState({});
  const [over, setOver] = useState(false);

  const answers = set.answers;
  const score = found.reduce((s, f) => s + f.count, 0);
  const perClub = useMemo(() => {
    const m = new Map(set.clubs.map((c) => [c.id, 0]));
    for (const f of found) for (const c of f.clubs) m.set(c.id, m.get(c.id) + 1);
    return m;
  }, [found, set]);

  useEffect(() => {
    if (over) return;
    if (left <= 0) {
      setOver(true);
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, over]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(t);
  }, [message]);

  const guess = (p) => {
    if (over) return;
    if (found.some((f) => f.player.id === p.id)) {
      setMessage({ bad: true, text: `${p.name} artıq yazılıb` });
      setShake((s) => s + 1);
      return;
    }
    const clubs = clubsOf(set.clubs, p);
    if (clubs.length < 2) {
      setMessage({
        bad: true,
        text: clubs.length ? `${p.name} bu klublardan yalnız birində oynayıb (${clubs[0].name})` : `${p.name} bu klubların heç birində oynamayıb`,
      });
      setShake((s) => s + 1);
      return;
    }
    setFound((f) => [{ player: p, clubs, count: clubs.length }, ...f]);
    setMessage({ bad: false, text: `+${clubs.length} xal · ${p.name}` });
    setFlash((fl) => {
      const n = { ...fl };
      for (const c of clubs) n[c.id] = (n[c.id] ?? 0) + 1;
      return n;
    });
  };

  const restart = () => {
    setRound((r) => r + 1);
    setFound([]);
    setLeft(seconds);
    setOver(false);
    setFlash({});
  };

  const pct = Math.max(0, left / seconds) * 100;
  const missed = answers.filter((a) => !found.some((f) => f.player.id === a.player.id)).slice(0, 8);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
          Xal <span className="text-2xl font-bold text-ink">{score}</span>
          <span className="mx-2 text-dim">·</span>
          Tapılan <span className="font-bold text-ink">{found.length}</span>
        </p>
        <div className="flex items-center gap-2">
          <Timer className={`h-5 w-5 ${left <= 10 && !over ? "text-bad" : "text-accent"}`} />
          <span className={`${FONT} text-2xl font-bold tabular-nums ${left <= 10 && !over ? "text-bad" : "text-ink"}`}>
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
          {!over && (
            <button type="button" onClick={() => setOver(true)} className={`ml-2 inline-flex items-center gap-1.5 ${FONT} text-sm font-bold uppercase text-muted hover:text-ink`}>
              <FlagIcon className="h-4 w-4" />
              Bitir
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden bg-line/10">
        <span
          className={`block h-full transition-[width] duration-1000 ease-linear ${left <= 10 ? "bg-bad" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div key={round} className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5 md:gap-4">
        {set.clubs.map((c, i) => (
          <ClubTile key={c.id} club={c} index={i} flash={flash[c.id] ?? 0} count={perClub.get(c.id)} />
        ))}
      </div>

      <p className={`mt-5 text-center ${FONT} text-sm text-muted`}>
        Bu klublardan <span className="font-bold text-ink">ən azı ikisində</span> oynamış futbolçu yaz. Neçə klubda oynayıbsa, o qədər xal.
      </p>

      {!over ? (
        <div className="mx-auto mt-5 max-w-2xl">
          <div className="relative">
            <div key={shake} className={shake ? "animate-[fcShake_0.35s_ease-out]" : ""}>
              <PlayerSearch data={data} onSelect={guess} focusKey={round} />
            </div>
            {message && (
              <p
                key={message.text}
                className={`mt-2 ${FONT} text-sm font-bold animate-[fcPop_0.2s_ease-out] ${message.bad ? "text-bad" : "text-good"}`}
              >
                {message.text}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-6 max-w-2xl border border-line/10 bg-surface p-5 text-center animate-[fcIn_0.4s_ease-out_both]">
          <Trophy className="mx-auto h-7 w-7 text-gold" />
          <p className={`mt-2 ${FONT} text-4xl font-bold text-ink`}>{score} xal</p>
          <p className={`${FONT} text-sm text-muted`}>{found.length} futbolçu tapdın</p>
          {missed.length > 0 && (
            <>
              <p className={`mt-5 ${FONT} text-xs font-bold uppercase tracking-[0.2em] text-faint`}>Tapmadığın cavablardan bəziləri</p>
              <ul className="mt-2 flex flex-wrap justify-center gap-2">
                {missed.map((a) => (
                  <li key={a.player.id} className={`border border-line/10 px-2.5 py-1 ${FONT} text-sm text-ink`}>
                    {a.player.name} <span className="font-bold text-accent">+{a.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={restart} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              Yeni klublar
            </button>
          </div>
        </div>
      )}

      {found.length > 0 && (
        <ul className="mx-auto mt-6 max-w-2xl space-y-2">
          {found.map((f) => (
            <li key={f.player.id} className="flex items-center gap-3 border border-line/10 bg-surface px-3 py-2 animate-[fcPop_0.3s_ease-out_both]">
              <span className={`flex-1 truncate ${FONT} text-base font-bold text-ink`}>{f.player.name}</span>
              <span className={`hidden ${FONT} text-xs text-muted sm:inline`}>
                {f.clubs.map((c) => c.short_name || c.name).join(" · ")}
              </span>
              <span className={`bg-accent px-2 py-0.5 ${FONT} text-sm font-bold text-white`}>+{f.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

