import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Flag, RotateCcw, Settings2 } from "lucide-react";
import { commonPlayers, isCommon, randomPair } from "../../../lib/games/common";
import PlayerSearch from "../common/PlayerSearch";
import ResultModal from "../common/ResultModal";
import { Notice } from "../common/GameStatus";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  FONT,
  SWEEP_BLUE,
  SWEEP_WHITE,
} from "../common/ui";
import AnswerList, { FoundPlayer } from "./AnswerList";
import PokerCard from "./PokerCard";
import { SIDES } from "./settings";

import { tr } from "../../../i18n";
function Stat({ label, value, sub, tone = "text-ink", compact }) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-line/10 bg-white/[0.03] px-3 text-center ${
        compact ? "flex-1 py-2" : "w-28 py-5 xl:w-32"
      }`}
    >
      <span
        className={`${FONT} text-xs font-bold uppercase tracking-[0.15em] text-muted`}
      >
        {label}
      </span>
      <span
        className={`${FONT} font-bold leading-none ${compact ? "text-3xl" : "text-5xl"} ${tone}`}
      >
        {value}
      </span>
      <span
        className={`h-4 ${FONT} text-[10px] uppercase tracking-[0.2em] text-faint`}
      >
        {sub}
      </span>
    </div>
  );
}

export default function OrtaqSolo({ data, settings, onSettings }) {
  const total = settings.rounds;
  const seen = useRef(new Set());
  const [index, setIndex] = useState(1);
  const [pair, setPair] = useState(undefined);
  const [revealed, setRevealed] = useState(false);
  const [phase, setPhase] = useState("guess");
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, skipped: 0 });
  const [found, setFound] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const deal = useCallback(() => {
    const next = randomPair(data, {
      difficulty: settings.difficulty,
      avoid: seen.current,
    });
    if (next) seen.current.add(next.key);
    setPair(next);
    setRevealed(false);
    setPhase("guess");
    setFound(null);
    setFeedback(null);
  }, [data, settings.difficulty]);

  useEffect(() => {
    deal();
  }, [deal]);

  useEffect(() => {
    if (!pair) return;
    const t = setTimeout(() => setRevealed(true), 650);
    return () => clearTimeout(t);
  }, [pair]);

  const answers = useMemo(
    () => (pair && phase === "done" ? commonPlayers(data, pair.a, pair.b) : []),
    [data, pair, phase],
  );
  const last = index >= total;

  const guess = (player) => {
    if (isCommon(pair.a, pair.b, player)) {
      setScore((s) => s + 1);
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
      setFound(player);
      setPhase("done");
      setFeedback({ type: "ok", text: tr("Düzdür! +1 xal") });
    } else {
      setScore((s) => s - 1);
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
      setFeedback({
        type: "wrong",
        text: tr("{name} ortaq oyunçu deyil. −1 xal", { name: player.name }),
      });
    }
  };

  const skip = () => {
    setStats((s) => ({ ...s, skipped: s.skipped + 1 }));
    setPhase("done");
    setFeedback({ type: "info", text: tr("Keçdin. Cavablar aşağıdadır.") });
  };

  const next = () => {
    if (last) return setShowModal(true);
    setIndex((i) => i + 1);
    deal();
  };

  const restart = () => {
    seen.current = new Set();
    setIndex(1);
    setScore(0);
    setStats({ correct: 0, wrong: 0, skipped: 0 });
    setShowModal(false);
    deal();
  };

  if (pair === null)
    return (
      <Notice
        title={tr("Cüt tapılmadı")}
        text={tr("Bu səviyyədə uyğun klub və ölkə cütü qalmadı. Səviyyəni dəyiş.")}
      />
    );
  if (!pair) return null;

  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="mb-3 flex gap-3 md:hidden">
        <Stat compact label={tr("Sual")} value={`${index}/${total}`} sub="" />
        <Stat
          compact
          label={tr("Xal")}
          value={score}
          sub={tr("{correct} düz · {wrong} səhv", { correct: stats.correct, wrong: stats.wrong })}
          tone={score < 0 ? "text-bad" : "text-ink"}
        />
      </div>

      <div className="relative rounded-3xl border border-line/5 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--fg-accent)_8%,transparent),transparent_70%)] px-2 py-5 md:px-6">
        <div className="flex items-center justify-center gap-3 md:gap-6">
          <div className="hidden md:block">
            <Stat label={tr("Sual")} value={index} sub={`${total} sualdan`} />
          </div>
          <PokerCard
            key={`a-${pair.key}`}
            entity={pair.a}
            state={revealed ? "revealed" : "hidden"}
            owner="Sistem"
            side={SIDES.A}
            delay={0}
          />
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full border border-line/15 bg-surface ${FONT} text-sm font-bold text-soft`}
          >
            +
          </span>
          <PokerCard
            key={`b-${pair.key}`}
            entity={pair.b}
            state={revealed ? "revealed" : "hidden"}
            owner="Sistem"
            side={SIDES.B}
            delay={380}
          />
          <div className="hidden md:block">
            <Stat
              label={tr("Xal")}
              value={score}
              sub={tr("{correct} düz · {wrong} səhv", { correct: stats.correct, wrong: stats.wrong })}
              tone={score < 0 ? "text-bad" : "text-ink"}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-3">
        {phase === "guess" && (
          <PlayerSearch
            data={data}
            focusKey={`${index}-${phase}`}
            placeholder={tr("{label} və {label2} ilə bağlı oyunçunu yaz...", { label: pair.a.label, label2: pair.b.label })}
            onSelect={guess}
          />
        )}
        {phase === "done" && found && (
          <FoundPlayer player={found} title={tr("Düzgün cavab")} />
        )}
        {phase === "done" && (
          <AnswerList answers={answers} exclude={found?.id} />
        )}

        {!(phase === "done" && found) && (
          <div
            aria-live="polite"
            className={`min-h-11 rounded-xl border-l-2 px-4 py-2.5 text-center ${FONT} text-sm md:text-base ${
              feedback?.type === "ok"
                ? "border-l-good bg-good-lo/10 text-good-hi"
                : feedback?.type === "wrong"
                  ? "border-l-bad-lo bg-bad-lo/10 text-bad-hi"
                  : "border-l-line/20 bg-line/5 text-muted"
            }`}
          >
            {feedback?.text ??
              tr("Hər iki karta uyğun oyunçunu tap. Düz cavab +1, səhv cavab −1 xal.")}
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {phase === "guess" ? (
            <button type="button" onClick={skip} className={BTN_GHOST}>
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <Flag className="h-4 w-4" />
              {tr("Keç")}
            </button>
          ) : (
            <button type="button" onClick={next} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <ArrowRight className="h-4 w-4" />
              {last ? tr("Nəticə") : tr("Növbəti sual")}
            </button>
          )}
          <button type="button" onClick={onSettings} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <Settings2 className="h-4 w-4" />
            {tr("Parametrlər")}
          </button>
        </div>
      </div>

      <ResultModal
        open={showModal}
        onClose={() => setShowModal(false)}
        eyebrow={tr("Oyun bitdi")}
        title={`${score} xal`}
        actions={
          <button type="button" onClick={restart} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <RotateCcw className="h-4 w-4" />
            {tr("Yenidən oyna")}
          </button>
        }
      >
        <p className={`${FONT} text-base text-muted`}>
          {tr("{total} sualdan {correct} düz, {wrong} səhv cavab, {skipped} keçid.", {
            total,
            correct: stats.correct,
            wrong: stats.wrong,
            skipped: stats.skipped,
          })}
        </p>
      </ResultModal>
    </div>
  );
}
