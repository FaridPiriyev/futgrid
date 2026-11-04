import { useEffect, useMemo, useState } from "react";
import { Check, Flag as FlagIcon, Lock, RotateCcw, Timer, Trophy } from "lucide-react";
import { PENALTY, STEPS, buildPyramid, examples, fits } from "../../../lib/games/pyramid";
import PlayerSearch from "../common/PlayerSearch";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";

import { tr } from "../../../i18n";
export const PYRAMID_KEYFRAMES = `
@keyframes pyIn { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes pyHit { 0% { transform: scale(.6); } 60% { transform: scale(1.1); } 100% { transform: scale(1); } }
@keyframes pyShake { 0%,100% { transform: translateX(0); } 25%,75% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
@keyframes pyUp { 0% { opacity: 0; transform: translateY(6px); } 20% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-14px); } }
@keyframes pyGlow { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--fg-accent) 40%, transparent); } 50% { box-shadow: 0 0 0 6px transparent; } }
`;

function EntityMark({ entity, size = "sm" }) {
  const [broken, setBroken] = useState(0);
  const club = entity.type === "club";
  const sources = club ? [entity.image].filter(Boolean) : entity.images ?? [];
  const src = sources[broken];
  const box = size === "lg" ? (club ? "h-12 w-12 md:h-14 md:w-14" : "h-8 w-12 md:h-10 md:w-14") : club ? "h-5 w-5" : "h-3.5 w-5";
  if (src)
    return (
      <img
        key={src}
        src={src}
        alt=""
        onError={() => setBroken((i) => i + 1)}
        className={`${box} shrink-0 ${club ? "object-contain" : "rounded-sm object-cover shadow-[0_1px_4px_rgba(0,0,0,0.4)]"}`}
      />
    );
  if (!club) return <span className={size === "lg" ? "text-4xl leading-none" : "text-sm leading-none"}>{entity.flag}</span>;
  return (
    <span className={`grid ${box} shrink-0 place-items-center rounded bg-line/10 ${FONT} text-[9px] font-black text-ink`}>
      {entity.short ?? ""}
    </span>
  );
}

