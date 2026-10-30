import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Delete, RotateCcw } from "lucide-react";
import {
  MAX_TRIES,
  dailyTarget,
  evaluate,
  keyStates,
  loadDaily,
  randomTarget,
  saveDaily,
  shareText,
  surnameOf,
  wordlePool,
} from "../../../lib/games/wordle";
import { POS_NAME, clubOf, countryOf } from "../../../lib/games/playerInfo";
import PlayerAvatar, { ClubLogo, Flag } from "../common/PlayerAvatar";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";

export const WORDLE_KEYFRAMES = `
@keyframes wdFlip { 0% { transform: rotateX(0); } 50% { transform: rotateX(90deg); } 100% { transform: rotateX(0); } }
@keyframes wdPop { 0% { transform: scale(1); } 50% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes wdShake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
@keyframes wdIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
`;

const KEYBOARD = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

const TILE = {
  hit: "border-good-lo bg-good-lo text-white",
  near: "border-gold bg-gold text-white",
  miss: "border-dim bg-dim text-white",
};

const KEY = {
  hit: "bg-good-lo text-white",
  near: "bg-gold text-white",
  miss: "bg-dim/70 text-white/80",
};

function Tile({ letter, mark, index, typing }) {
  return (
    <span
      lang="en"
      className={`grid aspect-square w-full place-items-center border-2 ${FONT} text-2xl font-bold md:text-3xl ${
        mark ? TILE[mark] : letter ? "border-line/40 text-ink" : "border-line/15 text-ink"
      } ${typing && letter ? "animate-[wdPop_0.12s_ease-out]" : ""}`}
      style={
        mark
          ? { animation: `wdFlip 0.5s ease ${index * 0.12}s both` }
          : undefined
      }
    >
      {letter.toUpperCase()}
    </span>
  );
}

function hintsFor(data, p, misses) {
  const country = countryOf(data, p);
  const club = clubOf(data, p);
  const list = [
    { at: 1, label: "Mövqe", value: POS_NAME[p.position] ?? "—" },
    {
      at: 2,
      label: "Ölkə",
      value: country ? (
        <span className="inline-flex items-center gap-1.5">
          <Flag key={country.code} country={country} />
          {country.name}
        </span>
      ) : (
        "—"
      ),
    },
    {
      at: 3,
      label: p.is_active === false ? "Son klub" : "Klub",
      value: club ? (
        <span className="inline-flex items-center gap-1.5">
          <ClubLogo key={club.name} club={club} className="h-4 w-4" />
          {club.name}
        </span>
      ) : (
        "—"
      ),
    },
    { at: 4, label: "Doğum ili", value: p.birth_date?.slice(0, 4) ?? "—" },
    { at: 5, label: "Adın ilk hərfi", value: p.name.trim()[0]?.toUpperCase() ?? "—" },
  ];
  return list.map((h) => ({ ...h, open: misses >= h.at }));
}

