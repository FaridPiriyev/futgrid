import { useEffect, useRef, useState } from "react";
import { ArrowRight, BellRing, Lock, RotateCcw, Trophy } from "lucide-react";
import { pickPhoto, revealOrder } from "../../../lib/games/pixel";
import { SIDES } from "../ortaq/settings";
import PlayerSearch from "../common/PlayerSearch";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { RevealCard } from "../sual/SualParts";
import PixelBoard, { TileMeter } from "./PixelBoard";

import { tr } from "../../../i18n";

const ANSWER_TIME = 10;
const LAST_CALL = 8;
const KEYS = { A: "a", B: "l" };
// Səhv cavab verən oyunçu növbəti bu qədər xana açılana qədər gözləyir.
const LOCK_TILES = 4;

function BuzzButton({ side, name, locked, wait, onBuzz, disabled }) {
  const s = SIDES[side];
  return (
    <button
      type="button"
      onClick={onBuzz}
      disabled={disabled || locked}
      style={{ "--px-glow": s.glow }}
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 transition-[transform,opacity] duration-150 enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 disabled:cursor-not-allowed md:py-4 ${
        locked ? "border-edge bg-page-2 opacity-60" : `${s.border} ${s.solid}`
      } ${!locked && !disabled ? "animate-[pxBuzz_1.6s_ease-in-out_infinite]" : ""}`}
    >
      {locked ? <Lock className="h-5 w-5 text-muted" /> : <BellRing className="h-5 w-5" />}
      <span className={`max-w-full text-center ${FONT} text-sm font-black uppercase leading-tight [overflow-wrap:anywhere] sm:text-base md:text-lg ${locked ? "text-muted" : ""}`}>
        {locked
          ? wait > 0
            ? tr("{n} xana sonra açılır", { n: wait })
            : tr("Bu raund bağlıdır")
          : tr("{name} bilir!", { name })}
      </span>
      {!locked && (
        <span className={`hidden ${FONT} text-[11px] font-bold uppercase tracking-wider opacity-80 md:block`}>
          {tr("klaviatura: {k}", { k: KEYS[side].toUpperCase() })}
        </span>
      )}
    </button>
  );
}

export default function PixelDuo({ data, settings, names }) {
  const size = settings.grid;
  const seen = useRef(new Set());
  const [scores, setScores] = useState({ A: 0, B: 0 });
  const [round, setRound] = useState(1);
  const [player, setPlayer] = useState(() => pickPhoto(data, settings));
  const [order, setOrder] = useState(() => revealOrder(size));
  const [opened, setOpened] = useState(0);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState("play");
  const [answering, setAnswering] = useState(null);
  const [answerLeft, setAnswerLeft] = useState(ANSWER_TIME);
  // Hər oyunçu üçün: neçənci xana açılanda kilid açılır (0 = kilid yoxdur).
  const [lockUntil, setLockUntil] = useState({ A: 0, B: 0 });
  const locked = { A: opened < lockUntil.A, B: opened < lockUntil.B };
  // Bütün xanalar açılıbsa, artıq açılacaq xana qalmır — kilid raundun sonuna qədər qalır.
  const waitFor = (side) => (lockUntil[side] > size ? 0 : Math.max(0, lockUntil[side] - opened));
  const [lastCall, setLastCall] = useState(LAST_CALL);
  const [message, setMessage] = useState(null);
  const [result, setResult] = useState(null);

  const running = phase === "play" && ready && !answering;

  useEffect(() => {
    if (!running) return;
    if (opened < size) {
      const t = setTimeout(() => setOpened((n) => Math.min(size, n + 1)), opened === 0 ? 400 : settings.speed * 1000);
      return () => clearTimeout(t);
    }
    if (lastCall <= 0) {
      finishRound(null);
      return;
    }
    const t = setTimeout(() => setLastCall((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, opened, lastCall]);

  useEffect(() => {
    if (!answering) return;
    if (answerLeft <= 0) {
      wrong(answering, tr("Vaxt bitdi"));
      return;
    }
    const t = setTimeout(() => setAnswerLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [answering, answerLeft]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const side = { [KEYS.A]: "A", [KEYS.B]: "B" }[e.key.toLowerCase()];
      if (!side) return;
      // Hərf açılan xanaya yazılmasın
      e.preventDefault();
      buzz(side);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function buzz(side) {
    if (!running || locked[side]) return;
    setAnswering(side);
    setAnswerLeft(ANSWER_TIME);
    setMessage(null);
  }

  function wrong(side, why) {
    const until = opened + LOCK_TILES;
    const next = { ...lockUntil, [side]: until };
    setLockUntil(next);
    setAnswering(null);
    setMessage({
      side,
      text:
        until > size
          ? `${why} · ${tr("{name} bu raundda daha cavab verə bilməz", { name: names[side] })}`
          : `${why} · ${tr("{name} növbəti {n} xana açılana qədər gözləyir", { name: names[side], n: LOCK_TILES })}`,
    });
    // Hər ikisi raundun sonuna qədər bağlıdırsa, raund bitir.
    if (next.A > size && next.B > size) finishRound(null);
  }

  function finishRound(winner) {
    setAnswering(null);
    const next = winner ? { ...scores, [winner]: scores[winner] + 1 } : scores;
    setScores(next);
    const done = winner && next[winner] >= settings.target;
    setResult({ winner, player, opened });
    setPhase(done ? "match" : "round");
  }

  const answer = (p) => {
    if (!answering) return;
    if (p.id === player.id) finishRound(answering);
    else wrong(answering, tr("{name} deyil", { name: p.name }));
  };

  const nextRound = () => {
    seen.current.add(player?.id);
    setPlayer(pickPhoto(data, settings, seen.current));
    setOrder(revealOrder(size));
    setOpened(0);
    setReady(false);
    setLockUntil({ A: 0, B: 0 });
    setLastCall(LAST_CALL);
    setMessage(null);
    setResult(null);
    setRound((r) => r + 1);
    setPhase("play");
  };

  const restart = () => {
    setScores({ A: 0, B: 0 });
    nextRound();
    setRound(1);
  };

  const playing = phase === "play";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
        {["A", "B"].map((side) => (
          <div
            key={side}
            className={`flex min-w-0 items-center gap-2 rounded-xl border-2 bg-surface px-2.5 py-2 md:gap-2.5 md:px-4 md:py-3 ${side === "B" ? "order-3 flex-row-reverse text-right" : ""} ${
              answering === side ? SIDES[side].border : "border-edge"
            }`}
          >
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full md:h-9 md:w-9 ${SIDES[side].solid} ${FONT} text-sm font-black md:text-base`}>
              {(names[side][0] ?? "?").toUpperCase()}
            </span>
            <span className={`min-w-0 truncate ${FONT} text-sm font-black uppercase text-ink md:text-lg`}>{names[side]}</span>
          </div>
        ))}
        <span className={`order-2 ${FONT} text-3xl font-black tabular-nums text-ink md:text-4xl`}>
          {scores.A}
          <span className="mx-1 text-faint">:</span>
          {scores.B}
        </span>
      </div>
      <p className={`mt-2 text-center ${FONT} text-xs font-bold uppercase tracking-[0.2em] text-accent`}>
        {tr("Raund {n}", { n: round })} · {tr("{n} xala qədər", { n: settings.target })}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-start">
        <div className="mx-auto w-full max-w-[18rem] sm:max-w-[24rem] md:max-w-none">
          <PixelBoard
            player={player}
            size={size}
            order={order}
            opened={opened}
            all={!playing}
            onReady={() => setReady(true)}
            onBroken={() => setTimeout(nextRound, 300)}
          />
          <div className="mt-3">
            <TileMeter size={size} opened={playing ? opened : size} />
          </div>
        </div>

        <section className="rounded-2xl border border-edge bg-surface p-4 md:p-5">
          {playing ? (
            answering ? (
              <div key={answering} className="animate-[pxIn_0.25s_ease-out_both]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className={`${FONT} text-2xl font-black uppercase leading-tight ${SIDES[answering].text}`}>
                    {tr("{name} cavab verir", { name: names[answering] })}
                  </h2>
                  <span className={`${FONT} text-xl font-black tabular-nums ${answerLeft <= 3 ? "text-bad" : "text-ink"}`}>{answerLeft}</span>
                </div>
                <p className={`mt-1 ${FONT} text-sm text-muted`}>{tr("Xanalar dayandı. Futbolçunun adını yaz.")}</p>
                <div className="mt-3">
                  <PlayerSearch data={data} onSelect={answer} focusKey={answering} placeholder={tr("Futbolçunun adını yaz...")} />
                </div>
              </div>
            ) : (
              <>
                <h2 className={`${FONT} text-2xl font-black uppercase leading-tight text-ink md:text-3xl`}>{tr("Kimdir bu?")}</h2>
                <p className={`mt-1 ${FONT} text-sm text-muted ${opened < size ? "hidden sm:block" : ""}`}>
                  {opened < size
                    ? tr("Tanıyan kimi düyməni bas. İlk düz cavab raundu qazanır, səhv cavab verən növbəti 4 xana açılana qədər gözləyir.")
                    : tr("Bütün xanalar açıldı: son {n} saniyə!", { n: lastCall })}
                </p>
                <div className="mt-4 flex gap-3">
                  <BuzzButton side="A" name={names.A} locked={locked.A} wait={waitFor("A")} onBuzz={() => buzz("A")} disabled={!running} />
                  <BuzzButton side="B" name={names.B} locked={locked.B} wait={waitFor("B")} onBuzz={() => buzz("B")} disabled={!running} />
                </div>
                {message ? (
                  <p className={`mt-3 ${FONT} text-sm font-bold text-bad`}>{message.text}</p>
                ) : (
                  <p className={`mt-3 hidden ${FONT} text-sm font-bold text-faint md:block`}>
                    {tr("Masaüstündə {a} və {b} düymələri ilə də basmaq olar.", { a: "A", b: "L" })}
                  </p>
                )}
              </>
            )
          ) : (
            <div className="animate-[pxIn_0.35s_ease-out_both]">
              {phase === "match" ? (
                <>
                  <Trophy className={`h-9 w-9 ${SIDES[result.winner].text}`} />
                  <p className={`mt-2 ${FONT} text-3xl font-black uppercase leading-none ${SIDES[result.winner].text}`}>
                    {tr("{name} qalib gəldi!", { name: names[result.winner] })}
                  </p>
                  <p className={`mt-1 ${FONT} text-base text-muted`}>
                    {scores.A} : {scores.B}
                  </p>
                </>
              ) : (
                <p className={`${FONT} text-2xl font-black uppercase leading-tight ${result?.winner ? SIDES[result.winner].text : "text-bad"}`}>
                  {result?.winner
                    ? tr("{name} tapdı! {n} xana açılmışdı", { name: names[result.winner], n: result.opened })
                    : tr("Heç kim tapa bilmədi")}
                </p>
              )}
              {result && (
                <div className="mt-3">
                  <RevealCard data={data} player={result.player} tone={result.winner ? SIDES[result.winner].border : "border-bad"} />
                </div>
              )}
              <button type="button" onClick={phase === "match" ? restart : nextRound} className={`${BTN_PRIMARY} mt-5`}>
                <span aria-hidden="true" className={SWEEP_WHITE} />
                {phase === "match" ? <RotateCcw className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {phase === "match" ? tr("Yenidən oyna") : tr("Növbəti raund")}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
