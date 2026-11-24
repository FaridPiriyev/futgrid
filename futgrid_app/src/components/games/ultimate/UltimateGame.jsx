import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Crown, RotateCcw, Settings2, Sparkles, Trophy, TrendingDown } from "lucide-react";
import {
  ROUNDS,
  buildCombos,
  comboEra,
  isComplete,
  newLineup,
  place,
  spin,
  swapSlots,
  teamScore,
  verdict,
} from "../../../lib/games/ultimate";
import { countryOf, POS_SHORT, POS_STYLE } from "../../../lib/games/playerInfo";
import PlayerAvatar, { Flag } from "../common/PlayerAvatar";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { tr } from "../../../i18n";

export const ULTIMATE_KEYFRAMES = `
@keyframes u11Tick { from { opacity: .25; transform: translateY(-30%); filter: blur(2px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes u11Land { 0% { transform: scale(.8); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
@keyframes u11In { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes u11Seat { 0% { transform: scale(.3); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes u11Pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes u11Flip { 0% { transform: rotateY(90deg); opacity: 0; } 100% { transform: rotateY(0); opacity: 1; } }
@keyframes u11Shine { from { transform: translateX(-120%); } to { transform: translateX(220%); } }
`;

const SPIN_MS = 1100;
const shortName = (name = "") => {
  const parts = name.split(" ");
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : name;
};

function useShuffle(active, list, ms = 85) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active || !list.length) return;
    const id = setInterval(() => setI((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [active, list.length, ms]);
  return list.length ? list[i % list.length] : null;
}

function ClubMark({ club, size = "h-12 w-12" }) {
  const [broken, setBroken] = useState(false);
  if (!club) return null;
  return club.logo_url && !broken ? (
    <img
      src={club.logo_url}
      alt=""
      onError={() => setBroken(true)}
      className={`${club.nation ? "aspect-[4/3] h-auto rounded-sm object-cover shadow-[0_2px_8px_rgba(0,0,0,.5)]" : "fg-logo object-contain"} ${size}`}
    />
  ) : (
    <span className={`grid ${size} place-items-center rounded-full bg-line/10 ${FONT} text-xs font-bold`}>
      {club.short_name ?? club.name?.slice(0, 3)}
    </span>
  );
}

const clubLabel = (club) => (club.nation ? club.name : club.short_name || club.name);

function Reels({ round, spinning, shuffleClubs, shuffleEras }) {
  const sClub = useShuffle(spinning, shuffleClubs);
  const sEra = useShuffle(spinning, shuffleEras, 70);
  const club = spinning ? sClub : round?.combo.club;
  const era = spinning ? sEra : round ? comboEra(round.combo) : null;
  const legend = !spinning && round?.combo.legend;
  const box =
    "relative flex h-24 items-center justify-center gap-3 overflow-hidden rounded-xl border-[3px] bg-[linear-gradient(180deg,#141a2c,#0b0f1c)] px-3 shadow-[inset_0_8px_20px_rgba(0,0,0,.55)] md:h-28";
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[linear-gradient(180deg,#ffd75e,#e0a10f)] p-1.5 shadow-[0_14px_30px_-16px_#e0a10f]">
          <p className={`text-center ${FONT} text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#3d2a00]`}>{tr("Komanda")}</p>
          <div className={`${box} border-[#b98000]`}>
            {club && (
              <span
                key={spinning ? club.id : `l-${club.id}`}
                className={`flex min-w-0 items-center gap-2.5 ${spinning ? "animate-[u11Tick_0.08s_ease-out_both]" : "animate-[u11Land_0.45s_cubic-bezier(.2,.9,.3,1.2)_both]"}`}
              >
                <ClubMark club={club} size={club.nation ? "w-10 md:w-12" : "h-10 w-10 md:h-12 md:w-12"} />
                <span className={`truncate ${FONT} text-lg font-black uppercase leading-tight text-white md:text-2xl`}>{clubLabel(club)}</span>
              </span>
            )}
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.45),transparent_30%,transparent_70%,rgba(0,0,0,.45))]" />
          </div>
        </div>
        <div className="rounded-2xl bg-[linear-gradient(180deg,#6ea8ff,#2f5bff)] p-1.5 shadow-[0_14px_30px_-16px_#2f5bff]">
          <p className={`text-center ${FONT} text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#06134a]`}>{tr("Dövr")}</p>
          <div className={`${box} border-[#1d3fc4]`}>
            {era && (
              <span
                key={spinning ? `s${era}` : `l${era}`}
                className={`${FONT} text-3xl font-black text-white md:text-4xl ${spinning ? "animate-[u11Tick_0.07s_ease-out_both]" : "animate-[u11Land_0.45s_cubic-bezier(.2,.9,.3,1.2)_both]"}`}
              >
                {era}
              </span>
            )}
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.45),transparent_30%,transparent_70%,rgba(0,0,0,.45))]" />
          </div>
        </div>
      </div>
      {legend && (
        <span
          className={`absolute left-1/2 top-full z-10 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-[linear-gradient(135deg,#ffe27a,#e0a10f)] px-3 py-1 ${FONT} text-[11px] font-black uppercase tracking-[0.18em] text-[#3d2a00] shadow-[0_8px_20px_-8px_#e0a10f] animate-[u11Land_0.45s_cubic-bezier(.2,.9,.3,1.2)_both]`}
        >
          <Crown className="h-3.5 w-3.5" />
          {tr("Əfsanəvi komanda")}
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/3 bg-white/50 blur-sm animate-[u11Shine_1.6s_ease-in-out_infinite]" />
        </span>
      )}
    </div>
  );
}

