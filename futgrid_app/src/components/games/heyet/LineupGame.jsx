import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Eye, Send } from "lucide-react";
import { buildMatcher, dateLabel, layout } from "../../../lib/games/lineups";
import { POS_SHORT, initials } from "../../../lib/games/playerInfo";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";

import { tr } from "../../../i18n";
export const LINEUP_KEYFRAMES = `
@keyframes luIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes luPop { 0% { transform: translate(-50%,-50%) scale(.6); } 60% { transform: translate(-50%,-50%) scale(1.15); } 100% { transform: translate(-50%,-50%) scale(1); } }
@keyframes luShake { 0%,100% { transform: translateX(0); } 25%,75% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
`;

function Pitch({ match, side, found, revealed, lastHit }) {
  const team = match[side];
  const spots = useMemo(() => layout(team), [team]);
  return (
    <div>
      <p className={`mb-2 flex items-baseline justify-between ${FONT} text-lg font-bold uppercase text-ink`}>
        {tr(team.name)}
        <span className="text-sm font-normal text-muted">{team.formation}</span>
      </p>
      <div
        data-theme="dark"
        className="relative aspect-[3/4] overflow-hidden border border-line/10 bg-linear-to-b from-[#0f3322] to-[#0a2117]"
      >
        <span className="absolute inset-x-0 top-1/2 h-px bg-white/12" />
        <span className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/12" />
        <span className="absolute bottom-0 left-1/2 h-[16%] w-[44%] -translate-x-1/2 border border-b-0 border-white/12" />
        <span className="absolute left-1/2 top-0 h-[16%] w-[44%] -translate-x-1/2 border border-t-0 border-white/12" />
        {spots.map((s) => {
          const key = `${side}:${s.index}`;
          const p = team.players[s.index];
          const hit = found.has(key);
          const shown = hit || revealed;
          return (
            <div
              key={key}
              className="absolute w-24 text-center"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: "translate(-50%,-50%)",
                animation: lastHit === key ? "luPop 0.45s ease-out" : undefined,
              }}
            >
              <span
                className={`mx-auto grid h-10 w-10 place-items-center rounded-full border-2 ${FONT} text-xs font-bold md:h-12 md:w-12 ${
                  hit
                    ? "border-accent bg-accent text-white shadow-[0_0_18px_color-mix(in_srgb,var(--fg-accent)_60%,transparent)]"
                    : shown
                      ? "border-bad-hi/60 bg-black/40 text-bad-hi"
                      : "border-white/30 border-dashed bg-black/30 text-white/50"
                }`}
              >
                {shown ? initials(p.name) : POS_SHORT[s.line]}
              </span>
              <span
                className={`mt-1 block truncate ${FONT} text-[11px] font-bold leading-tight md:text-xs ${
                  hit ? "text-white" : shown ? "text-bad-hi" : "text-transparent"
                } [text-shadow:0_1px_4px_#000]`}
              >
                {shown ? p.name : "·"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LineupGame({ match, sides, onBack }) {
  const matcher = useMemo(() => buildMatcher(match, sides), [match, sides]);
  const total = sides.length * 11;
  const [found, setFound] = useState(() => new Set());
  const [lastHit, setLastHit] = useState(null);
  const [misses, setMisses] = useState(0);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef(null);

  const done = revealed || found.size === total;

  const submit = (e) => {
    e.preventDefault();
    const guess = value.trim();
    if (!guess || done) return;
    const slot = matcher(guess, found);
    if (slot) {
      const key = `${slot.side}:${slot.index}`;
      const next = new Set(found);
      next.add(key);
      setFound(next);
      setLastHit(key);
      setMessage({ ok: true, text: `${match[slot.side].players[slot.index].name} ✓` });
    } else {
      const again = matcher(guess, new Set());
      setMessage({ ok: false, text: again ? tr("Bu oyunçu artıq tapılıb") : tr("“{guess}” bu heyətdə yoxdur", { guess }) });
      if (!again) setMisses((m) => m + 1);
      setShake((s) => s + 1);
    }
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <div>
      <button type="button" onClick={onBack} className={`inline-flex items-center gap-2 ${FONT} text-sm font-bold uppercase tracking-wide text-muted hover:text-ink`}>
        <ArrowLeft className="h-4 w-4" />
        {tr("Oyunlar siyahısı")}
      </button>

      <div className="mt-4 border border-line/10 bg-surface p-4 text-center md:p-5">
        <p className={`${FONT} text-xs font-bold uppercase tracking-[0.2em] text-accent`}>{tr(match.competition)}</p>
        <p className={`mt-1 ${FONT} text-2xl font-bold uppercase text-ink md:text-3xl`}>
          {tr(match.home.name)} <span className="text-accent">{match.home.score}–{match.away.score}</span> {tr(match.away.name)}
        </p>
        <p className={`${FONT} text-sm text-muted`}>
          {dateLabel(match.date)} · {tr(match.venue)}
          {match.note ? ` · ${tr(match.note)}` : ""}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
          {tr("Tapılan")}{" "} <span className="text-2xl font-bold text-ink">{found.size}</span> / {total}
          <span className="mx-2 text-dim">·</span>
          {tr("Səhv")}{" "} <span className="font-bold text-ink">{misses}</span>
        </p>
        <div className="h-1.5 w-full overflow-hidden bg-line/10 sm:w-60">
          <span className="block h-full bg-accent transition-[width] duration-500" style={{ width: `${(found.size / total) * 100}%` }} />
        </div>
      </div>

      {!done ? (
        <form onSubmit={submit} className="mt-4">
          <div key={shake} className={`flex gap-2 ${shake ? "animate-[luShake_0.35s_ease-out]" : ""}`}>
            <input
              ref={inputRef}
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={tr("Oyunçunun adını və ya soyadını yaz...")}
              autoComplete="off"
              spellCheck={false}
              className={`min-w-0 flex-1 border-2 border-accent bg-line/5 px-4 py-3 ${FONT} text-base text-ink placeholder-faint outline-none focus:bg-line/10 md:text-lg`}
            />
            <button type="submit" className={BTN_PRIMARY} aria-label={tr("Yoxla")}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{tr("Yoxla")}</span>
            </button>
          </div>
          <div className="mt-2 flex min-h-6 items-center justify-between gap-3">
            {message ? (
              <p key={message.text + shake} className={`${FONT} text-sm font-bold animate-[luIn_0.2s_ease-out] ${message.ok ? "text-good" : "text-bad"}`}>
                {message.text}
              </p>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => setRevealed(true)} className={`inline-flex items-center gap-1.5 ${FONT} text-sm font-bold uppercase text-muted hover:text-ink`}>
              <Eye className="h-4 w-4" />
              {tr("Təslim ol")}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-line/10 bg-surface p-4 animate-[luIn_0.4s_ease-out_both]">
          <p className={`flex items-center gap-2 ${FONT} text-lg font-bold uppercase ${found.size === total ? "text-good" : "text-ink"}`}>
            {found.size === total && <Check className="h-5 w-5" />}
            {found.size === total ? tr("Bütün heyəti tapdın!") : tr("{n} / {total} tapdın", { n: found.size, total })}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onBack} className={BTN_GHOST}>
              <span aria-hidden="true" className={SWEEP_BLUE} />
              {tr("Başqa oyun")}
            </button>
          </div>
        </div>
      )}

      <div className={`mt-5 grid gap-5 ${sides.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-md"}`}>
        {sides.map((s) => (
          <Pitch key={s} match={match} side={s} found={found} revealed={revealed} lastHit={lastHit} />
        ))}
      </div>
    </div>
  );
}
