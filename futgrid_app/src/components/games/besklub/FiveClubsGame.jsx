import { useEffect, useMemo, useState } from "react";
import { Check, Flag as FlagIcon, RotateCcw, Timer, Trophy } from "lucide-react";
import { clubsOf, pickClubs } from "../../../lib/games/fiveClubs";
import ClubBadge from "../common/ClubBadge";
import PlayerSearch from "../common/PlayerSearch";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";

import { tr } from "../../../i18n";
export const FIVE_KEYFRAMES = `
@keyframes fcIn { from { opacity: 0; transform: translateY(18px) scale(.94); } to { opacity: 1; transform: none; } }
@keyframes fcHit { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--fg-accent) 70%, transparent); transform: scale(1); } 40% { transform: scale(1.06); } 100% { box-shadow: 0 0 0 14px transparent; transform: scale(1); } }
@keyframes fcShake { 0%,100% { transform: translateX(0); } 25%,75% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
@keyframes fcPop { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
`;

function ClubTile({ club, flash, index, count, selected, disabled, onToggle }) {
  return (
    <div
      className="animate-[fcIn_0.5s_cubic-bezier(.2,.8,.2,1)_both]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <button
        key={flash}
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={club.name}
        disabled={disabled}
        onClick={onToggle}
        className={`relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-xl border-2 bg-surface transition-[border-color,translate,box-shadow] duration-200 disabled:cursor-default ${
          selected
            ? "-translate-y-1.5 border-accent shadow-[0_18px_34px_-18px_var(--fg-accent)]"
            : "border-edge shadow-[0_18px_40px_-28px_var(--fg-shadow)] enabled:hover:-translate-y-0.5 enabled:hover:border-accent/50"
        } ${flash ? "animate-[fcHit_0.7s_ease-out]" : ""}`}
      >
        <span
          aria-hidden="true"
          className={`absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full transition-[background-color,scale] duration-200 ${
            selected
              ? "scale-100 bg-accent text-white"
              : "scale-90 bg-surface shadow-[inset_0_0_0_2px_var(--fg-edge)]"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
        </span>
        <span className="flex min-h-0 flex-1">
          <ClubBadge club={club} />
        </span>
        <span
          className={`border-t py-1.5 text-center ${FONT} text-xs font-bold transition-colors duration-200 ${
            selected ? "border-accent bg-accent text-white" : "border-edge text-accent"
          }`}
        >
          {tr("{n} cavab", { n: count })}
        </span>
      </button>
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
  const [selected, setSelected] = useState([]);

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

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const chosen = set.clubs.filter((c) => selected.includes(c.id));

  const bad = (text) => {
    setMessage({ bad: true, text });
    setShake((s) => s + 1);
  };

  const guess = (p) => {
    if (over) return;
    if (chosen.length < 2) return bad(tr("Əvvəl ən azı 2 klub seç"));
    if (found.some((f) => f.player.id === p.id)) return bad(tr("{name} artıq yazılıb", { name: p.name }));
    const played = new Set(clubsOf(set.clubs, p).map((c) => c.id));
    const missing = chosen.filter((c) => !played.has(c.id));
    if (missing.length)
      return bad(tr("{name} bu klubda oynamayıb: {v2}", { name: p.name, v2: missing.map((c) => c.name).join(", ") }));
    const clubs = chosen;
    setFound((f) => [{ player: p, clubs, count: clubs.length }, ...f]);
    setSelected([]);
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
    setSelected([]);
  };

  const pct = Math.max(0, left / seconds) * 100;
  const missed = answers.filter((a) => !found.some((f) => f.player.id === a.player.id)).slice(0, 8);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
          {tr("Xal")}{" "} <span className="text-2xl font-bold text-ink">{score}</span>
          <span className="mx-2 text-dim">·</span>
          {tr("Tapılan")}{" "} <span className="font-bold text-ink">{found.length}</span>
        </p>
        <div className="flex items-center gap-2">
          <Timer className={`h-5 w-5 ${left <= 10 && !over ? "text-bad" : "text-accent"}`} />
          <span className={`${FONT} text-2xl font-bold tabular-nums ${left <= 10 && !over ? "text-bad" : "text-ink"}`}>
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
          {!over && (
            <button type="button" onClick={() => setOver(true)} className={`ml-2 inline-flex items-center gap-1.5 ${FONT} text-sm font-bold uppercase text-muted hover:text-ink`}>
              <FlagIcon className="h-4 w-4" />
              {tr("Bitir")}
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
          <ClubTile
            key={c.id}
            club={c}
            index={i}
            flash={flash[c.id] ?? 0}
            count={perClub.get(c.id)}
            selected={selected.includes(c.id)}
            disabled={over}
            onToggle={() => toggle(c.id)}
          />
        ))}
      </div>

      <ol className={`mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2 ${FONT} text-xs font-bold uppercase tracking-wide`}>
        <li className={`rounded-full px-3 py-1 ${chosen.length >= 2 ? "bg-good/15 text-good-hi" : "bg-accent text-white"}`}>
          {tr("1 · Ortaq klubları seç (ən azı 2)")}
        </li>
        <li className={`rounded-full px-3 py-1 ${chosen.length >= 2 ? "bg-accent text-white" : "bg-page-2 text-muted"}`}>
          {tr("2 · Futbolçunun adını yaz")}
        </li>
      </ol>

      {!over ? (
        <div className="mx-auto mt-4 max-w-2xl">
          <div
            className={`mb-3 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2 ${
              chosen.length ? "border-accent/50 bg-accent/5" : "border-edge"
            }`}
          >
            {chosen.length ? (
              <>
                {chosen.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 ${FONT} text-sm font-bold text-white`}
                  >
                    {c.name}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
                <span className={`ml-auto ${FONT} text-sm font-black text-accent`}>
                  {chosen.length >= 2 ? `+${chosen.length} xal` : tr("1 klub da seç")}
                </span>
              </>
            ) : (
              <span className={`${FONT} text-sm text-muted`}>
                {tr("Yuxarıdakı kartlardan futbolçunun oynadığı klubları seç.")}
              </span>
            )}
          </div>
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
          <p className={`mt-2 ${FONT} text-4xl font-bold text-ink`}>{tr("{n} xal", { n: score })}</p>
          <p className={`${FONT} text-sm text-muted`}>{tr("{n} futbolçu tapdın", { n: found.length })}</p>
          {missed.length > 0 && (
            <>
              <p className={`mt-5 ${FONT} text-xs font-bold uppercase tracking-[0.2em] text-faint`}>{tr("Tapmadığın cavablardan bəziləri")}</p>
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
              {tr("Yeni klublar")}
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