function Pitch({ lineup, lastSeat, selected, onSlot, reveal = false }) {
  const pickedPos = selected != null ? lineup[selected]?.pos : null;
  return (
    <div
      data-theme="dark"
      className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#13522a] shadow-[0_30px_60px_-30px_rgba(0,0,0,.8)]"
    >
      <span aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,.045)_0_10%,transparent_10%_20%)]" />
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_40%,rgba(0,0,0,.45))]" />
      <svg viewBox="0 0 100 125" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth=".45">
        <rect x="4" y="4" width="92" height="117" rx="1" />
        <line x1="4" y1="62.5" x2="96" y2="62.5" />
        <circle cx="50" cy="62.5" r="10" />
        <circle cx="50" cy="62.5" r=".8" fill="rgba(255,255,255,.4)" />
        <rect x="24" y="4" width="52" height="18" />
        <rect x="38" y="4" width="24" height="7" />
        <path d="M41 22 Q50 28 59 22" />
        <rect x="24" y="103" width="52" height="18" />
        <rect x="38" y="114" width="24" height="7" />
        <path d="M41 103 Q50 97 59 103" />
      </svg>
      {lineup.map((s, i) => {
        const p = s.pick;
        const isSel = selected === i;
        const target = pickedPos && !isSel && s.pos === pickedPos;
        const interactive = Boolean(onSlot) && (p || target);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onSlot?.(i)}
            aria-label={p ? p.player.name : s.label}
            className={`absolute flex w-[23%] flex-col items-center text-center ${interactive ? "cursor-pointer" : "cursor-default"}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, transform: "translate(-50%,-50%)" }}
          >
            <span
              key={p ? p.player.id : "empty"}
              className={`flex w-full flex-col items-center ${p && lastSeat === i ? "animate-[u11Seat_0.55s_cubic-bezier(.2,.9,.3,1.2)_both]" : ""}`}
            >
              {p ? (
                <>
                  <span
                    className={`relative rounded-full transition-shadow duration-200 ${
                      isSel
                        ? "ring-4 ring-yellow shadow-[0_0_22px_rgba(255,214,0,.55)]"
                        : target
                          ? "ring-4 ring-yellow/50 animate-[u11Pulse_1s_ease-in-out_infinite]"
                          : ""
                    }`}
                  >
                    <PlayerAvatar
                      player={p.player}
                      className="h-11 w-11 border-2 border-white shadow-[0_8px_18px_-6px_#000] sm:h-14 sm:w-14 lg:h-16 lg:w-16"
                      textClass="text-xs sm:text-sm"
                    />
                    {reveal && (
                      <span
                        className={`absolute -bottom-1 -right-2 rounded-md bg-gold px-1 ${FONT} text-[11px] font-black text-black shadow md:text-sm animate-[u11Flip_0.5s_ease-out_both]`}
                        style={{ animationDelay: `${i * 90}ms` }}
                      >
                        {p.rating}
                      </span>
                    )}
                    {p.legend && !reveal && (
                      <span className="absolute -right-1 -top-1 grid h-4.5 w-4.5 place-items-center rounded-full bg-gold text-black shadow md:h-5 md:w-5">
                        <Crown className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      </span>
                    )}
                  </span>
                  <span className={`mt-1 max-w-full truncate rounded-md bg-black/70 px-1.5 py-px ${FONT} text-[10px] font-bold text-white sm:text-xs`}>
                    {shortName(p.player.name)}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full border-2 border-dashed sm:h-14 sm:w-14 lg:h-16 lg:w-16 ${
                      target ? "border-yellow bg-yellow/15 animate-[u11Pulse_1s_ease-in-out_infinite]" : "border-white/35 bg-black/20"
                    }`}
                  >
                    <span className={`${FONT} text-[11px] font-black uppercase text-white/70 sm:text-sm`}>{s.label}</span>
                  </span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OptionCard({ data, player, onPick, index, disabled }) {
  const country = countryOf(data, player);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(player)}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border-2 border-edge bg-surface px-3 py-2.5 text-left transition-[transform,border-color,background-color] duration-200 animate-[u11In_0.35s_ease-out_both] enabled:hover:-translate-y-0.5 enabled:hover:border-accent enabled:hover:bg-accent/8 disabled:cursor-not-allowed disabled:opacity-40 md:py-3"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <PlayerAvatar player={player} className="h-12 w-12 transition-transform duration-200 group-hover:scale-110 md:h-14 md:w-14 lg:h-16 lg:w-16" textClass="text-sm" />
      <span className="min-w-0 flex-1">
        <span className={`block truncate ${FONT} text-base font-bold text-ink md:text-lg`}>{player.name}</span>
        <span className={`mt-0.5 flex items-center gap-2 ${FONT} text-xs text-muted md:text-sm`}>
          <Flag country={country} className="h-3 w-4.5" />
          <span className="truncate">{country?.name}</span>
        </span>
      </span>
      <span className={`grid h-8 w-12 shrink-0 place-items-center rounded-md ${POS_STYLE[player.position]} ${FONT} text-xs font-black`}>
        {POS_SHORT[player.position]}
      </span>
    </button>
  );
}

