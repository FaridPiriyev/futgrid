import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Flame, RotateCcw, Settings2, Trophy, X } from "lucide-react";
import {
  METRIC,
  buildPool,
  firstRound,
  isCorrect,
  loadBest,
  pickChallenger,
  saveBest,
} from "../../../lib/games/higherLower";
import { POS_NAME, clubOf, countryOf } from "../../../lib/games/playerInfo";
import PlayerAvatar, { ClubLogo, Flag } from "../common/PlayerAvatar";
import ResultModal from "../common/ResultModal";
import { Notice } from "../common/GameStatus";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";

export const HL_KEYFRAMES = `
@keyframes hlIn { from { opacity: 0; transform: translateY(18px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes hlShift { from { opacity: .3; transform: translateX(28px); } to { opacity: 1; transform: none; } }
@keyframes hlPop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
@keyframes hlShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
@keyframes hlQ { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .55; transform: scale(.94); } }
@keyframes hlFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
`;

const REVEAL_MS = 900;
const NEXT_MS = 1500;

function RevealNumber({ value, format }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(value);
      return;
    }
    let frame;
    let start;
    const step = (t) => {
      start ??= t;
      const p = Math.min(1, (t - start) / REVEAL_MS);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return format(Math.round(v));
}

function PlayerCard({ data, player, side, phase, correct, onGuess, animate }) {
  const m = METRIC;
  const club = clubOf(data, player);
  const country = countryOf(data, player);
  const value = m.get(player);
  const hidden = side === "b" && phase === "guess";
  const revealed = side === "b" && phase !== "guess";
  const tone =
    revealed && correct !== null
      ? correct
        ? "border-emerald-400/70 shadow-[0_0_0_1px_rgba(52,211,153,0.4),0_24px_70px_-30px_rgba(52,211,153,0.7)]"
        : "border-red-400/70 shadow-[0_0_0_1px_rgba(248,113,113,0.4),0_24px_70px_-30px_rgba(248,113,113,0.7)]"
      : "border-white/10";

  return (
    <div
      className={`relative flex h-full flex-col items-center overflow-hidden border bg-[#0b0e14]/90 px-4 pb-5 pt-6 text-center transition-[border-color,box-shadow] duration-500 md:px-6 md:pb-7 md:pt-8 ${tone} ${animate}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl ${
          side === "a" ? "bg-blue-500/20" : "bg-amber-400/15"
        }`}
      />
      <PlayerAvatar
        key={player.id}
        player={player}
        className="h-24 w-24 border-2 md:h-32 md:w-32"
        textClass="text-3xl md:text-4xl"
      />
      <h3 className={`relative mt-3 ${FONT} text-2xl font-bold uppercase leading-tight text-white md:text-3xl`}>
        {player.name}
      </h3>
      <div
        className={`relative mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 ${FONT} text-sm text-neutral-400`}
      >
        {country && (
          <span className="inline-flex items-center gap-1.5">
            <Flag key={country.code} country={country} />
            {country.name}
          </span>
        )}
        {club && (
          <span className="inline-flex items-center gap-1.5">
            <ClubLogo key={club.name} club={club} className="h-4 w-4" />
            {club.name}
          </span>
        )}
        {player.position && <span className="text-neutral-500">{POS_NAME[player.position]}</span>}
      </div>
      <div className="min-h-5 flex-1" />

      <div className="relative mt-auto w-full border-t border-white/8 pt-4">
        <p className={`${FONT} text-xs font-bold uppercase tracking-[0.22em] text-neutral-500`}>
          {m.label}
        </p>
        {hidden ? (
          <>
            <p
              className={`${FONT} text-5xl font-bold leading-tight text-amber-300 animate-[hlQ_1.6s_ease-in-out_infinite] md:text-6xl`}
            >
              ?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onGuess("up")}
                className={`group flex h-13 items-center justify-center gap-2 bg-emerald-500/15 ${FONT} text-base font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/40 transition-[background-color,transform] duration-200 hover:bg-emerald-500 hover:text-white active:scale-95`}
              >
                <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                Daha çox
              </button>
              <button
                type="button"
                onClick={() => onGuess("down")}
                className={`group flex h-13 items-center justify-center gap-2 bg-red-500/15 ${FONT} text-base font-bold uppercase tracking-wide text-red-300 ring-1 ring-red-400/40 transition-[background-color,transform] duration-200 hover:bg-red-500 hover:text-white active:scale-95`}
              >
                <ArrowDown className="h-5 w-5 transition-transform duration-200 group-hover:translate-y-0.5" />
                Daha az
              </button>
            </div>
          </>
        ) : (
          <p
            className={`${FONT} text-5xl font-bold leading-tight md:text-6xl ${
              revealed ? (correct ? "text-emerald-300" : "text-red-300") : "text-white"
            }`}
          >
            {revealed ? <RevealNumber value={value} format={m.format} /> : m.format(value)}
          </p>
        )}
      </div>
    </div>
  );
}

function Badge({ phase, correct, streak }) {
  if (phase === "guess")
    return (
      <span className={`grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-[#05060a] ${FONT} text-lg font-bold text-neutral-300`}>
        VS
      </span>
    );
  return correct ? (
    <span key={`ok-${streak}`} className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-[hlPop_0.45s_ease-out]">
      <Check className="h-7 w-7" strokeWidth={3} />
    </span>
  ) : (
    <span className="grid h-14 w-14 place-items-center rounded-full bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-[hlShake_0.5s_ease-out]">
      <X className="h-7 w-7" strokeWidth={3} />
    </span>
  );
}

