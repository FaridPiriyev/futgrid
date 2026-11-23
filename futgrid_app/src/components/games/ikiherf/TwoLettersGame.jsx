import { useEffect, useMemo, useState } from "react";
import { Check, Flag, RotateCcw, Timer, Trophy } from "lucide-react";
import {
  LETTERS,
  PENALTY,
  countFor,
  examples,
  hasLetters,
  highlight,
  letterOptions,
} from "../../../lib/games/twoLetters";
import { SIDES, otherSide } from "../ortaq/settings";
import NameGuess from "../common/NameGuess";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";

import { tr } from "../../../i18n";
export const TWO_KEYFRAMES = `
@keyframes thIn { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes thPop { 0% { transform: scale(.5); opacity: 0; } 70% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
@keyframes thShake { 0%,100% { transform: translateX(0); } 25%,75% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
@keyframes thUp { 0% { opacity: 0; transform: translateY(6px); } 20% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-14px); } }
`;

const MARK = { a: "text-accent-hi", b: "text-gold-hi" };

export function Marked({ name, letters }) {
  return (
    <span>
      {highlight(name, letters[0], letters[1]).map((c, i) =>
        c.mark ? (
          <span key={i} className={`font-black ${MARK[c.mark]}`}>
            {c.ch}
          </span>
        ) : (
          <span key={i}>{c.ch}</span>
        ),
      )}
    </span>
  );
}

function Tile({ letter, side, size = "lg", pending = false, spin = false }) {
  const s = SIDES[side];
  const box =
    size === "lg"
      ? "h-20 w-[4.5rem] text-5xl rounded-2xl md:h-24 md:w-20 md:text-6xl"
      : "h-14 w-12 text-3xl rounded-xl md:h-16 md:w-14 md:text-4xl";
  if (pending)
    return (
      <span className={`grid ${box} place-items-center border-[3px] border-dashed ${s.border} ${s.bg} ${FONT} font-black ${s.text}`}>
        ?
      </span>
    );
  return (
    <span
      key={spin ? "spin" : letter}
      className={`grid ${box} place-items-center ${s.solid} ${FONT} font-black shadow-[0_14px_26px_-14px_var(--fg-shadow)] ${spin ? "opacity-80" : "animate-[thPop_0.35s_ease-out_both]"}`}
    >
      {letter}
    </span>
  );
}

export function Tiles({ letters, sides, size, pending, spinAt = -1 }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <Tile letter={letters[0]} side={sides[0]} size={size} pending={!letters[0]} spin={spinAt === 0} />
      <span className={`${FONT} text-3xl font-black text-faint`}>+</span>
      <Tile letter={letters[1]} side={sides[1]} size={size} pending={pending || !letters[1]} spin={spinAt === 1} />
    </div>
  );
}

