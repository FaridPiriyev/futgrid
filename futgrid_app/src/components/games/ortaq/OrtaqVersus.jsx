import { useMemo, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Flag,
  Hand,
  RotateCcw,
  Settings2,
  Undo2,
} from "lucide-react";
import {
  commonPlayers,
  isCommon,
  pairProblem,
} from "../../../lib/games/common";
import EntitySearch from "../common/EntitySearch";
import PlayerSearch from "../common/PlayerSearch";
import ResultModal from "../common/ResultModal";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  FONT,
  SWEEP_BLUE,
  SWEEP_WHITE,
} from "../common/ui";
import AnswerList, { FoundPlayer } from "./AnswerList";
import PokerCard from "./PokerCard";
import { SIDES, otherSide, sideName } from "./settings";

import { tr } from "../../../i18n";
const CLUB_ONLY = ["club"];
const ANY = ["club", "country"];

function ScorePanel({ name, score, side, status, active, compact }) {
  return (
    <div
      className={`relative flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border px-3 text-center transition-all duration-500 ${
        compact ? "flex-1 py-2" : "w-28 py-5 xl:w-32"
      } ${active ? `${side.border} ${side.bg} scale-105` : "border-line/10 bg-white/[0.03]"}`}
      style={active ? { boxShadow: `0 0 30px -8px ${side.glow}` } : undefined}
    >
      <span
        className={`max-w-full truncate ${FONT} text-xs font-bold uppercase tracking-[0.15em] ${side.text}`}
      >
        {name}
      </span>
      <span
        className={`${FONT} font-bold leading-none text-ink ${compact ? "text-3xl" : "text-5xl"}`}
      >
        {score}
      </span>
      <span
        className={`h-4 ${FONT} text-[10px] uppercase tracking-[0.2em] text-muted`}
      >
        {status}
      </span>
    </div>
  );
}