export default function HLGame({ data, settings, onSettings }) {
  const { difficulty } = settings;
  const pool = useMemo(() => buildPool(data, difficulty), [data, difficulty]);
  const [best, setBest] = useState(() => loadBest(difficulty));
  const [newRecord, setNewRecord] = useState(false);
  const fresh = useCallback(() => {
    const r = firstRound(pool, Math.random);
    return r
      ? { ...r, streak: 0, round: 1, phase: "guess", correct: null, recent: [r.a.id, r.b.id] }
      : null;
  }, [pool]);
  const [game, setGame] = useState(fresh);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const guess = useCallback((dir) => {
    setGame((g) => {
      if (!g || g.phase !== "guess") return g;
      const ok = isCorrect(g.a, g.b, dir);
      return { ...g, phase: ok ? "reveal" : "wrong", correct: ok };
    });
  }, []);

  useEffect(() => {
    if (!game || game.phase === "guess" || game.phase === "over") return;
    if (game.phase === "wrong") {
      timer.current = setTimeout(() => {
        if (game.streak > best) {
          setBest(game.streak);
          saveBest(difficulty, game.streak);
          setNewRecord(true);
        }
        setGame((g) => ({ ...g, phase: "over" }));
      }, NEXT_MS);
      return () => clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      setGame((g) => {
        const streak = g.streak + 1;
        const a = g.b;
        const recent = [...g.recent, a.id].slice(-40);
        const b = pickChallenger(pool, a, streak, new Set(recent), Math.random);
        if (!b) return { ...g, streak, phase: "over" };
        return {
          a,
          b,
          streak,
          round: g.round + 1,
          phase: "guess",
          correct: null,
          recent: [...recent, b.id],
        };
      });
    }, NEXT_MS);
    return () => clearTimeout(timer.current);
  }, [game?.phase, game?.round]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        guess("up");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        guess("down");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guess]);

  const restart = () => {
    clearTimeout(timer.current);
    setNewRecord(false);
    setGame(fresh());
  };

  if (!game)
    return (
      <Notice
        title="Oyunçu tapılmadı"
        text="Bazar dəyəri olan kifayət qədər oyunçu yoxdur."
      />
    );

  const phase = game.phase === "over" ? "wrong" : game.phase;
  const shownStreak = game.phase === "reveal" ? game.streak + 1 : game.streak;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            <span className={`${FONT} text-xs uppercase tracking-[0.2em] text-neutral-500`}>Seriya</span>
            <span
              key={shownStreak}
              className={`${FONT} text-2xl font-bold text-white animate-[hlPop_0.4s_ease-out]`}
            >
              {shownStreak}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-300" />
            <span className={`${FONT} text-xs uppercase tracking-[0.2em] text-neutral-500`}>Rekord</span>
            <span className={`${FONT} text-2xl font-bold text-amber-300`}>
              {Math.max(best, shownStreak)}
            </span>
          </div>
        </div>
        <button type="button" onClick={onSettings} className={`${BTN_GHOST} px-4! py-2!`}>
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Parametrlər</span>
        </button>
      </div>

      <h2
        className={`mt-5 text-center ${FONT} text-xl font-bold uppercase text-white md:text-3xl`}
      >
        {METRIC.question}
      </h2>

      <div className="mt-5 grid items-stretch gap-3 md:mt-7 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        <PlayerCard
          key={`a-${game.a.id}-${game.round}`}
          data={data}
          player={game.a}
          side="a"
          phase={phase}
          animate={game.round > 1 ? "animate-[hlShift_0.5s_cubic-bezier(.2,.8,.2,1)_both]" : "animate-[hlIn_0.5s_ease-out_both]"}
        />
        <div className="relative z-10 -my-7 flex items-center justify-center md:my-0">
          <Badge phase={phase} correct={game.correct} streak={shownStreak} />
        </div>
        <PlayerCard
          key={`b-${game.b.id}-${game.round}`}
          data={data}
          player={game.b}
          side="b"
          phase={phase}
          correct={game.correct}
          onGuess={guess}
          animate="animate-[hlIn_0.5s_ease-out_0.12s_both]"
        />
      </div>

      <p className={`mt-4 hidden text-center ${FONT} text-xs uppercase tracking-[0.2em] text-neutral-600 md:block`}>
        Klaviatura: ↑ daha çox · ↓ daha az
      </p>

      <ResultModal
        open={game.phase === "over"}
        onClose={restart}
        eyebrow={newRecord ? "Yeni rekord!" : "Seriya bitdi"}
        title={`${game.streak} düzgün cavab`}
        actions={
          <>
            <button type="button" onClick={restart} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              Yenidən oyna
            </button>
            <button type="button" onClick={onSettings} className={BTN_GHOST}>
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <Settings2 className="h-4 w-4" />
              Parametrlər
            </button>
          </>
        }
      >
        <p className={`${FONT} text-base text-neutral-400`}>
          {game.b.name}: <span className="font-bold text-white">{METRIC.format(METRIC.get(game.b))}</span>
          {" · "}
          {game.a.name}: <span className="font-bold text-white">{METRIC.format(METRIC.get(game.a))}</span>
        </p>
        <p className={`mt-2 ${FONT} text-base text-neutral-400`}>
          Rekord: <span className="font-bold text-amber-300">{best}</span>
        </p>
      </ResultModal>
    </div>
  );
}