function Result({ lineup, onAgain, onSettings }) {
  const score = useMemo(() => teamScore(lineup), [lineup]);
  const picks = lineup.map((s) => ({ ...s.pick, label: s.label }));
  const best = picks.reduce((b, p) => (!b || p.rating > b.rating ? p : b), null);
  const worst = picks.reduce((b, p) => (!b || p.rating < b.rating ? p : b), null);
  const legends = picks.filter((p) => p.legend).length;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_480px]">
      <div className="min-w-0 animate-[u11In_0.5s_ease-out_both]">
        <p className={`${FONT} text-sm font-bold uppercase tracking-[0.28em] text-gold`}>{tr("Heyət hazırdır — reytinqlər açıldı")}</p>
        <div className="mt-4 flex items-center gap-5">
          <span className="grid h-28 w-28 shrink-0 place-items-center rounded-full bg-gold text-black shadow-[0_20px_40px_-18px_var(--fg-gold)] animate-[u11Land_0.6s_cubic-bezier(.2,.9,.3,1.2)_both] md:h-36 md:w-36">
            <span className="text-center">
              <span className={`block ${FONT} text-5xl font-black leading-none md:text-6xl`}>{score.overall}</span>
              <span className={`block ${FONT} text-xs font-extrabold uppercase tracking-[0.2em]`}>{tr("Reytinq")}</span>
            </span>
          </span>
          <div className="min-w-0">
            <h2 className={`${FONT} text-2xl font-black uppercase leading-tight text-ink md:text-4xl`}>{verdict(score.overall)}</h2>
            <p className={`mt-2 ${FONT} text-sm text-muted`}>{tr("Orta reytinq {avg} + kimya {chem}", { avg: score.avg, chem: score.chem })}</p>
          </div>
        </div>

        <div className={`mt-5 grid gap-2 sm:grid-cols-2 ${FONT} text-sm`}>
          {best && (
            <p className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2 text-ink-soft">
              <Trophy className="h-4 w-4 shrink-0 text-gold" />
              <span className="min-w-0 truncate">
                {tr("Ən güclü:")} <b className="text-ink">{best.player.name}</b> · {best.rating}
              </span>
            </p>
          )}
          {worst && (
            <p className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2 text-ink-soft">
              <TrendingDown className="h-4 w-4 shrink-0 text-bad-hi" />
              <span className="min-w-0 truncate">
                {tr("Ən zəif:")} <b className="text-ink">{worst.player.name}</b> · {worst.rating}
              </span>
            </p>
          )}
          <p className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2 text-ink-soft">
            <Sparkles className="h-4 w-4 shrink-0 text-good-hi" />
            {score.links.length ? tr("Kimya: {n} əlaqə", { n: score.links.length }) : tr("Kimya bonusu yoxdur.")}
          </p>
          <p className="flex items-center gap-2 rounded-xl border border-edge bg-surface px-3 py-2 text-ink-soft">
            <Crown className="h-4 w-4 shrink-0 text-gold" />
            {tr("Əfsanəvi komandalardan: {n}", { n: legends })}
          </p>
        </div>

        <ol className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {picks.map((p, i) => (
            <li
              key={p.player.id}
              className="flex items-center gap-2.5 rounded-xl border border-edge bg-surface px-2.5 py-1.5 animate-[u11In_0.35s_ease-out_both]"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <PlayerAvatar player={p.player} className="h-9 w-9" textClass="text-[10px]" />
              <span className="min-w-0 flex-1">
                <span className={`block truncate ${FONT} text-sm font-bold text-ink`}>{p.player.name}</span>
                <span className={`block truncate ${FONT} text-[11px] text-muted`}>
                  {p.label} · {clubLabel(p.club)} {p.eraText}
                </span>
              </span>
              <span className={`w-8 text-right ${FONT} text-lg font-black ${p.rating >= 88 ? "text-gold-hi" : p.rating >= 82 ? "text-ink" : "text-muted"}`}>{p.rating}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={onAgain} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <RotateCcw className="h-4 w-4" />
            {tr("Yenidən oyna")}
          </button>
          <button type="button" onClick={onSettings} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <Settings2 className="h-4 w-4" />
            {tr("Parametrlər")}
          </button>
        </div>
      </div>
      <Pitch lineup={lineup} reveal />
    </div>
  );
}

export default function UltimateGame({ data, formation, difficulty, onAgain, onSettings }) {
  const combos = useMemo(() => buildCombos(data, difficulty), [data, difficulty]);
  const random = Math.random;
  const [lineup, setLineup] = useState(() => newLineup(formation));
  const [round, setRound] = useState(null);
  const [spinning, setSpinning] = useState(true);
  const [lastSeat, setLastSeat] = useState(null);
  const [selected, setSelected] = useState(null);
  const lineupRef = useRef(lineup);
  lineupRef.current = lineup;
  const seenRef = useRef(new Set());

  const shuffleClubs = useMemo(() => {
    const seen = new Map();
    for (const c of combos) if (!seen.has(c.club.id)) seen.set(c.club.id, c.club);
    const all = [...seen.values()];
    const legends = all.filter((c) => String(c.id).startsWith("legend:"));
    const rest = all.filter((c) => !String(c.id).startsWith("legend:")).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const mixed = [];
    rest.slice(0, 18).forEach((c, i) => {
      mixed.push(c);
      if (i % 2 === 1 && legends[i >> 1]) mixed.push(legends[i >> 1]);
    });
    return mixed;
  }, [combos]);
  const shuffleEras = useMemo(() => [...new Set(combos.map((c) => comboEra(c)))].sort(), [combos]);

  const roll = (fn) => {
    setSpinning(true);
    const next = fn();
    if (next) seenRef.current.add(next.combo.key);
    setTimeout(() => {
      setRound(next);
      setSpinning(false);
    }, SPIN_MS);
  };

  useEffect(() => {
    roll(() => spin(combos, lineupRef.current, random, { avoid: seenRef.current }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filled = lineup.filter((s) => s.pick).length;
  const done = isComplete(lineup);

  const pick = (player) => {
    if (!round || spinning) return;
    const next = place(lineup, player, round.combo);
    if (next === lineup) return;
    const seat = next.findIndex((s, i) => s.pick && !lineup[i].pick);
    setLineup(next);
    setLastSeat(seat);
    setSelected(null);
    if (isComplete(next)) return;
    roll(() => spin(combos, next, random, { avoid: seenRef.current }) ?? spin(combos, next, random));
  };

  const onSlot = (i) => {
    if (selected == null) {
      if (lineup[i].pick && lineup.some((s, j) => j !== i && s.pos === lineup[i].pos)) setSelected(i);
      return;
    }
    if (selected === i) {
      setSelected(null);
      return;
    }
    if (lineup[i].pos === lineup[selected].pos) {
      setLineup(swapSlots(lineup, selected, i));
      setLastSeat(null);
      setSelected(null);
      return;
    }
    setSelected(lineup[i].pick ? i : null);
  };

  if (done) return <Result lineup={lineup} onAgain={onAgain} onSettings={onSettings} />;

  if (!combos.length) return <p className={`${FONT} text-center text-muted`}>{tr("Bu səviyyə üçün kifayət qədər data yoxdur.")}</p>;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_480px]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className={`shrink-0 ${FONT} text-xs font-bold uppercase tracking-[0.12em] text-muted sm:text-sm sm:tracking-[0.18em]`}>
            {tr("Raund")} <span className="text-ink">{Math.min(filled + 1, ROUNDS)}</span> / {ROUNDS} · {formation}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: ROUNDS }, (_, i) => (
              <span key={i} className={`h-1.5 w-2.5 rounded-full sm:w-3.5 md:w-6 ${i < filled ? "bg-gold" : i === filled ? "bg-accent" : "bg-line/12"}`} />
            ))}
          </div>
        </div>

        <Reels round={round} spinning={spinning} shuffleClubs={shuffleClubs} shuffleEras={shuffleEras} />

        <div className="mt-6">
          {round && !spinning ? (
            <>
              <p className={`mb-2 flex flex-wrap items-baseline gap-x-2 ${FONT} text-sm text-muted`}>
                <b className="text-ink">{round.combo.club.name}</b>
                <span>· {comboEra(round.combo)}</span>
                <span className="text-faint">· {tr("Reytinqlər oyun sonunda açılacaq")}</span>
              </p>
              <div className="grid gap-2">
                {round.options.map((p, i) => (
                  <OptionCard key={`${round.combo.key}-${p.id}`} data={data} player={p} index={i} onPick={pick} />
                ))}
              </div>
            </>
          ) : (
            <div className="grid gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[72px] rounded-xl border-2 border-edge bg-surface/60 animate-[u11Pulse_1s_ease-in-out_infinite] md:h-[84px]"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-24">
        <Pitch lineup={lineup} lastSeat={lastSeat} selected={selected} onSlot={onSlot} />
        <p className={`mx-auto mt-2 flex max-w-[520px] items-center gap-1.5 ${FONT} text-xs text-muted`}>
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
          {selected != null
            ? tr("İndi eyni xətdə yeni yerə toxun (sarı yerlər).")
            : tr("Yerini dəyişmək üçün oyunçuya, sonra eyni xətdə başqa yerə toxun.")}
        </p>
      </div>
    </div>
  );
}
