import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Copy, RefreshCw, RotateCcw, Settings2, Sparkles, Star, Trophy } from "lucide-react";
import {
  ROUNDS,
  buildCombos,
  canPlace,
  eraLabel,
  freshPowers,
  isComplete,
  newLineup,
  place,
  removeAt,
  reroll,
  spin,
  starOptions,
  teamScore,
  verdict,
} from "../../../lib/games/ultimate";
import { countryOf, POS_SHORT, POS_STYLE } from "../../../lib/games/playerInfo";
import { playerRating } from "../../../lib/games/rating";
import { seeded, seedFrom, todayKey } from "../../../lib/random";
import PlayerAvatar, { Flag } from "../common/PlayerAvatar";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { tr } from "../../../i18n";

export const ULTIMATE_KEYFRAMES = `
@keyframes u11Tick { from { opacity: .25; transform: translateY(-30%); filter: blur(2px); } to { opacity: 1; transform: none; filter: blur(0); } }
@keyframes u11Land { 0% { transform: scale(.8); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
@keyframes u11In { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes u11Seat { 0% { transform: translate(-50%, -50%) scale(.3); opacity: 0; } 60% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1); } }
@keyframes u11Glow { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--fg-gold) 0%, transparent); } 50% { box-shadow: 0 0 22px 2px color-mix(in srgb, var(--fg-gold) 55%, transparent); } }
@keyframes u11Pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
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
    <img src={club.logo_url} alt="" onError={() => setBroken(true)} className={`fg-logo ${size} object-contain`} />
  ) : (
    <span className={`grid ${size} place-items-center rounded-full bg-line/10 ${FONT} text-xs font-bold`}>
      {club.short_name ?? club.name?.slice(0, 3)}
    </span>
  );
}

// İki baraban: KOMANDA (sarı) və DÖVR (mavi)
function Reels({ round, spinning, shuffleClubs, shuffleEras }) {
  const sClub = useShuffle(spinning, shuffleClubs);
  const sEra = useShuffle(spinning, shuffleEras, 70);
  const club = spinning ? sClub : round?.combo.club;
  const era = spinning ? sEra : round?.combo.era;
  const box =
    "relative flex h-24 items-center justify-center gap-3 overflow-hidden rounded-xl border-[3px] bg-[linear-gradient(180deg,#141a2c,#0b0f1c)] px-3 shadow-[inset_0_8px_20px_rgba(0,0,0,.55)] md:h-28";
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-[linear-gradient(180deg,#ffd75e,#e0a10f)] p-1.5 shadow-[0_14px_30px_-16px_#e0a10f]">
        <p className={`text-center ${FONT} text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#3d2a00]`}>{tr("Komanda")}</p>
        <div className={`${box} border-[#b98000]`}>
          {club && (
            <span key={spinning ? club.id : `l-${club.id}`} className={`flex min-w-0 items-center gap-2.5 ${spinning ? "animate-[u11Tick_0.08s_ease-out_both]" : "animate-[u11Land_0.45s_cubic-bezier(.2,.9,.3,1.2)_both]"}`}>
              <ClubMark club={club} size="h-10 w-10 md:h-12 md:w-12" />
              <span className={`truncate ${FONT} text-lg font-black uppercase leading-tight text-white md:text-2xl`}>
                {club.short_name || club.name}
              </span>
            </span>
          )}
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.45),transparent_30%,transparent_70%,rgba(0,0,0,.45))]" />
        </div>
      </div>
      <div className="rounded-2xl bg-[linear-gradient(180deg,#6ea8ff,#2f5bff)] p-1.5 shadow-[0_14px_30px_-16px_#2f5bff]">
        <p className={`text-center ${FONT} text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#06134a]`}>{tr("Dövr")}</p>
        <div className={`${box} border-[#1d3fc4]`}>
          {era && (
            <span key={spinning ? `s${era}` : `l${era}`} className={`${FONT} text-3xl font-black text-white md:text-4xl ${spinning ? "animate-[u11Tick_0.07s_ease-out_both]" : "animate-[u11Land_0.45s_cubic-bezier(.2,.9,.3,1.2)_both]"}`}>
              {eraLabel(era)}
            </span>
          )}
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.45),transparent_30%,transparent_70%,rgba(0,0,0,.45))]" />
        </div>
      </div>
    </div>
  );
}

