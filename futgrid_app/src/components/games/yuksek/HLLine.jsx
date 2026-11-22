import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Equal, Flame, RotateCcw, Settings2, Trophy, X } from "lucide-react";
import {
  METRIC,
  buildPool,
  lineAnswer,
  loadBest,
  pickLine,
  pickLinePlayer,
  saveBest,
} from "../../../lib/games/higherLower";
import { POS_NAME, clubOf, countryOf } from "../../../lib/games/playerInfo";
import PlayerAvatar, { ClubLogo, Flag } from "../common/PlayerAvatar";
import ResultModal from "../common/ResultModal";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { tr } from "../../../i18n";

const NEXT_MS = 1400;

const CHOICES = [
  { dir: "up", Icon: ArrowUp, get label() {
    return tr("Çoxdur");
  }, tone: "bg-good-lo/15 text-good-hi ring-good/40 hover:bg-good-lo hover:text-white" },
  { dir: "equal", Icon: Equal, get label() {
    return tr("Bərabərdir");
  }, tone: "bg-gold/12 text-gold-hi ring-gold/40 hover:bg-gold hover:text-black" },
  { dir: "down", Icon: ArrowDown, get label() {
    return tr("Azdır");
  }, tone: "bg-bad-lo/15 text-bad-hi ring-bad/40 hover:bg-bad-lo hover:text-white" },
];

function freshRound(pool, recent) {
  const player = pickLinePlayer(pool, recent, Math.random);
  return { player, line: pickLine(player, Math.random) };
}