function Criterion({ level, hidden }) {
  if (hidden)
    return (
      <span className={`inline-flex items-center gap-1.5 ${FONT} text-[11px] font-bold uppercase tracking-wide text-faint`}>
        <Lock className="h-3 w-3" />
        {tr("Gizli")}
      </span>
    );
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${FONT} text-[11px] font-bold uppercase tracking-wide text-ink md:text-xs`}>
      <EntityMark entity={level.a} />
      <span className="truncate">{level.a.label}</span>
      <span className="text-accent">×</span>
      <EntityMark entity={level.b} />
      <span className="truncate">{level.b.label}</span>
    </span>
  );
}

function Row({ level, index, current, status, answers, missing }) {
  const done = index < current;
  const active = index === current && status === "play";
  const failed = index === current && status === "lost";
  const hidden = index > current && status === "play";
  return (
    <div className={`flex flex-col items-center transition-opacity duration-300 ${hidden ? "opacity-60" : ""}`}>
      <div
        className={`mb-1.5 flex max-w-full items-center gap-2 rounded-full px-3 py-1 ${
          active ? "bg-accent/10 ring-2 ring-accent" : done ? "bg-good/10" : "bg-page-2"
        }`}
      >
        {done && <Check className="h-3.5 w-3.5 shrink-0 text-good" strokeWidth={3} />}
        <Criterion level={level} hidden={hidden} />
      </div>
      <div className="flex justify-center gap-1 sm:gap-1.5">
        {Array.from({ length: level.need }, (_, i) => {
          const p = answers[i];
          const ghost = !p && failed ? missing[i - answers.length] : null;
          return (
            <span
              key={p ? p.id : `e${i}`}
              className={`grid h-11 w-[3.7rem] place-items-center overflow-hidden rounded-lg border-2 px-1 text-center sm:h-12 sm:w-24 md:w-28 ${
                p
                  ? "border-good bg-good text-white animate-[pyHit_0.35s_ease-out]"
                  : ghost
                    ? "border-bad/60 bg-bad/10 text-bad"
                    : active
                      ? "border-dashed border-accent bg-accent/5 animate-[pyGlow_1.8s_ease-in-out_infinite]"
                      : "border-dashed border-edge bg-surface"
              }`}
            >
              <span className={`line-clamp-2 ${FONT} text-[10px] font-bold uppercase leading-tight sm:text-xs`}>
                {p ? p.name : ghost ? ghost.name : ""}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function PyramidGame({ data, difficulty, seconds }) {
  const [round, setRound] = useState(0);
  const levels = useMemo(() => buildPyramid(data, difficulty), [data, difficulty, round]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(() => STEPS.map(() => []));
  const [left, setLeft] = useState(seconds);
  const [status, setStatus] = useState("play");
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);
  const [penalty, setPenalty] = useState(0);

  useEffect(() => {
    if (status !== "play" || !levels) return;
    if (left <= 0) {
      setStatus("lost");
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, status, levels]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2400);
    return () => clearTimeout(t);
  }, [message]);

  if (!levels)
    return (
      <p className={`mx-auto max-w-xl text-center ${FONT} text-base text-muted`}>
        {tr("Bu çətinlikdə piramida qurmaq üçün kifayət qədər oyunçu tapılmadı. Başqa çətinlik seç.")}
      </p>
    );

  const level = levels[current];
  const found = answers.reduce((s, a) => s + a.length, 0);
  const total = STEPS.reduce((s, n) => s + n, 0);

  const restart = () => {
    setRound((r) => r + 1);
    setCurrent(0);
    setAnswers(STEPS.map(() => []));
    setLeft(seconds);
    setStatus("play");
    setMessage(null);
  };

  const guess = (p) => {
    if (status !== "play") return;
    const mine = answers[current];
    if (mine.some((x) => x.id === p.id)) {
      setMessage({ bad: true, text: tr("{name} artıq yazılıb", { name: p.name }) });
      setShake((s) => s + 1);
      return;
    }
    if (!fits(level, p)) {
      setMessage({ bad: true, text: tr("{name} bu şərtə uyğun deyil", { name: p.name }) });
      setShake((s) => s + 1);
      setPenalty((n) => n + 1);
      setLeft((s) => Math.max(0, s - PENALTY));
      return;
    }
    const nextMine = [...mine, p];
    const next = answers.map((a, i) => (i === current ? nextMine : a));
    setAnswers(next);
    if (nextMine.length < level.need) {
      setMessage({ bad: false, text: tr("{name} ✓", { name: p.name }) });
      return;
    }
    if (current === levels.length - 1) {
      setStatus("won");
      return;
    }
    setCurrent((c) => c + 1);
    setLeft(seconds);
    setMessage({ bad: false, text: tr("Səviyyə {n} tamamlandı!", { n: current + 1 }) });
  };

  const missing = status === "lost" ? examples(data, level, answers[current], level.need) : [];
  const pct = Math.max(0, left / seconds) * 100;
  const danger = left <= 10 && status === "play";

  const panel = (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-edge bg-surface p-4 shadow-[0_30px_60px_-44px_var(--fg-shadow)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className={`${FONT} text-xs font-bold uppercase tracking-[0.2em] text-muted`}>
            {tr("Səviyyə")}{" "}<span className="text-lg font-black text-ink">{Math.min(current + 1, levels.length)}</span> / {levels.length}
          </p>
          <div className="relative flex items-center gap-2">
            <Timer className={`h-5 w-5 ${danger ? "text-bad" : "text-accent"}`} />
            <span className={`${FONT} text-3xl font-black tabular-nums ${danger ? "text-bad" : "text-ink"}`}>
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </span>
            {penalty > 0 && (
              <span key={penalty} className={`pointer-events-none absolute -top-4 right-0 ${FONT} text-sm font-black text-bad animate-[pyUp_1s_ease-out_forwards]`}>
                −{PENALTY}
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/10">
          <span
            className={`block h-full transition-[width] duration-1000 ease-linear ${danger ? "bg-bad" : "bg-accent"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {status === "play" && (
          <div key={current} className="mt-4 animate-[pyIn_0.35s_ease-out_both]">
            <p className={`${FONT} text-sm font-bold uppercase tracking-wide text-accent`}>
              {tr("Hər iki şərtə uyğun {n} futbolçu yaz", { n: level.need })}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 rounded-xl bg-page-2 px-3 py-3 md:gap-4">
              <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                <EntityMark entity={level.a} size="lg" />
                <span className={`line-clamp-2 ${FONT} text-sm font-black uppercase leading-tight text-ink`}>{level.a.label}</span>
              </span>
              <span className={`${FONT} text-2xl font-black text-accent`}>×</span>
              <span className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                <EntityMark entity={level.b} size="lg" />
                <span className={`line-clamp-2 ${FONT} text-sm font-black uppercase leading-tight text-ink`}>{level.b.label}</span>
              </span>
            </div>
            <p className={`mt-2 text-center ${FONT} text-sm text-muted`}>
              {tr("Tapılan")}{" "}<span className="font-bold text-ink">{answers[current].length}</span> / {level.need}
            </p>
          </div>
        )}
      </div>

      {status === "play" ? (
        <div>
          <div key={shake} className={shake ? "animate-[pyShake_0.35s_ease-out]" : ""}>
            <PlayerSearch data={data} onSelect={guess} focusKey={`${round}-${current}`} placeholder={tr("Futbolçunun adını yaz...")} />
          </div>
          <div className="mt-2 flex min-h-7 items-center justify-between gap-3">
            {message ? (
              <p key={message.text + shake} className={`${FONT} text-sm font-bold animate-[pyIn_0.2s_ease-out] ${message.bad ? "text-bad" : "text-good"}`}>
                {message.text}
              </p>
            ) : (
              <span className={`${FONT} text-xs text-faint`}>{tr("Səhv cavab: −{n} saniyə", { n: PENALTY })}</span>
            )}
            <button
              type="button"
              onClick={() => setStatus("lost")}
              className={`inline-flex shrink-0 items-center gap-1.5 ${FONT} text-sm font-bold uppercase text-muted hover:text-ink`}
            >
              <FlagIcon className="h-4 w-4" />
              {tr("Bitir")}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-edge bg-surface p-5 text-center animate-[pyIn_0.4s_ease-out_both]">
          <Trophy className={`mx-auto h-8 w-8 ${status === "won" ? "text-gold" : "text-muted"}`} />
          <p className={`mt-2 ${FONT} text-2xl font-black uppercase text-ink`}>
            {status === "won" ? tr("Piramidanı tamamladın!") : tr("Piramida yarımçıq qaldı")}
          </p>
          <p className={`${FONT} text-sm text-muted`}>
            {tr("{found} / {total} futbolçu · {n} səviyyə", { found, total, n: status === "won" ? levels.length : current })}
          </p>
          <button type="button" onClick={restart} className={`${BTN_PRIMARY} mt-4`}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <RotateCcw className="h-4 w-4" />
            {tr("Yeni piramida")}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div key={round} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
      <div className="lg:col-start-2 lg:row-start-1">{panel}</div>
      <div className="flex flex-col-reverse gap-3 rounded-2xl border border-edge bg-surface/60 px-2 py-5 sm:px-4 md:py-7 lg:col-start-1 lg:row-start-1">
        {levels.map((lv, i) => (
          <Row
            key={i}
            level={lv}
            index={i}
            current={status === "won" ? levels.length : current}
            status={status}
            answers={answers[i]}
            missing={i === current ? missing.filter((p) => !answers[i].some((x) => x.id === p.id)) : []}
          />
        ))}
      </div>
    </div>
  );
}