export function Scoreboard({ names, scores, active, subs }) {
  const card = (side) => {
    const s = SIDES[side];
    const on = active === side;
    return (
      <div
        className={`flex min-w-0 items-center gap-2 rounded-xl border-2 bg-surface px-2.5 py-2 transition-[border-color,box-shadow] duration-300 md:gap-3 md:px-4 md:py-3 ${
          side === "B" ? "flex-row-reverse text-right" : ""
        } ${on ? s.border : "border-edge"}`}
        style={on ? { boxShadow: `0 10px 24px -14px ${s.glow}` } : undefined}
      >
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${s.solid} ${FONT} text-sm font-black md:h-10 md:w-10 md:text-base`}>
          {(names[side][0] ?? "?").toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className={`block truncate ${FONT} text-sm font-black uppercase leading-none text-ink md:text-lg`}>{names[side]}</span>
          <span className={`mt-1 block truncate ${FONT} text-[11px] text-muted md:text-xs`}>{subs?.[side] ?? ""}</span>
        </span>
      </div>
    );
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
      {card("A")}
      <span className={`${FONT} text-3xl font-black tabular-nums text-ink md:text-4xl`}>
        {scores.A}
        <span className="mx-1 text-faint">:</span>
        {scores.B}
      </span>
      {card("B")}
    </div>
  );
}

export function LetterGrid({ options, taken, picked, onPick, side }) {
  const s = SIDES[side];
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9 md:grid-cols-13 md:gap-2">
      {LETTERS.map((l) => {
        const off = !options[l] || l === taken;
        const on = picked === l;
        return (
          <button
            key={l}
            type="button"
            disabled={off}
            onClick={() => onPick(l)}
            className={`h-10 rounded-lg border-2 ${FONT} text-base font-extrabold transition-[transform,background-color,border-color] duration-150 md:h-12 md:text-lg ${
              on
                ? `${s.solid} -translate-y-0.5 border-transparent`
                : off
                  ? "cursor-not-allowed border-edge bg-page-2 text-dim opacity-50"
                  : "border-edge bg-surface text-ink hover:-translate-y-0.5 hover:border-accent/50"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export default function TwoLettersGame({ data, settings, names }) {
  const [scores, setScores] = useState({ A: 0, B: 0 });
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState("pick");
  const [letters, setLetters] = useState([]);
  const [picked, setPicked] = useState(null);
  const [turn, setTurn] = useState("A");
  const [left, setLeft] = useState(settings.seconds);
  const [used, setUsed] = useState([]);
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [result, setResult] = useState(null);

  const starter = round % 2 === 1 ? "A" : "B";
  const pickers = [starter, otherSide(starter)];
  const picker = pickers[letters.length] ?? starter;
  const options = useMemo(
    () => letterOptions(data, letters[0] ?? null, settings.difficulty),
    [data, letters, settings.difficulty],
  );

  useEffect(() => {
    if (phase !== "play") return;
    if (left <= 0) {
      endRound(otherSide(turn), "time");
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, phase, turn]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(t);
  }, [message]);

  const endRound = (winner, reason) => {
    const next = { ...scores, [winner]: scores[winner] + 1 };
    setScores(next);
    const done = next[winner] >= settings.target;
    setResult({ winner, loser: otherSide(winner), reason, done });
    setPhase(done ? "match" : "round");
  };

  const confirmLetter = () => {
    if (!picked) return;
    const next = [...letters, picked];
    setLetters(next);
    setPicked(null);
    if (next.length === 2) {
      setPhase("play");
      setTurn(starter);
      setLeft(settings.seconds);
      setUsed([]);
    }
  };

  const guess = (p) => {
    if (phase !== "play") return;
    if (used.some((u) => u.player.id === p.id)) {
      setMessage({ bad: true, text: tr("{name} artıq yazılıb", { name: p.name }) });
      setShake((s) => s + 1);
      return;
    }
    if (!hasLetters(data, p, letters[0], letters[1])) {
      setMessage({ bad: true, text: tr("{name} adında hər iki hərf yoxdur", { name: p.name }) });
      setShake((s) => s + 1);
      setPenalty((n) => n + 1);
      setLeft((s) => Math.max(0, s - PENALTY));
      return;
    }
    setUsed((u) => [...u, { player: p, side: turn }]);
    setMessage({ bad: false, text: tr("{name} ✓", { name: p.name }) });
    setTurn(otherSide(turn));
    setLeft(settings.seconds);
  };

  const unknown = (text) => {
    setMessage({ bad: true, text: tr("“{text}” tanınmadı. Futbolçunun adını tam yaz.", { text }) });
    setShake((s) => s + 1);
  };

  const nextRound = () => {
    setRound((r) => r + 1);
    setLetters([]);
    setPicked(null);
    setUsed([]);
    setResult(null);
    setMessage(null);
    setPhase("pick");
  };

  const restart = () => {
    setScores({ A: 0, B: 0 });
    setRound(0);
    nextRound();
  };

  const sub = (side) => {
    if (phase === "pick") {
      const i = pickers.indexOf(side);
      if (letters[i]) return tr("{l} seçdi", { l: letters[i] });
      return picker === side ? tr("seçir...") : tr("gözləyir");
    }
    if (phase === "play") {
      const n = used.filter((u) => u.side === side).length;
      return turn === side ? tr("növbə səndədir") : tr("{n} tapdı", { n });
    }
    return result?.winner === side ? tr("raund qalibi") : "";
  };

  const active = phase === "pick" ? picker : phase === "play" ? turn : result?.winner;
  const tileSides = pickers;
  const s = SIDES[active ?? "A"];
  const danger = phase === "play" && left <= 5;

  return (
    <div className="mx-auto max-w-4xl">
      <p className={`mb-2 ${FONT} text-xs font-bold uppercase tracking-[0.2em] text-accent`}>
        {tr("Raund {n}", { n: round })} · {tr("{n} xala qədər", { n: settings.target })}
      </p>
      <Scoreboard names={names} scores={scores} active={active} subs={{ A: sub("A"), B: sub("B") }} />

      {phase === "pick" && (
        <section key={`pick-${round}-${letters.length}`} className="mt-4 rounded-2xl border border-edge bg-surface p-4 animate-[thIn_0.35s_ease-out_both] md:p-6">
          <h2 className={`${FONT} text-xl font-black uppercase leading-tight md:text-3xl ${s.text}`}>
            {tr("{name}, hərfini seç", { name: names[picker] })}
          </h2>
          <p className={`mt-1 ${FONT} text-[13px] text-muted md:text-base`}>
            {letters.length
              ? tr("{name} {l} seçdi. İndi ikinci hərfi sən seç.", { name: names[pickers[0]], l: letters[0] })
              : tr("Birinci hərfi seç. Sonra rəqibin ikinci hərfi seçəcək.")}
          </p>
          <div className="mt-4">
            <Tiles letters={[letters[0] ?? (letters.length === 0 ? picked : null), letters.length === 1 ? picked : null]} sides={tileSides} size="lg" />
          </div>
          <div className="mt-5">
            <LetterGrid options={options} taken={letters[0]} picked={picked} onPick={setPicked} side={picker} />
          </div>
          {letters.length === 1 && (
            <p className={`mt-3 ${FONT} text-xs text-faint`}>
              {tr("Sönük hərflərlə çox az futbolçu var, onları seçmək olmur.")}
            </p>
          )}
          <button
            type="button"
            onClick={confirmLetter}
            disabled={!picked}
            className={`mt-4 w-full rounded-xl py-3 ${FONT} text-base font-black uppercase tracking-wider transition-opacity duration-200 disabled:opacity-40 ${s.solid}`}
          >
            {picked ? tr("{l} hərfini təsdiqlə", { l: picked }) : tr("Hərf seç")}
          </button>
        </section>
      )}

      {phase === "play" && (
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-edge bg-surface p-4 md:p-5">
            <Tiles letters={letters} sides={tileSides} size="sm" />
            <p className={`mt-2 text-center ${FONT} text-[13px] text-muted md:text-sm`}>
              {tr("Adında həm {a}, həm {b} olan futbolçu yaz", { a: letters[0], b: letters[1] })}
            </p>
            <div className="mt-3">
              <div className={`flex items-center justify-between ${FONT} text-xs font-black uppercase tracking-wider`}>
                <span className={SIDES[turn].text}>{tr("Növbə: {name}", { name: names[turn] })}</span>
                <span className={`relative flex items-center gap-1 tabular-nums ${danger ? "text-bad" : "text-ink"}`}>
                  <Timer className="h-3.5 w-3.5" />
                  0:{String(Math.max(0, left)).padStart(2, "0")}
                  {penalty > 0 && (
                    <span key={penalty} className="pointer-events-none absolute -top-4 right-0 text-bad animate-[thUp_1s_ease-out_forwards]">
                      −{PENALTY}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/10">
                <span
                  className={`block h-full rounded-full transition-[width] duration-1000 ease-linear ${danger ? "bg-bad" : turn === "A" ? "bg-accent" : "bg-gold"}`}
                  style={{ width: `${Math.max(0, left / settings.seconds) * 100}%` }}
                />
              </div>
            </div>
            <div key={shake} className={`mt-3 ${shake ? "animate-[thShake_0.35s_ease-out]" : ""}`}>
              <NameGuess
                data={data}
                onGuess={guess}
                onUnknown={unknown}
                pickFrom={(list) => list.find((p) => !used.some((u) => u.player.id === p.id) && hasLetters(data, p, letters[0], letters[1])) ?? list[0]}
                focusKey={`${round}-${used.length}-${turn}`}
              />
            </div>
            <div className="mt-2 flex min-h-7 items-center justify-between gap-3">
              {message ? (
                <p className={`${FONT} text-sm font-bold ${message.bad ? "text-bad" : "text-good"}`}>{message.text}</p>
              ) : (
                <span className={`${FONT} text-xs text-faint`}>
                  {tr("Adı tam yaz, təklif çıxmayacaq")} · {tr("Səhv cavab: −{n} saniyə", { n: PENALTY })}
                </span>
              )}
              <button
                type="button"
                onClick={() => endRound(otherSide(turn), "pass")}
                className={`inline-flex shrink-0 items-center gap-1.5 ${FONT} text-sm font-bold uppercase text-muted hover:text-bad`}
              >
                <Flag className="h-4 w-4" />
                {tr("Təslim ol")}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-edge bg-surface p-4 md:p-5">
            <p className={`${FONT} text-xs font-black uppercase tracking-[0.18em] text-faint`}>
              {tr("Bu raundda yazılanlar · {n}", { n: used.length })}
            </p>
            {used.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {used.map((u) => (
                  <li
                    key={u.player.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-edge bg-page px-2.5 py-1 ${FONT} text-xs font-bold uppercase text-ink animate-[thIn_0.25s_ease-out_both] md:text-sm`}
                  >
                    <span className={`h-2 w-2 rounded-full ${SIDES[u.side].dot}`} />
                    <Marked name={u.player.name} letters={letters} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-3 ${FONT} text-sm text-muted`}>{tr("Hələ heç kim yazmayıb.")}</p>
            )}
            <p className={`mt-4 ${FONT} text-xs text-faint`}>
              {tr("Bu hərflərlə təxminən {n} məşhur futbolçu var", { n: countFor(data, letters[0], letters[1], settings.difficulty) })}
            </p>
          </section>
        </div>
      )}

      {(phase === "round" || phase === "match") && result && (
        <section className="mt-4 rounded-2xl border border-edge bg-surface p-5 text-center animate-[thIn_0.4s_ease-out_both] md:p-7">
          <Tiles letters={letters} sides={tileSides} size="sm" />
          {phase === "match" ? (
            <>
              <Trophy className="mx-auto mt-4 h-9 w-9 text-gold" />
              <p className={`mt-2 ${FONT} text-3xl font-black uppercase leading-none md:text-4xl ${SIDES[result.winner].text}`}>
                {tr("{name} qalib gəldi!", { name: names[result.winner] })}
              </p>
              <p className={`mt-2 ${FONT} text-base text-muted`}>
                {scores.A} : {scores.B}
              </p>
            </>
          ) : (
            <>
              <p className={`mt-4 ${FONT} text-2xl font-black uppercase leading-tight text-ink md:text-3xl`}>
                {result.reason === "time"
                  ? tr("Vaxt bitdi: {name}", { name: names[result.loser] })
                  : tr("{name} təslim oldu", { name: names[result.loser] })}
              </p>
              <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 ${FONT} text-sm font-black uppercase ${SIDES[result.winner].solid}`}>
                <Check className="h-4 w-4" />
                {tr("{name} +1 xal", { name: names[result.winner] })}
              </span>
            </>
          )}
          <p className={`mt-3 ${FONT} text-sm text-muted`}>{tr("Bu raundda {n} futbolçu tapıldı", { n: used.length })}</p>
          <div className="mt-4 text-left">
            <p className={`${FONT} text-xs font-black uppercase tracking-[0.18em] text-faint`}>{tr("Yaza biləcəkdiniz")}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {examples(data, letters[0], letters[1], used.map((u) => u.player)).map((p) => (
                <li key={p.id} className={`rounded-full border border-edge bg-page px-2.5 py-1 ${FONT} text-xs font-bold uppercase text-ink md:text-sm`}>
                  <Marked name={p.name} letters={letters} />
                </li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={phase === "match" ? restart : nextRound} className={`${BTN_PRIMARY} mt-6`}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            {phase === "match" ? <RotateCcw className="h-4 w-4" /> : null}
            {phase === "match" ? tr("Yenidən oyna") : tr("Növbəti raund")}
          </button>
          {phase === "round" && (
            <p className={`mt-2 ${FONT} text-xs text-faint`}>
              {tr("Növbəti raundda ilk hərfi {name} seçir", { name: names[otherSide(starter)] })}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