// "Rəqəmlə" rejimi: oyunçunun bazar dəyəri verilmiş məbləğdən çox, az, yoxsa bərabərdir?
export default function HLLine({ data, settings, onSettings }) {
  const { difficulty } = settings;
  const bestKey = `${difficulty}:line`;
  const pool = useMemo(() => buildPool(data, difficulty), [data, difficulty]);
  const recent = useRef(new Set());
  const [best, setBest] = useState(() => loadBest(bestKey));
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(() => freshRound(pool, recent.current));
  const [phase, setPhase] = useState("guess"); // guess | right | wrong | over
  const [picked, setPicked] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const answer = lineAnswer(round.player, round.line);
  const value = METRIC.get(round.player);

  const guess = useCallback(
    (dir) => {
      if (phase !== "guess") return;
      setPicked(dir);
      const ok = dir === answer;
      setPhase(ok ? "right" : "wrong");
      timer.current = setTimeout(() => {
        if (ok) {
          recent.current.add(round.player.id);
          if (recent.current.size > 60) recent.current = new Set([...recent.current].slice(-40));
          setStreak((s) => s + 1);
          setRound(freshRound(pool, recent.current));
          setPicked(null);
          setPhase("guess");
        } else {
          if (streak > best) {
            setBest(streak);
            saveBest(bestKey, streak);
          }
          setPhase("over");
        }
      }, NEXT_MS);
    },
    [phase, answer, round.player.id, pool, streak, best, bestKey],
  );

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowUp: "up", ArrowDown: "down", "=": "equal", Enter: "equal" };
      if (map[e.key]) {
        e.preventDefault();
        guess(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guess]);

  const restart = () => {
    clearTimeout(timer.current);
    recent.current = new Set();
    setStreak(0);
    setRound(freshRound(pool, recent.current));
    setPicked(null);
    setPhase("guess");
  };

  const p = round.player;
  const club = clubOf(data, p);
  const country = countryOf(data, p);
  const shown = phase === "right" ? streak + 1 : streak;
  const revealed = phase !== "guess";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-400" />
            <span className={`${FONT} text-xs uppercase tracking-[0.2em] text-faint`}>{tr("Seriya")}</span>
            <span key={shown} className={`${FONT} text-2xl font-bold text-ink animate-[hlPop_0.4s_ease-out]`}>
              {shown}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold-hi" />
            <span className={`${FONT} text-xs uppercase tracking-[0.2em] text-faint`}>{tr("Rekord")}</span>
            <span className={`${FONT} text-2xl font-bold text-gold-hi`}>{Math.max(best, shown)}</span>
          </div>
        </div>
        <button type="button" onClick={onSettings} className={`${BTN_GHOST} px-4! py-2!`}>
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">{tr("Parametrlər")}</span>
        </button>
      </div>

      <div
        key={`${p.id}-${round.line}`}
        className={`relative mx-auto mt-6 max-w-2xl overflow-hidden rounded-[20px] border bg-surface/90 px-5 pb-6 pt-7 text-center transition-[border-color,box-shadow] duration-500 animate-[hlIn_0.5s_ease-out_both] md:px-8 md:pt-9 ${
          phase === "right"
            ? "border-good/70 shadow-[0_24px_70px_-30px_color-mix(in_srgb,var(--fg-good)_70%,transparent)]"
            : phase === "wrong" || phase === "over"
              ? "border-bad/70 shadow-[0_24px_70px_-30px_color-mix(in_srgb,var(--fg-bad)_70%,transparent)]"
              : "border-line/10"
        }`}
      >
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto w-fit">
          <PlayerAvatar player={p} className="h-24 w-24 border-2 sm:h-28 sm:w-28 lg:h-36 lg:w-36" textClass="text-3xl" />
        </div>
        <h3 className={`relative mt-3 ${FONT} text-2xl font-bold uppercase leading-tight text-ink md:text-3xl`}>{p.name}</h3>
        <div className={`relative mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 ${FONT} text-sm text-muted`}>
          {country && (
            <span className="inline-flex items-center gap-1.5">
              <Flag country={country} />
              {country.name}
            </span>
          )}
          {club && (
            <span className="inline-flex items-center gap-1.5">
              <ClubLogo club={club} className="h-4 w-4" />
              {club.name}
            </span>
          )}
          {p.position && <span className="text-faint">{POS_NAME[p.position]}</span>}
        </div>

        <div className="relative mt-6 border-t border-line/8 pt-5">
          <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-muted`}>
            {tr("Bazar dəyəri bu məbləğdən...")}
          </p>
          <p className={`mt-1 ${FONT} text-5xl font-extrabold leading-tight text-gold-hi md:text-6xl`}>
            {METRIC.format(round.line)}
          </p>
          {revealed ? (
            <p
              className={`mt-3 inline-flex items-center gap-2 ${FONT} text-lg font-bold ${
                phase === "right" ? "text-good-hi" : "text-bad-hi"
              }`}
            >
              {phase === "right" ? <Check className="h-5 w-5" strokeWidth={3} /> : <X className="h-5 w-5" strokeWidth={3} />}
              {tr("Əsl dəyəri: {v}", { v: METRIC.format(value) })}
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            {CHOICES.map(({ dir, Icon, label, tone }) => (
              <button
                key={dir}
                type="button"
                disabled={phase !== "guess"}
                onClick={() => guess(dir)}
                className={`group flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl ring-1 ${FONT} text-sm font-bold uppercase tracking-wide transition-[background-color,color,transform,opacity] duration-200 active:scale-95 disabled:cursor-default sm:h-15 sm:flex-row sm:gap-2 sm:text-base ${tone} ${
                  revealed && dir === answer ? "outline-2 outline-offset-2 outline-good" : ""
                } ${revealed && picked === dir && dir !== answer ? "opacity-50" : ""}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className={`mt-4 hidden text-center ${FONT} text-xs uppercase tracking-[0.2em] text-dim md:block`}>
        {tr("Klaviatura: ↑ çoxdur · = bərabərdir · ↓ azdır")}
      </p>

      <ResultModal
        open={phase === "over"}
        onClose={restart}
        eyebrow={tr("Seriya bitdi")}
        title={tr("{streak} düzgün cavab", { streak })}
        actions={
          <>
            <button type="button" onClick={restart} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              {tr("Yenidən oyna")}
            </button>
            <button type="button" onClick={onSettings} className={BTN_GHOST}>
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <Settings2 className="h-4 w-4" />
              {tr("Parametrlər")}
            </button>
          </>
        }
      >
        <p className={`${FONT} text-base text-muted`}>
          {p.name}: <span className="font-bold text-ink">{METRIC.format(value)}</span> · {tr("Məbləğ")}:{" "}
          <span className="font-bold text-ink">{METRIC.format(round.line)}</span>
        </p>
        <p className={`mt-2 ${FONT} text-base text-muted`}>
          {tr("Rekord:")} <span className="font-bold text-gold-hi">{Math.max(best, streak)}</span>
        </p>
      </ResultModal>
    </div>
  );
}