function Curtain({ picker, other, step, round, onReady }) {
  const steps = [
    step === 1 ? picker.name : other.name,
    step === 1 ? other.name : picker.name,
  ];
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto rounded-3xl bg-page/95 p-3 backdrop-blur-xl md:p-6"
      style={{ animation: "ortaqDeal 350ms ease-out both" }}
    >
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <span
          className={`rounded-full bg-ink px-3 py-1 ${FONT} text-[11px] font-black uppercase tracking-[0.18em] text-page`}
        >
          {tr("Raund {round} · Addım {step} / 2", { round, step })}
        </span>
        <p
          className={`mt-3 ${FONT} text-sm font-bold uppercase tracking-[0.2em] text-muted`}
        >
          {tr("İndi seçim edir")}
        </p>
        <p
          className={`${FONT} text-4xl font-black uppercase leading-none md:text-5xl ${picker.side.text}`}
        >
          {picker.name}
        </p>

        <div className="mt-5 grid w-full gap-3 sm:grid-cols-2">
          <div
            className={`rounded-2xl border-2 p-4 text-left ${picker.side.border} ${picker.side.bg}`}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${picker.side.solid}`}
              >
                <Hand className="h-4.5 w-4.5" />
              </span>
              <span className={`${FONT} text-base font-black uppercase text-ink`}>
                {picker.name}
              </span>
            </span>
            <p className={`mt-2.5 ${FONT} text-[15px] leading-snug text-ink-soft`}>
              {step === 1
                ? tr("Cihazı götür və bir klub seç. Seçimin kart açılana qədər gizli qalacaq.")
                : tr("Cihazı götür və bir klub və ya ölkə seç. Seçimin kart açılana qədər gizli qalacaq.")}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-edge bg-surface p-4 text-left">
            <span className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-page-2 text-ink">
                <EyeOff className="h-4.5 w-4.5" />
              </span>
              <span className={`${FONT} text-base font-black uppercase ${other.side.text}`}>
                {other.name}
              </span>
            </span>
            <p className={`mt-2.5 ${FONT} text-[15px] leading-snug text-ink-soft`}>
              {tr("Ekrana baxma, üzünü çevir.")}{" "}
              {step === 1
                ? tr("{name} seçəndən sonra növbə sənə keçəcək.", { name: picker.name })
                : tr("Seçimdən sonra kartlar birlikdə açılacaq.")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReady}
          className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 ${FONT} text-base font-black uppercase tracking-wide transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto md:text-lg ${picker.side.solid}`}
        >
          {tr("{name} hazırdır, seçimə başla", { name: picker.name })}
          <ArrowRight className="h-5 w-5" />
        </button>

        <ol className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {[
            tr("{v1} seçir", { v1: steps[0] }),
            tr("{v1} seçir", { v1: steps[1] }),
            tr("Kartlar açılır"),
          ].map((label, i) => {
            const state = i + 1 < step ? "done" : i + 1 === step ? "now" : "next";
            return (
              <li
                key={i}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${FONT} text-xs font-bold uppercase tracking-wide ${
                  state === "now"
                    ? "bg-accent text-white"
                    : state === "done"
                      ? "bg-good/15 text-good-hi"
                      : "bg-page-2 text-muted"
                }`}
              >
                <span>{state === "done" ? "✓" : i + 1}</span>
                {label}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Feedback({ feedback }) {
  if (!feedback) return null;
  return (
    <div
      aria-live="polite"
      className={`rounded-xl border-l-2 px-4 py-2.5 text-center ${FONT} text-sm md:text-base ${
        feedback.type === "ok"
          ? "border-l-good bg-good-lo/10 text-good-hi"
          : feedback.type === "wrong"
            ? "border-l-bad-lo bg-bad-lo/10 text-bad-hi"
            : "border-l-line/20 bg-line/5 text-soft"
      }`}
    >
      {feedback.text}
    </div>
  );
}

export default function OrtaqVersus({ data, settings, onSettings }) {
  const names = { A: sideName(settings, "A"), B: sideName(settings, "B") };
  const target = settings.target === "unlimited" ? Infinity : settings.target;

  const [round, setRound] = useState(1);
  const [starter, setStarter] = useState("A");
  const [picks, setPicks] = useState({ A: null, B: null });
  const [phase, setPhase] = useState("pick1");
  const [curtain, setCurtain] = useState(true);
  const [answerer, setAnswerer] = useState(null);
  const [score, setScore] = useState({ A: 0, B: 0 });
  const [feedback, setFeedback] = useState(null);
  const [result, setResult] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const second = otherSide(starter);
  const picker =
    phase === "pick1" ? starter : phase === "pick2" ? second : null;
  const revealed = ["answer", "done"].includes(phase);
  const answers = useMemo(
    () => (revealed ? commonPlayers(data, picks.A, picks.B) : []),
    [revealed, data, picks],
  );
  const problem = revealed ? pairProblem(picks.A, picks.B) : null;
  const winner = score.A >= target ? "A" : score.B >= target ? "B" : null;

  const cardState = (s) =>
    picks[s]
      ? revealed
        ? "revealed"
        : "hidden"
      : picker === s && !curtain
        ? "waiting"
        : "idle";
  const status = (s) =>
    picker === s
      ? tr("seçir")
      : answerer === s
        ? tr("cavab verir")
        : result?.by === s
          ? "+1"
          : phase === "ready" && picks[s]
            ? tr("hazır")
            : "";

  const pick = (entity) => {
    setPicks((p) => ({ ...p, [picker]: entity }));
    setFeedback(null);
    if (phase === "pick1") {
      setPhase("pick2");
      setCurtain(true);
    } else {
      setPhase("ready");
    }
  };

  const reveal = () => {
    setPhase("answer");
    setAnswerer(null);
    const issue = pairProblem(picks.A, picks.B);
    if (issue) return setFeedback({ type: "wrong", text: issue });
    if (!commonPlayers(data, picks.A, picks.B).length) {
      setPhase("done");
      setResult({ none: true });
      setFeedback({
        type: "info",
        text: tr("Bu cütün ortaq oyunçusu yoxdur. Xal verilmir."),
      });
      return;
    }
    setFeedback({
      type: "info",
      text: tr("Kim birinci deyirsə, adını seçsin və oyunçunu yazsın."),
    });
  };

  const answer = (player) => {
    if (!answerer) return;
    if (isCommon(picks.A, picks.B, player)) {
      const next = { ...score, [answerer]: score[answerer] + 1 };
      setScore(next);
      setResult({ player, by: answerer });
      setPhase("done");
      setFeedback(null);
      if (next[answerer] >= target) setShowModal(true);
    } else {
      setScore((s) => ({ ...s, [answerer]: s[answerer] - 1 }));
      setFeedback({
        type: "wrong",
        text: tr("{answerer}: {name} ortaq oyunçu deyil. −1 xal", { answerer: names[answerer], name: player.name }),
      });
      setAnswerer(null);
    }
  };

  const giveUp = () => {
    setPhase("done");
    setResult({ none: false });
    setShowAnswers(true);
    setFeedback({ type: "info", text: tr("Heç kim tapmadı. Xal verilmir.") });
  };

  const startRound = (no, first) => {
    setRound(no);
    setStarter(first);
    setPicks({ A: null, B: null });
    setPhase("pick1");
    setCurtain(true);
    setAnswerer(null);
    setFeedback(null);
    setResult(null);
    setShowAnswers(false);
  };

  const repick = () => startRound(round, starter);
  const nextRound = () => startRound(round + 1, second);
  const newMatch = () => {
    setScore({ A: 0, B: 0 });
    setShowModal(false);
    startRound(1, "A");
  };

  const panel = (s, compact) => (
    <ScorePanel
      name={names[s]}
      score={score[s]}
      side={SIDES[s]}
      status={status(s)}
      active={picker === s || answerer === s || result?.by === s}
      compact={compact}
    />
  );

  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="mb-3 flex gap-3 md:hidden">
        {panel("A", true)}
        {panel("B", true)}
      </div>

      <div
        className={`relative rounded-3xl border border-edge bg-surface px-2 py-5 md:px-6 ${picker && curtain ? "min-h-[26rem] sm:min-h-96" : ""}`}
      >
        <div className="flex items-center justify-center gap-3 md:gap-6">
          <div className="hidden md:block">{panel("A")}</div>
          <PokerCard
            entity={picks.A}
            state={cardState("A")}
            owner={names.A}
            side={SIDES.A}
            glow={SIDES.A.glow}
            delay={0}
          />
          <div className="flex flex-col items-center gap-1">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full border border-line/15 bg-surface ${FONT} text-sm font-bold text-soft`}
            >
              {"VS"}
            </span>
            <span
              className={`${FONT} text-[10px] uppercase tracking-[0.2em] text-faint`}
            >
              {"R"}{round}
            </span>
          </div>
          <PokerCard
            entity={picks.B}
            state={cardState("B")}
            owner={names.B}
            side={SIDES.B}
            glow={SIDES.B.glow}
            delay={380}
          />
          <div className="hidden md:block">{panel("B")}</div>
        </div>

        <p
          className={`mt-3 text-center ${FONT} text-[11px] uppercase tracking-[0.2em] text-faint`}
        >
          {target === Infinity ? tr("Limitsiz oyun") : tr("{target} xala qədər", { target })}
        </p>

        {picker && curtain && (
          <Curtain
            picker={{ name: names[picker], side: SIDES[picker] }}
            other={{
              name: names[otherSide(picker)],
              side: SIDES[otherSide(picker)],
            }}
            step={phase === "pick1" ? 1 : 2}
            round={round}
            onReady={() => setCurtain(false)}
          />
        )}
      </div>

      <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-3">
        {picker && !curtain && (
          <div
            style={{ animation: "ortaqDeal 350ms ease-out both" }}
            className="relative z-20 flex flex-col gap-2"
          >
            <p
              className={`flex items-center justify-center gap-2 text-center ${FONT} text-sm font-bold uppercase tracking-[0.15em] ${SIDES[picker].text}`}
            >
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] ${SIDES[picker].solid}`}
              >
                {phase === "pick1" ? "1 / 2" : "2 / 2"}
              </span>
              {names[picker]},{" "}
              {phase === "pick1" ? tr("klub seç") : tr("klub və ya ölkə seç")}
            </p>
            <EntitySearch
              data={data}
              types={phase === "pick1" ? CLUB_ONLY : ANY}
              onSelect={pick}
              focusKey={`${round}-${phase}`}
              secret
              accent={SIDES[picker].border}
              placeholder={
                phase === "pick1"
                  ? tr("Klubun adını yaz...")
                  : tr("Klub və ya ölkə yaz...")
              }
            />
          </div>
        )}

        {phase === "ready" && (
          <button
            type="button"
            onClick={reveal}
            className={`${BTN_PRIMARY} w-full rounded-xl py-4 text-lg md:text-xl`}
          >
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <Eye className="h-5 w-5" />
            {tr("Kartları aç")}
          </button>
        )}

        {phase === "answer" && !problem && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {["A", "B"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAnswerer(s)}
                  className={`rounded-xl border-2 px-4 py-3 ${FONT} text-base font-bold uppercase tracking-wide transition-all duration-200 ${
                    answerer === s
                      ? `${SIDES[s].border} ${SIDES[s].solid} scale-[1.02]`
                      : `border-line/10 bg-line/5 ${SIDES[s].text} hover:bg-line/10`
                  }`}
                >
                  {tr("{name} deyir", { name: names[s] })}
                </button>
              ))}
            </div>
            <PlayerSearch
              data={data}
              disabled={!answerer}
              focusKey={`${round}-${answerer}`}
              placeholder={
                answerer
                  ? tr("{answerer}, ortaq oyunçunu yaz...", { answerer: names[answerer] })
                  : tr("Əvvəlcə kimin cavab verdiyini seç")
              }
              onSelect={answer}
              onCancel={() => setAnswerer(null)}
            />
          </>
        )}

        {phase === "done" && result?.player && (
          <FoundPlayer
            player={result.player}
            title={tr("{by} tapdı · +1", { by: names[result.by] })}
            side={SIDES[result.by]}
          />
        )}
        {phase === "done" && (showAnswers || result?.player) && (
          <AnswerList answers={answers} exclude={result?.player?.id} />
        )}

        <Feedback feedback={feedback} />

        <div className="flex flex-wrap justify-center gap-2">
          {phase === "answer" && !problem && (
            <button type="button" onClick={giveUp} className={BTN_GHOST}>
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <Flag className="h-4 w-4" />
              {tr("Tapa bilmədik")}
            </button>
          )}
          {problem && (
            <button type="button" onClick={repick} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <Undo2 className="h-4 w-4" />
              {tr("Yenidən seçin")}
            </button>
          )}
          {phase === "done" && !winner && (
            <button type="button" onClick={nextRound} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              {tr("Növbəti raund")}
            </button>
          )}
          {phase === "done" &&
            !showAnswers &&
            !result?.player &&
            answers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAnswers(true)}
                className={BTN_GHOST}
              >
                <span aria-hidden="true" className={SWEEP_BLUE} />
                <Eye className="h-4 w-4" />
                {tr("Cavablar")}
              </button>
            )}
          {winner && (
            <button type="button" onClick={newMatch} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              {tr("Yeni oyun")}
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
        title={winner ? tr("{winner} qazandı!", { winner: names[winner] }) : ""}
        actions={
          <button type="button" onClick={newMatch} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            {tr("Yeni oyun")}
          </button>
        }
      >
        <p className={`${FONT} text-base text-muted`}>
          {tr("Hesab:")}{" "}
          <span className="font-bold text-accent-hi">
            {names.A} {score.A}
          </span>{" "}
          –{" "}
          <span className="font-bold text-gold-hi">
            {score.B} {names.B}
          </span>
        </p>
      </ResultModal>
    </div>
  );
}
