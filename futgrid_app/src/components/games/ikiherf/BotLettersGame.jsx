import { useEffect, useMemo, useState } from "react";
import { Bot, Flag, RotateCcw, Timer, Trophy } from "lucide-react";
import { LETTERS, PENALTY, countFor, examples, hasLetters, letterOptions } from "../../../lib/games/twoLetters";
import { SIDES } from "../ortaq/settings";
import PlayerSearch from "../common/PlayerSearch";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { LetterGrid, Marked, Tiles } from "./TwoLettersGame";

import { tr } from "../../../i18n";
const BEST_KEY = "futgrid:ikiherf:best";

function readBest(key) {
  try {
    return Number(JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}")[key]) || 0;
  } catch {
    return 0;
  }
}

function writeBest(key, value) {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}");
    all[key] = value;
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
  } catch {}
}

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

export default function BotLettersGame({ data, settings, name }) {
  const seconds = settings.soloSeconds;
  const total = settings.rounds;
  const bestKey = `${settings.difficulty}-${seconds}-${total}`;
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState("pick");
  const [letters, setLetters] = useState([]);
  const [picked, setPicked] = useState(null);
  const [rolling, setRolling] = useState(null);
  const [left, setLeft] = useState(seconds);
  const [found, setFound] = useState([]);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [best, setBest] = useState(() => readBest(bestKey));

  const botFirst = round % 2 === 0;
  const order = botFirst ? ["B", "A"] : ["A", "B"];
  const botTurn = phase === "pick" && order[letters.length] === "B";
  const options = useMemo(
    () => letterOptions(data, letters[0] ?? null, settings.difficulty),
    [data, letters, settings.difficulty],
  );

  useEffect(() => {
    if (!botTurn) return;
    const valid = LETTERS.filter((l) => options[l] && l !== letters[0]);
    const choice = randomOf(valid.length ? valid : LETTERS.filter((l) => l !== letters[0]));
    const spin = setInterval(() => {
      setRolling(randomOf(LETTERS));
    }, 80);
    const done = setTimeout(() => {
      clearInterval(spin);
      setRolling(null);
      const next = [...letters, choice];
      setLetters(next);
      if (next.length === 2) startPlay();
    }, 1100);
    return () => {
      clearInterval(spin);
      clearTimeout(done);
    };
  }, [botTurn, letters]);

  useEffect(() => {
    if (phase !== "play") return;
    if (left <= 0) {
      finishRound();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, phase]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(t);
  }, [message]);

  function startPlay() {
    setPhase("play");
    setLeft(seconds);
    setFound([]);
  }

  function finishRound() {
    setHistory((h) => [...h, { letters, found }]);
    setPhase(round >= total ? "done" : "round");
  }

  useEffect(() => {
    if (phase !== "done") return;
    const score = history.reduce((s, r) => s + r.found.length, 0);
    if (score > best) {
      writeBest(bestKey, score);
      setBest(score);
    }
  }, [phase]);

  const confirmLetter = () => {
    if (!picked) return;
    const next = [...letters, picked];
    setLetters(next);
    setPicked(null);
    if (next.length === 2) startPlay();
  };

  const guess = (p) => {
    if (phase !== "play") return;
    if (found.some((f) => f.id === p.id)) {
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
    setFound((f) => [...f, p]);
    setMessage({ bad: false, text: tr("{name} ✓", { name: p.name }) });
  };

  const nextRound = () => {
    setRound((r) => r + 1);
    setLetters([]);
    setPicked(null);
    setFound([]);
    setMessage(null);
    setPhase("pick");
  };

  const restart = () => {
    setHistory([]);
    setRound(0);
    nextRound();
  };

  const score = history.reduce((s, r) => s + r.found.length, 0) + (phase === "play" ? found.length : 0);
  const danger = phase === "play" && left <= 10;
  const sides = order;
  const shown = [...letters];
  if (phase === "pick") shown[letters.length] = botTurn ? rolling : picked;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`${FONT} text-xs font-bold uppercase tracking-[0.2em] text-accent`}>
          {tr("Raund {n}", { n: Math.min(round, total) })} / {total}
        </p>
        <p className={`${FONT} text-sm uppercase tracking-[0.16em] text-muted`}>
          {tr("Xal")} <span className="font-black text-ink">{score}</span>
          <span className="mx-2 text-dim">·</span>
          {tr("Rekord")} <span className="font-black text-ink">{best}</span>
        </p>
      </div>

      {phase === "pick" && (
        <section key={`p-${round}-${letters.length}`} className="mt-3 rounded-2xl border border-edge bg-surface p-4 animate-[thIn_0.35s_ease-out_both] md:p-6">
          {botTurn ? (
            <h2 className={`flex items-center gap-2 ${FONT} text-xl font-black uppercase leading-tight md:text-3xl ${SIDES.B.text}`}>
              <Bot className="h-6 w-6 md:h-8 md:w-8" />
              {tr("Bot hərf seçir...")}
            </h2>
          ) : (
            <>
              <h2 className={`${FONT} text-xl font-black uppercase leading-tight md:text-3xl ${SIDES.A.text}`}>
                {tr("{name}, hərfini seç", { name })}
              </h2>
              <p className={`mt-1 ${FONT} text-[13px] text-muted md:text-base`}>
                {letters.length
                  ? tr("Bot {l} verdi. İndi ikinci hərfi sən seç.", { l: letters[0] })
                  : tr("Birinci hərfi sən seç, ikincisini bot təsadüfi verəcək.")}
              </p>
            </>
          )}
          <div className="mt-4">
            <Tiles letters={shown} sides={sides} size="lg" spinAt={botTurn ? letters.length : -1} />
          </div>
          {!botTurn && (
            <>
              <div className="mt-5">
                <LetterGrid options={options} taken={letters[0]} picked={picked} onPick={setPicked} side="A" />
              </div>
              <button
                type="button"
                onClick={confirmLetter}
                disabled={!picked}
                className={`mt-4 w-full rounded-xl py-3 ${FONT} text-base font-black uppercase tracking-wider transition-opacity duration-200 disabled:opacity-40 ${SIDES.A.solid}`}
              >
                {picked ? tr("{l} hərfini təsdiqlə", { l: picked }) : tr("Hərf seç")}
              </button>
            </>
          )}
        </section>
      )}

      {phase === "play" && (
        <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-edge bg-surface p-4 md:p-5">
            <Tiles letters={letters} sides={sides} size="sm" />
            <p className={`mt-2 text-center ${FONT} text-[13px] text-muted md:text-sm`}>
              {tr("Vaxt bitənə qədər adında həm {a}, həm {b} olan bacardığın qədər futbolçu yaz", { a: letters[0], b: letters[1] })}
            </p>
            <div className="mt-3">
              <div className={`flex items-center justify-between ${FONT} text-xs font-black uppercase tracking-wider`}>
                <span className="text-accent-hi">{tr("{n} tapıldı", { n: found.length })}</span>
                <span className={`relative flex items-center gap-1 tabular-nums ${danger ? "text-bad" : "text-ink"}`}>
                  <Timer className="h-3.5 w-3.5" />
                  {Math.floor(Math.max(0, left) / 60)}:{String(Math.max(0, left) % 60).padStart(2, "0")}
                  {penalty > 0 && (
                    <span key={penalty} className="pointer-events-none absolute -top-4 right-0 text-bad animate-[thUp_1s_ease-out_forwards]">
                      −{PENALTY}
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/10">
                <span
                  className={`block h-full rounded-full transition-[width] duration-1000 ease-linear ${danger ? "bg-bad" : "bg-accent"}`}
                  style={{ width: `${Math.max(0, left / seconds) * 100}%` }}
                />
              </div>
            </div>
            <div key={shake} className={`mt-3 ${shake ? "animate-[thShake_0.35s_ease-out]" : ""}`}>
              <PlayerSearch data={data} onSelect={guess} focusKey={`${round}-${found.length}`} placeholder={tr("Futbolçunun adını yaz...")} />
            </div>
            <div className="mt-2 flex min-h-7 items-center justify-between gap-3">
              {message ? (
                <p className={`${FONT} text-sm font-bold ${message.bad ? "text-bad" : "text-good"}`}>{message.text}</p>
              ) : (
                <span className={`${FONT} text-xs text-faint`}>{tr("Səhv cavab: −{n} saniyə", { n: PENALTY })}</span>
              )}
              <button
                type="button"
                onClick={finishRound}
                className={`inline-flex shrink-0 items-center gap-1.5 ${FONT} text-sm font-bold uppercase text-muted hover:text-ink`}
              >
                <Flag className="h-4 w-4" />
                {tr("Bitir")}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-edge bg-surface p-4 md:p-5">
            <p className={`${FONT} text-xs font-black uppercase tracking-[0.18em] text-faint`}>
              {tr("Tapdıqların · {n}", { n: found.length })}
            </p>
            {found.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {found.map((p) => (
                  <li key={p.id} className={`rounded-full border border-edge bg-page px-2.5 py-1 ${FONT} text-xs font-bold uppercase text-ink animate-[thIn_0.25s_ease-out_both] md:text-sm`}>
                    <Marked name={p.name} letters={letters} />
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

      {phase === "round" && history.length > 0 && (
        <section className="mt-3 rounded-2xl border border-edge bg-surface p-5 text-center animate-[thIn_0.4s_ease-out_both] md:p-7">
          <Tiles letters={history[history.length - 1].letters} sides={sides} size="sm" />
          <p className={`mt-4 ${FONT} text-2xl font-black uppercase text-ink md:text-3xl`}>
            {tr("+{n} xal", { n: history[history.length - 1].found.length })}
          </p>
          <div className="mt-4 text-left">
            <p className={`${FONT} text-xs font-black uppercase tracking-[0.18em] text-faint`}>{tr("Yaza biləcəkdiniz")}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {examples(data, letters[0], letters[1], history[history.length - 1].found).map((p) => (
                <li key={p.id} className={`rounded-full border border-edge bg-page px-2.5 py-1 ${FONT} text-xs font-bold uppercase text-ink md:text-sm`}>
                  <Marked name={p.name} letters={letters} />
                </li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={nextRound} className={`${BTN_PRIMARY} mt-6`}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            {tr("Növbəti raund")}
          </button>
          <p className={`mt-2 ${FONT} text-xs text-faint`}>
            {round % 2 === 1 ? tr("Növbəti raundda ilk hərfi bot verir") : tr("Növbəti raundda ilk hərfi sən seçirsən")}
          </p>
        </section>
      )}

      {phase === "done" && (
        <section className="mt-3 rounded-2xl border border-edge bg-surface p-5 text-center animate-[thIn_0.4s_ease-out_both] md:p-7">
          <Trophy className="mx-auto h-9 w-9 text-gold" />
          <p className={`mt-2 ${FONT} text-sm font-bold uppercase tracking-[0.2em] text-accent`}>{tr("Oyun bitdi")}</p>
          <p className={`${FONT} text-5xl font-black text-ink`}>{score}</p>
          <p className={`${FONT} text-sm text-muted`}>
            {score >= best && score > 0 ? tr("Yeni rekord!") : tr("Rekord: {n}", { n: best })}
          </p>
          <ul className="mx-auto mt-5 max-w-md space-y-2 text-left">
            {history.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-edge px-3 py-2">
                <span className={`${FONT} text-sm font-bold uppercase text-muted`}>{tr("Raund {n}", { n: i + 1 })}</span>
                <span className={`${FONT} text-base font-black text-ink`}>
                  <span className="text-accent-hi">{r.letters[0]}</span> + <span className="text-gold-hi">{r.letters[1]}</span>
                </span>
                <span className={`rounded-full bg-accent/10 px-2.5 py-0.5 ${FONT} text-sm font-black text-accent`}>{r.found.length}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={restart} className={`${BTN_PRIMARY} mt-6`}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <RotateCcw className="h-4 w-4" />
            {tr("Yenidən oyna")}
          </button>
        </section>
      )}
    </div>
  );
}