function Shirt({ className = "" }) {
  return (
    <svg viewBox="0 0 64 56" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M22 4 L10 9 L2 22 L12 27 L14 22 L14 52 L50 52 L50 22 L52 27 L62 22 L54 9 L42 4 Q32 12 22 4 Z" strokeDasharray="4 4" />
    </svg>
  );
}

function Pitch({ data, lineup, tradeMode, onSlot, lastSeat }) {
  return (
    <div
      data-theme="dark"
      className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-2xl border border-line/10 bg-[repeating-linear-gradient(180deg,#1b5e2c_0_9%,#17532a_9%_18%)] shadow-[inset_0_0_80px_rgba(0,0,0,.55)]"
    >
      <svg viewBox="0 0 100 125" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".5">
        <rect x="3" y="3" width="94" height="119" />
        <line x1="3" y1="62.5" x2="97" y2="62.5" />
        <circle cx="50" cy="62.5" r="10" />
        <rect x="25" y="3" width="50" height="18" />
        <rect x="38" y="3" width="24" height="7" />
        <rect x="25" y="104" width="50" height="18" />
        <rect x="38" y="115" width="24" height="7" />
      </svg>
      {lineup.map((s, i) => {
        const p = s.pick;
        const clickable = tradeMode && p;
        return (
          <button
            key={i}
            type="button"
            disabled={!clickable}
            onClick={() => onSlot(i)}
            className={`absolute flex w-[22%] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center ${p && lastSeat === i ? "animate-[u11Seat_0.55s_cubic-bezier(.2,.9,.3,1.2)_both]" : ""} ${clickable ? "cursor-pointer" : "cursor-default"}`}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          >
            {p ? (
              <>
                <span className={`relative rounded-full ${clickable ? "ring-4 ring-bad animate-[u11Pulse_1s_ease-in-out_infinite]" : ""}`}>
                  <PlayerAvatar player={p.player} className="h-11 w-11 border-2 border-white/90 shadow-[0_8px_16px_-6px_#000] md:h-14 md:w-14" textClass="text-xs" />
                  <span className={`absolute -bottom-1 -right-2 rounded bg-gold px-1 ${FONT} text-[10px] font-black text-black md:text-xs`}>{p.rating}</span>
                </span>
                <span className={`mt-1 max-w-full truncate rounded bg-black/55 px-1.5 ${FONT} text-[10px] font-bold text-white md:text-xs`}>
                  {shortName(p.player.name)}
                </span>
              </>
            ) : (
              <>
                <Shirt className="h-9 w-10 text-white/45 md:h-11 md:w-12" />
                <span className={`${FONT} text-[10px] font-bold uppercase text-white/60 md:text-xs`}>{s.label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function OptionCard({ data, player, combo, fits, onPick, index, disabled, star }) {
  const rating = playerRating(player);
  const country = countryOf(data, player);
  return (
    <button
      type="button"
      disabled={!fits || disabled}
      onClick={() => onPick(player)}
      className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border-2 bg-surface px-3 py-2.5 text-left transition-[transform,border-color,background-color] duration-200 animate-[u11In_0.35s_ease-out_both] enabled:hover:-translate-y-0.5 enabled:hover:border-accent enabled:hover:bg-accent/8 disabled:cursor-not-allowed disabled:opacity-40 ${
        star ? "border-gold animate-[u11Glow_1.6s_ease-in-out_infinite]" : "border-edge"
      }`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <PlayerAvatar player={player} className="h-12 w-12 transition-transform duration-200 group-hover:scale-110" textClass="text-sm" />
      <span className="min-w-0 flex-1">
        <span className={`flex items-center gap-2 ${FONT} text-base font-bold text-ink md:text-lg`}>
          <span className="truncate">{player.name}</span>
          {star && <Star className="h-4 w-4 shrink-0 fill-gold text-gold" />}
        </span>
        <span className={`mt-0.5 flex items-center gap-2 ${FONT} text-xs text-muted`}>
          <Flag country={country} className="h-3 w-4.5" />
          <span className="truncate">{country?.name}</span>
          {!fits && <span className="text-bad-hi">· {tr("yer yoxdur")}</span>}
        </span>
      </span>
      <span className={`grid h-7 w-11 place-items-center ${POS_STYLE[player.position]} ${FONT} text-[11px] font-bold`}>{POS_SHORT[player.position]}</span>
      <span className={`w-10 text-right ${FONT} text-2xl font-black text-ink`}>{rating}</span>
    </button>
  );
}

const POWER_INFO = {
  club: { Icon: RefreshCw, get label() { return tr("Komanda"); }, get hint() { return tr("Başqa klub, eyni dövr"); }, tone: "bg-gold text-black" },
  era: { Icon: RefreshCw, get label() { return tr("Dövr"); }, get hint() { return tr("Eyni klub, başqa dövr"); }, tone: "bg-accent text-white" },
  star: { Icon: Star, get label() { return tr("Ulduz"); }, get hint() { return tr("Dövrün ən güclüsü gəlir"); }, tone: "bg-[linear-gradient(135deg,#ffd75e,#e08a0f)] text-black" },
  trade: { Icon: ArrowLeftRight, get label() { return tr("Dəyiş"); }, get hint() { return tr("Meydançadan birini çıxar"); }, tone: "bg-[linear-gradient(135deg,#38bdf8,#1d4ed8)] text-white" },
  double: { Icon: Copy, get label() { return tr("Cüt seçim"); }, get hint() { return tr("Bu raund 2 oyunçu"); }, tone: "bg-[linear-gradient(135deg,#c084fc,#7c3aed)] text-white" },
};

function Powers({ powers, onUse, disabled, active }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Object.entries(POWER_INFO).map(([key, info]) => {
        const left = powers[key] ?? 0;
        const on = active === key;
        return (
          <button
            key={key}
            type="button"
            title={info.hint}
            disabled={disabled || (!left && !on)}
            onClick={() => onUse(key)}
            className={`group relative flex flex-col items-center gap-1 rounded-xl border-2 px-1 py-2 transition-[transform,opacity] duration-200 enabled:hover:-translate-y-0.5 disabled:opacity-35 ${on ? "border-white" : "border-transparent"} ${info.tone}`}
          >
            <info.Icon className="h-5 w-5" />
            <span className={`${FONT} text-[10px] font-extrabold uppercase leading-tight md:text-[11px]`}>{info.label}</span>
            <span className={`absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-page bg-gold ${FONT} text-[10px] font-black text-black`}>{left}</span>
          </button>
        );
      })}
    </div>
  );
}

function Result({ data, lineup, formation, daily, onAgain, onSettings }) {
  const score = useMemo(() => teamScore(lineup), [lineup]);
  const best = lineup.reduce((b, s) => (!b || s.pick.rating > b.rating ? s.pick : b), null);
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const text = `FutGrid · Ultimate 11 ${daily ? `(${todayKey()})` : ""}\n${formation} · ${tr("Reytinq")}: ${score.overall}\n${lineup.map((s) => `${s.label} ${shortName(s.pick.player.name)}`).join(", ")}\nfutgrid.az`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {}
  };
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_520px]">
      <div className="animate-[u11In_0.5s_ease-out_both]">
        <p className={`${FONT} text-sm font-bold uppercase tracking-[0.28em] text-gold`}>{tr("Heyət hazırdır")}</p>
        <div className="mt-4 flex items-center gap-5">
          <span className="grid h-32 w-32 shrink-0 place-items-center rounded-full bg-gold text-black shadow-[0_20px_40px_-18px_var(--fg-gold)] md:h-40 md:w-40">
            <span className="text-center">
              <span className={`block ${FONT} text-5xl font-black leading-none md:text-6xl`}>{score.overall}</span>
              <span className={`block ${FONT} text-xs font-extrabold uppercase tracking-[0.2em]`}>{tr("Reytinq")}</span>
            </span>
          </span>
          <div>
            <h2 className={`${FONT} text-3xl font-black uppercase leading-tight text-ink md:text-4xl`}>{verdict(score.overall)}</h2>
            <p className={`mt-2 ${FONT} text-sm text-muted`}>
              {tr("Orta reytinq {avg} + kimya {chem}", { avg: score.avg, chem: score.chem })}
            </p>
          </div>
        </div>
        <div className={`mt-6 space-y-2 border-t border-line/10 pt-4 ${FONT} text-sm text-ink-soft`}>
          {best && (
            <p className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold" />
              {tr("Ən güclü seçim:")} <b className="text-ink">{best.player.name}</b> · {best.club.name} {eraLabel(best.era)} · {best.rating}
            </p>
          )}
          <p className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-good-hi" />
            {score.links.length
              ? tr("Kimya: {n} əlaqə (eyni klub və dövr, eyni ölkə)", { n: score.links.length })
              : tr("Kimya bonusu yoxdur.")}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={onAgain} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <RotateCcw className="h-4 w-4" />
            {daily ? tr("Sərbəst oyna") : tr("Yenidən oyna")}
          </button>
          <button type="button" onClick={share} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <Copy className="h-4 w-4" />
            {copied ? tr("Kopyalandı!") : tr("Nəticəni paylaş")}
          </button>
          <button type="button" onClick={onSettings} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <Settings2 className="h-4 w-4" />
            {tr("Parametrlər")}
          </button>
        </div>
      </div>
      <Pitch data={data} lineup={lineup} />
    </div>
  );
}

export default function UltimateGame({ data, formation, difficulty, daily, onAgain, onSettings }) {
  const combos = useMemo(() => buildCombos(data, difficulty), [data, difficulty]);
  const random = useMemo(
    () => (daily ? seeded(seedFrom(`ultimate:${todayKey()}:${formation}`)) : Math.random),
    [daily, formation],
  );
  const [lineup, setLineup] = useState(() => newLineup(formation));
  const [round, setRound] = useState(null);
  const [spinning, setSpinning] = useState(true);
  const [powers, setPowers] = useState(freshPowers);
  const [mode, setMode] = useState(null); // "trade" | "double"
  const [picksLeft, setPicksLeft] = useState(1);
  const [lastSeat, setLastSeat] = useState(null);
  const lineupRef = useRef(lineup);
  lineupRef.current = lineup;

  const shuffleClubs = useMemo(() => {
    const seen = new Map();
    for (const c of combos) if (!seen.has(c.club.id)) seen.set(c.club.id, c.club);
    return [...seen.values()].sort(() => Math.random() - 0.5).slice(0, 24);
  }, [combos]);
  const shuffleEras = useMemo(() => [...new Set(combos.map((c) => c.era))].sort(() => Math.random() - 0.5), [combos]);

  const roll = (fn) => {
    setSpinning(true);
    const next = fn();
    setTimeout(() => {
      setRound(next);
      setSpinning(false);
    }, SPIN_MS);
  };

  useEffect(() => {
    roll(() => spin(combos, lineupRef.current, random));
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
    const remaining = picksLeft - 1;
    if (remaining > 0 && !isComplete(next)) {
      setPicksLeft(remaining);
      setRound({ ...round, options: round.options.filter((p) => p.id !== player.id) });
      return;
    }
    setPicksLeft(1);
    setMode(null);
    if (isComplete(next)) return;
    roll(() => spin(combos, next, random, { avoid: round.combo.key }));
  };

  const usePower = (key) => {
    if (spinning || !round) return;
    if (mode === key) {
      setMode(null);
      return;
    }
    if (!powers[key]) return;
    if (key === "trade") {
      if (!filled) return;
      setMode("trade");
      return;
    }
    setPowers((p) => ({ ...p, [key]: p[key] - 1 }));
    if (key === "club" || key === "era") roll(() => reroll(combos, round, lineup, random, key));
    else if (key === "star") setRound(starOptions(round, lineup, random));
    else if (key === "double") {
      setPicksLeft(2);
      setMode("double");
    }
  };

  const onSlot = (i) => {
    if (mode !== "trade") return;
    setLineup(removeAt(lineup, i));
    setPowers((p) => ({ ...p, trade: p.trade - 1 }));
    setMode(null);
  };

  if (done)
    return (
      <Result data={data} lineup={lineup} formation={formation} daily={daily} onAgain={onAgain} onSettings={onSettings} />
    );

  if (!combos.length)
    return <p className={`${FONT} text-center text-muted`}>{tr("Bu səviyyə üçün kifayət qədər data yoxdur.")}</p>;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_480px]">
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-muted`}>
            {tr("Raund")} <span className="text-ink">{Math.min(filled + 1, ROUNDS)}</span> / {ROUNDS} · {formation}
            {daily && <span className="ml-2 text-gold">· {tr("Gündəlik")}</span>}
          </p>
          <div className="flex gap-1">
            {Array.from({ length: ROUNDS }, (_, i) => (
              <span key={i} className={`h-1.5 w-4 rounded-full md:w-6 ${i < filled ? "bg-gold" : i === filled ? "bg-accent" : "bg-line/12"}`} />
            ))}
          </div>
        </div>

        <Reels round={round} spinning={spinning} shuffleClubs={shuffleClubs} shuffleEras={shuffleEras} />

        <div className="mt-4">
          {round && !spinning ? (
            <>
              <p className={`mb-2 ${FONT} text-sm text-muted`}>
                <b className="text-ink">{round.combo.club.name}</b> · {eraLabel(round.combo.era)}
                {mode === "double" && <span className="ml-2 font-bold text-violet-400">· {tr("{n} seçim qalıb", { n: picksLeft })}</span>}
                {mode === "trade" && <span className="ml-2 font-bold text-bad-hi">· {tr("Meydançada çıxarmaq istədiyin oyunçunu seç")}</span>}
              </p>
              {!mode && !round.options.some((p) => canPlace(lineup, p)) && (
                <button
                  type="button"
                  onClick={() => roll(() => spin(combos, lineup, random, { avoid: round.combo.key }))}
                  className={`mb-2 w-full rounded-xl border-2 border-dashed border-accent/50 py-2.5 ${FONT} text-sm font-bold uppercase text-accent`}
                >
                  {tr("Heç biri yerləşmir — pulsuz yenidən fırlat")}
                </button>
              )}
              <div className="space-y-2">
                {round.options.map((p, i) => (
                  <OptionCard
                    key={`${round.combo.key}-${p.id}`}
                    data={data}
                    player={p}
                    combo={round.combo}
                    fits={canPlace(lineup, p)}
                    disabled={mode === "trade"}
                    star={round.star && i === 0}
                    index={i}
                    onPick={pick}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[68px] rounded-xl border-2 border-edge bg-surface/60 animate-[u11Pulse_1s_ease-in-out_infinite]" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-5">
          <Powers powers={powers} onUse={usePower} disabled={spinning} active={mode} />
        </div>
      </div>

      <Pitch data={data} lineup={lineup} tradeMode={mode === "trade"} onSlot={onSlot} lastSeat={lastSeat} />
    </div>
  );
}