export default function WordleGame({ data, mode, difficulty }) {
  const { dict, targets } = useMemo(() => wordlePool(data, difficulty), [data, difficulty]);
  const [target, setTarget] = useState(() =>
    mode === "daily" ? dailyTarget(targets, difficulty) : randomTarget(targets),
  );
  const answer = surnameOf(target);
  const [rows, setRows] = useState(() => {
    if (mode !== "daily") return [];
    const saved = loadDaily(difficulty);
    return saved?.answer === answer ? saved.rows : [];
  });
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);
  const [copied, setCopied] = useState(false);

  const won = rows.some((r) => r.word === answer);
  const done = won || rows.length >= MAX_TRIES;
  const misses = rows.filter((r) => r.word !== answer).length;
  const keys = useMemo(() => keyStates(rows), [rows]);

  useEffect(() => {
    if (mode === "daily") saveDaily(difficulty, { answer, rows });
  }, [mode, difficulty, answer, rows]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 1800);
    return () => clearTimeout(t);
  }, [message]);

  const fail = (text) => {
    setMessage(text);
    setShake((s) => s + 1);
  };

  const press = useCallback(
    (key) => {
      if (done) return;
      if (key === "enter") {
        if (current.length < answer.length) return fail(`${answer.length} hərf lazımdır`);
        if (!dict.has(current)) return fail("Bazada belə ad yoxdur");
        setRows((r) => [...r, { word: current, marks: evaluate(current, answer) }]);
        setCurrent("");
        return;
      }
      if (key === "back") return setCurrent((c) => c.slice(0, -1));
      if (/^[a-z]$/.test(key))
        setCurrent((c) => (c.length < answer.length ? c + key : c));
    },
    [done, current, answer, dict],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") press("enter");
      else if (e.key === "Backspace") press("back");
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const next = () => {
    setTarget((t) => randomTarget(targets, Math.random, t.id));
    setRows([]);
    setCurrent("");
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText(rows, won, answer.length));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const hints = hintsFor(data, target, done ? MAX_TRIES : misses);
  const club = clubOf(data, target);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
      <div className="mx-auto w-full max-w-md">
        <p className={`text-center ${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
          Futbolçunun soyadı · <span className="font-bold text-ink">{answer.length} hərf</span>
        </p>
        <div className="relative mt-4 space-y-1.5">
          {Array.from({ length: MAX_TRIES }, (_, r) => {
            const row = rows[r];
            const isCurrent = r === rows.length && !done;
            const letters = row ? row.word : isCurrent ? current : "";
            return (
              <div
                key={isCurrent ? `c-${shake}` : r}
                className={`grid gap-1.5 ${isCurrent && shake ? "animate-[wdShake_0.4s_ease-out]" : ""}`}
                style={{ gridTemplateColumns: `repeat(${answer.length}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: answer.length }, (_, i) => (
                  <Tile
                    key={i}
                    index={i}
                    letter={letters[i] ?? ""}
                    mark={row?.marks[i]}
                    typing={isCurrent}
                  />
                ))}
              </div>
            );
          })}
          {message && (
            <span
              className={`absolute left-1/2 top-1/3 -translate-x-1/2 whitespace-nowrap bg-ink px-4 py-2 ${FONT} text-sm font-bold text-page shadow-xl animate-[wdIn_0.2s_ease-out]`}
            >
              {message}
            </span>
          )}
        </div>

        {done ? (
          <div className="mt-6 border border-line/10 bg-surface p-5 text-center animate-[wdIn_0.4s_ease-out_both]">
            <p className={`${FONT} text-sm font-bold uppercase tracking-[0.2em] ${won ? "text-good" : "text-bad"}`}>
              {won ? `Tapdın! ${rows.length}/${MAX_TRIES}` : "Tapa bilmədin"}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <PlayerAvatar player={target} className="h-14 w-14" textClass="text-lg" />
              <div className="text-left">
                <p className={`${FONT} text-xl font-bold uppercase text-ink`}>{target.name}</p>
                <p className={`${FONT} text-sm text-muted`}>{club?.name}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {mode === "endless" ? (
                <button type="button" onClick={next} className={BTN_PRIMARY}>
                  <span aria-hidden="true" className={SWEEP_WHITE} />
                  <RotateCcw className="h-4 w-4" />
                  Növbəti oyunçu
                </button>
              ) : (
                <p className={`w-full ${FONT} text-sm text-muted`}>Yeni oyunçu sabah gələcək.</p>
              )}
              <button type="button" onClick={share} className={BTN_GHOST}>
                <span aria-hidden="true" className={SWEEP_BLUE} />
                <Copy className="h-4 w-4" />
                {copied ? "Kopyalandı" : "Nəticəni kopyala"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-1.5">
            {KEYBOARD.map((row, i) => (
              <div key={row} className="flex justify-center gap-1.5">
                {i === 2 && (
                  <button
                    type="button"
                    onClick={() => press("enter")}
                    className={`h-13 rounded-md bg-accent px-3 ${FONT} text-xs font-bold uppercase text-white active:scale-95`}
                  >
                    Yoxla
                  </button>
                )}
                {[...row].map((k) => (
                  <button
                    key={k}
                    type="button"
                    lang="en"
                    onClick={() => press(k)}
                    className={`h-13 min-w-0 flex-1 rounded-md ${FONT} text-base font-bold transition-colors duration-300 active:scale-95 sm:max-w-11 ${
                      keys[k] ? KEY[keys[k]] : "bg-line/10 text-ink hover:bg-line/15"
                    }`}
                  >
                    {k.toUpperCase()}
                  </button>
                ))}
                {i === 2 && (
                  <button
                    type="button"
                    aria-label="Sil"
                    onClick={() => press("back")}
                    className="grid h-13 place-items-center rounded-md bg-line/10 px-3 text-ink active:scale-95"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="border border-line/10 bg-surface p-4 md:p-5">
        <p className={`${FONT} text-sm font-bold uppercase tracking-[0.2em] text-ink`}>İpuçları</p>
        <p className={`mt-1 ${FONT} text-xs text-faint`}>Hər səhv cavabdan sonra biri açılır.</p>
        <ul className="mt-4 space-y-2">
          {hints.map((h) => (
            <li
              key={h.label}
              className={`flex items-center justify-between gap-3 border px-3 py-2.5 ${FONT} text-sm ${
                h.open ? "border-accent/30 bg-accent/5 animate-[wdIn_0.3s_ease-out_both]" : "border-line/10"
              }`}
            >
              <span className="text-muted">{h.label}</span>
              <span className={h.open ? "font-bold text-ink" : "text-dim"}>
                {h.open ? h.value : `${h.at} səhvdən sonra`}
              </span>
            </li>
          ))}
        </ul>
        <div className={`mt-5 grid grid-cols-3 gap-2 ${FONT} text-[11px] text-muted`}>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-good-lo" />Yerində</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-gold" />Var, başqa yerdə</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-dim" />Yoxdur</span>
        </div>
      </aside>
    </div>
  );
}
