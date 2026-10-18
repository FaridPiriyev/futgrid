import { useMemo, useState } from "react";
import { Eye, EyeOff, Flag, RotateCcw, Settings2, Undo2 } from "lucide-react";
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

const CLUB_ONLY = ["club"];
const ANY = ["club", "country"];

function ScorePanel({ name, score, side, status, active, compact }) {
  return (
    <div
      className={`relative flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border px-3 text-center transition-all duration-500 ${
        compact ? "flex-1 py-2" : "w-28 py-5 xl:w-32"
      } ${active ? `${side.border} ${side.bg} scale-105` : "border-white/10 bg-white/[0.03]"}`}
      style={active ? { boxShadow: `0 0 30px -8px ${side.glow}` } : undefined}
    >
      <span
        className={`max-w-full truncate ${FONT} text-xs font-bold uppercase tracking-[0.15em] ${side.text}`}
      >
        {name}
      </span>
      <span
        className={`${FONT} font-bold leading-none text-white ${compact ? "text-3xl" : "text-5xl"}`}
      >
        {score}
      </span>
      <span
        className={`h-4 ${FONT} text-[10px] uppercase tracking-[0.2em] text-neutral-400`}
      >
        {status}
      </span>
    </div>
  );
}

function Curtain({ picker, other, onReady }) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-[#05060a]/90 backdrop-blur-xl"
      style={{ animation: "ortaqDeal 350ms ease-out both" }}
    >
      <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full ${picker.side.solid}`}
          style={{ animation: "ortaqFloat 2s ease-in-out infinite" }}
        >
          <EyeOff className="h-8 w-8" />
        </span>
        <p
          className={`${FONT} text-2xl font-bold uppercase tracking-wide text-white md:text-3xl`}
        >
          Növbə: {picker.name}
        </p>
        <p className={`${FONT} text-base text-neutral-400`}>
          <span className={`font-bold ${other.side.text}`}>{other.name}</span>,
          ekrana baxma! {picker.name} seçimini gizli edəcək.
        </p>
        <button
          type="button"
          onClick={onReady}
          className={`${BTN_PRIMARY} mt-2`}
        >
          <span aria-hidden="true" className={SWEEP_WHITE} />
          {picker.name} hazırdır
        </button>
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
          ? "border-l-emerald-400 bg-emerald-500/10 text-emerald-300"
          : feedback.type === "wrong"
            ? "border-l-rose-500 bg-rose-500/10 text-rose-300"
            : "border-l-white/20 bg-white/5 text-neutral-300"
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
      ? "seçir"
      : answerer === s
        ? "cavab verir"
        : result?.by === s
          ? "+1"
          : phase === "ready" && picks[s]
            ? "hazır"
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
        text: "Bu cütün ortaq oyunçusu yoxdur. Xal verilmir.",
      });
      return;
    }
    setFeedback({
      type: "info",
      text: "Kim birinci deyirsə, adını seçsin və oyunçunu yazsın.",
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
        text: `${names[answerer]}: ${player.name} ortaq oyunçu deyil. −1 xal`,
      });
      setAnswerer(null);
    }
  };

  const giveUp = () => {
    setPhase("done");
    setResult({ none: false });
    setShowAnswers(true);
    setFeedback({ type: "info", text: "Heç kim tapmadı. Xal verilmir." });
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

      <div className="relative rounded-3xl border border-white/5 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent_70%)] px-2 py-5 md:px-6">
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
              className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0b0e14] ${FONT} text-sm font-bold text-neutral-300`}
            >
              VS
            </span>
            <span
              className={`${FONT} text-[10px] uppercase tracking-[0.2em] text-neutral-500`}
            >
              R{round}
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
          className={`mt-3 text-center ${FONT} text-[11px] uppercase tracking-[0.2em] text-neutral-500`}
        >
          {target === Infinity ? "Limitsiz oyun" : `${target} xala qədər`}
        </p>

        {picker && curtain && (
          <Curtain
            picker={{ name: names[picker], side: SIDES[picker] }}
            other={{
              name: names[otherSide(picker)],
              side: SIDES[otherSide(picker)],
            }}
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
              className={`text-center ${FONT} text-sm font-bold uppercase tracking-[0.15em] ${SIDES[picker].text}`}
            >
              {names[picker]},{" "}
              {phase === "pick1" ? "klub seç" : "klub və ya ölkə seç"}
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
                  ? "Klubun adını yaz..."
                  : "Klub və ya ölkə yaz..."
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
            Kartları aç
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
                      : `border-white/10 bg-white/5 ${SIDES[s].text} hover:bg-white/10`
                  }`}
                >
                  {names[s]} deyir
                </button>
              ))}
            </div>
            <PlayerSearch
              data={data}
              disabled={!answerer}
              focusKey={`${round}-${answerer}`}
              placeholder={
                answerer
                  ? `${names[answerer]}, ortaq oyunçunu yaz...`
                  : "Əvvəlcə kimin cavab verdiyini seç"
              }
              onSelect={answer}
              onCancel={() => setAnswerer(null)}
            />
          </>
        )}

        {phase === "done" && result?.player && (
          <FoundPlayer
            player={result.player}
            title={`${names[result.by]} tapdı · +1`}
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
              Tapa bilmədik
            </button>
          )}
          {problem && (
            <button type="button" onClick={repick} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <Undo2 className="h-4 w-4" />
              Yenidən seçin
            </button>
          )}
          {phase === "done" && !winner && (
            <button type="button" onClick={nextRound} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              Növbəti raund
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
                Cavablar
              </button>
            )}
          {winner && (
            <button type="button" onClick={newMatch} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              Yeni oyun
            </button>
          )}
          <button type="button" onClick={onSettings} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <Settings2 className="h-4 w-4" />
            Parametrlər
          </button>
        </div>
      </div>

      <ResultModal
        open={showModal}
        onClose={() => setShowModal(false)}
        eyebrow="Oyun bitdi"
        title={winner ? `${names[winner]} qazandı!` : ""}
        actions={
          <button type="button" onClick={newMatch} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            Yeni oyun
          </button>
        }
      >
        <p className={`${FONT} text-base text-neutral-400`}>
          Hesab:{" "}
          <span className="font-bold text-blue-400">
            {names.A} {score.A}
          </span>{" "}
          –{" "}
          <span className="font-bold text-amber-300">
            {score.B} {names.B}
          </span>
        </p>
      </ResultModal>
    </div>
  );
}
