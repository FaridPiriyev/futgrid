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
        ? "border-good/70 shadow-[0_0_0_1px_color-mix(in_srgb,var(--fg-good)_40%,transparent),0_24px_70px_-30px_color-mix(in_srgb,var(--fg-good)_70%,transparent)]"
        : "border-bad/70 shadow-[0_0_0_1px_color-mix(in_srgb,var(--fg-bad)_40%,transparent),0_24px_70px_-30px_color-mix(in_srgb,var(--fg-bad)_70%,transparent)]"
      : "border-line/10";

  return (
    <div
      className={`relative flex h-full flex-col items-center overflow-hidden border bg-surface/90 px-4 pb-5 pt-6 text-center transition-[border-color,box-shadow] duration-500 md:px-6 md:pb-7 md:pt-8 ${tone} ${animate}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl ${
          side === "a" ? "bg-accent/20" : "bg-gold/15"
        }`}
      />
      <PlayerAvatar
        key={player.id}
        player={player}
        className="h-24 w-24 border-2 md:h-32 md:w-32"
        textClass="text-3xl md:text-4xl"
      />
      <h3 className={`relative mt-3 ${FONT} text-2xl font-bold uppercase leading-tight text-ink md:text-3xl`}>
        {player.name}
      </h3>
      <div
        className={`relative mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 ${FONT} text-sm text-muted`}
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
        {player.position && <span className="text-faint">{POS_NAME[player.position]}</span>}
      </div>
      <div className="min-h-5 flex-1" />

      <div className="relative mt-auto w-full border-t border-line/8 pt-4">
        <p className={`${FONT} text-xs font-bold uppercase tracking-[0.22em] text-faint`}>
          {m.label}
        </p>
        {hidden ? (
          <>
            <p
              className={`${FONT} text-5xl font-bold leading-tight text-gold-hi animate-[hlQ_1.6s_ease-in-out_infinite] md:text-6xl`}
            >
              ?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onGuess("up")}
                className={`group flex h-13 items-center justify-center gap-2 bg-good-lo/15 ${FONT} text-base font-bold uppercase tracking-wide text-good-hi ring-1 ring-good/40 transition-[background-color,transform] duration-200 hover:bg-good-lo hover:text-white active:scale-95`}
              >
                <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                Daha çox
              </button>
              <button
                type="button"
                onClick={() => onGuess("down")}
                className={`group flex h-13 items-center justify-center gap-2 bg-bad-lo/15 ${FONT} text-base font-bold uppercase tracking-wide text-bad-hi ring-1 ring-bad/40 transition-[background-color,transform] duration-200 hover:bg-bad-lo hover:text-white active:scale-95`}
              >
                <ArrowDown className="h-5 w-5 transition-transform duration-200 group-hover:translate-y-0.5" />
                Daha az
              </button>
            </div>
          </>
        ) : (
          <p
            className={`${FONT} text-5xl font-bold leading-tight md:text-6xl ${
              revealed ? (correct ? "text-good-hi" : "text-bad-hi") : "text-ink"
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
      <span className={`grid h-14 w-14 place-items-center rounded-full border border-line/15 bg-page ${FONT} text-lg font-bold text-soft`}>
        VS
      </span>
    );
  return correct ? (
    <span key={`ok-${streak}`} className="grid h-14 w-14 place-items-center rounded-full bg-good-lo text-white shadow-[0_0_30px_color-mix(in_srgb,var(--fg-good-lo)_60%,transparent)] animate-[hlPop_0.45s_ease-out]">
      <Check className="h-7 w-7" strokeWidth={3} />
    </span>
  ) : (
    <span className="grid h-14 w-14 place-items-center rounded-full bg-bad-lo text-white shadow-[0_0_30px_color-mix(in_srgb,var(--fg-bad-lo)_60%,transparent)] animate-[hlShake_0.5s_ease-out]">
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
            <span className={`${FONT} text-xs uppercase tracking-[0.2em] text-faint`}>Seriya</span>
            <span
              key={shownStreak}
              className={`${FONT} text-2xl font-bold text-ink animate-[hlPop_0.4s_ease-out]`}
            >
              {shownStreak}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold-hi" />
            <span className={`${FONT} text-xs uppercase tracking-[0.2em] text-faint`}>Rekord</span>
            <span className={`${FONT} text-2xl font-bold text-gold-hi`}>
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
        className={`mt-5 text-center ${FONT} text-xl font-bold uppercase text-ink md:text-3xl`}
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

      <p className={`mt-4 hidden text-center ${FONT} text-xs uppercase tracking-[0.2em] text-dim md:block`}>
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
        <p className={`${FONT} text-base text-muted`}>
          {game.b.name}: <span className="font-bold text-ink">{METRIC.format(METRIC.get(game.b))}</span>
          {" · "}
          {game.a.name}: <span className="font-bold text-ink">{METRIC.format(METRIC.get(game.a))}</span>
        </p>
        <p className={`mt-2 ${FONT} text-base text-muted`}>
          Rekord: <span className="font-bold text-gold-hi">{best}</span>
        </p>
      </ResultModal>
    </div>
  );
}
