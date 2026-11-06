import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, RotateCcw, Share2, Undo2 } from "lucide-react";
import { matchesIn, pairOf, photoIndex, pick, roundName, saveResult, standings, startBracket } from "../../../lib/games/goat";
import { GOAT_PLAYERS } from "../../../lib/games/goatPlayers";
import { countryFlag } from "../../../lib/games/x0xCategories";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import GoatCard, { Portrait } from "./GoatCard";

import { tr } from "../../../i18n";
export const GOAT_KEYFRAMES = `
@keyframes gtIn { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes gtPop { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.4); } 70% { opacity: 1; transform: translate(-50%,-50%) scale(1.12); } 100% { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
@keyframes gtVs { 0% { transform: translate(-50%,-50%) scale(.6) rotate(-12deg); opacity: 0; } 100% { transform: translate(-50%,-50%) scale(1) rotate(-6deg); opacity: 1; } }
@keyframes gtCrown { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-6px) rotate(4deg); } }
`;

const DELAY = 450;

function Chip({ player, photos, data, tone = "default" }) {
  return (
    <li
      className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
        tone === "gold" ? "border-yellow/60 bg-yellow/10" : "border-edge bg-surface"
      }`}
    >
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
        <Portrait player={player} photo={photos.get(player.id)} data={data} compact />
      </span>
      <span className={`min-w-0 flex-1 truncate ${FONT} text-sm font-bold uppercase text-ink`}>{player.name}</span>
      <span className="text-base leading-none">{countryFlag(player.code, data)}</span>
    </li>
  );
}

function Result({ result, size, photos, data, onAgain }) {
  const [copied, setCopied] = useState(false);
  const { champion, final, semi, quarter } = result;
  const runnerUp = final[0];

  const share = async () => {
    const text = tr("Mənim tarixin ən yaxşısı: {name} 👑 Sən kimi seçərdin? futgrid.az", { name: champion.name });
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {}
  };

  return (
    <div className="mx-auto max-w-5xl animate-[gtIn_0.5s_ease-out_both]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="relative mx-auto w-full max-w-sm">
          <span className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 animate-[gtCrown_2.4s_ease-in-out_infinite]">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-yellow text-on-yellow shadow-xl">
              <Crown className="h-7 w-7" />
            </span>
          </span>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border-4 border-yellow shadow-[0_30px_70px_-30px_var(--fg-yellow)]">
            <Portrait player={champion} photo={photos.get(champion.id)} data={data} />
            <span className="absolute inset-x-4 bottom-4 -skew-x-12 bg-yellow px-4 py-2 text-center shadow-lg">
              <span className={`block skew-x-12 ${FONT} text-2xl font-black italic uppercase text-on-yellow md:text-3xl`}>
                {champion.name}
              </span>
            </span>
          </div>
        </div>

        <div>
          <p className={`${FONT} text-sm font-bold uppercase tracking-[0.2em] text-accent`}>
            {tr("{n} oyunçu arasından", { n: size })}
          </p>
          <h2 className={`mt-1 ${FONT} text-3xl font-black uppercase leading-none text-ink md:text-5xl`}>
            {tr("Sənin tarixin ən yaxşısı")}
          </h2>
          <p className={`mt-3 ${FONT} text-base text-muted`}>
            {tr("Finalda {runner} məğlub oldu.", { runner: runnerUp?.name ?? "—" })}
          </p>

          {semi.length > 0 && (
            <>
              <p className={`mt-6 ${FONT} text-xs font-black uppercase tracking-[0.2em] text-faint`}>{tr("Final və yarımfinal")}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {[...final, ...semi].map((p) => (
                  <Chip key={p.id} player={p} photos={photos} data={data} tone={final.includes(p) ? "gold" : "default"} />
                ))}
              </ul>
            </>
          )}
          {quarter.length > 0 && (
            <>
              <p className={`mt-5 ${FONT} text-xs font-black uppercase tracking-[0.2em] text-faint`}>{tr("Çeyrək final")}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {quarter.map((p) => (
                  <Chip key={p.id} player={p} photos={photos} data={data} />
                ))}
              </ul>
            </>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={onAgain} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              {tr("Yenidən oyna")}
            </button>
            <button type="button" onClick={share} className={BTN_GHOST}>
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <Share2 className="h-4 w-4" />
              {copied ? tr("Kopyalandı!") : tr("Paylaş")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GoatGame({ data, size }) {
  const photos = useMemo(() => photoIndex(data), [data]);
  const [state, setState] = useState(() => startBracket(size));
  const [history, setHistory] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [result, setResult] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const pair = state.champion ? [] : pairOf(state);
  const total = size - 1;
  const played = size - state.alive.length + state.index;

  useEffect(() => {
    if (state.champion) return;
    const nextIndex = state.index + 1;
    const next = nextIndex < matchesIn(state)
      ? [state.alive[nextIndex * 2], state.alive[nextIndex * 2 + 1]]
      : [];
    for (const p of next) {
      const src = photos.get(p?.id)?.[0];
      if (src) new Image().src = src;
    }
  }, [state, photos]);

  const choose = (winner) => {
    if (chosen || state.champion) return;
    setChosen(winner.id);
    timer.current = setTimeout(() => {
      const next = pick(state, winner);
      setHistory((h) => [...h, state]);
      setState(next);
      setChosen(null);
      if (next.champion) {
        const r = standings(next, size);
        saveResult(size, r);
        setResult(r);
      }
    }, DELAY);
  };

  const undo = () => {
    if (!history.length || chosen) return;
    setState(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setResult(null);
  };

  const restart = () => {
    clearTimeout(timer.current);
    setState(startBracket(size));
    setHistory([]);
    setChosen(null);
    setResult(null);
  };

  useEffect(() => {
    if (result) return;
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea")) return;
      if (e.key === "ArrowLeft" || e.key === "1") pair[0] && choose(pair[0]);
      else if (e.key === "ArrowRight" || e.key === "2") pair[1] && choose(pair[1]);
      else if (e.key === "Backspace" || (e.key === "z" && (e.ctrlKey || e.metaKey))) undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (result) return <Result result={result} size={size} photos={photos} data={data} onAgain={restart} />;

  const [a, b] = pair;
  const cardState = (p) => (chosen ? (chosen === p.id ? "won" : "lost") : null);

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <h2 className={`${FONT} text-2xl font-black uppercase leading-none text-ink sm:text-3xl md:text-5xl`}>
          {tr("Tarixin ən yaxşısı kimdir?")}
        </h2>
        <p className={`mt-3 inline-flex items-center gap-2 rounded-full border-2 border-edge bg-surface px-4 py-1.5 ${FONT} text-sm font-bold uppercase tracking-wide text-ink md:text-base`}>
          {roundName(state.alive.length)}
          <span className="h-4 w-px bg-edge" />
          <span>
            <span className="text-accent">{state.index + 1}</span>
            <span className="text-faint">/{matchesIn(state)}</span>
          </span>
        </p>
        <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-line/10">
          <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(played / total) * 100}%` }} />
        </div>
      </div>

      <div key={`${state.alive.length}-${state.index}`} className="relative mx-auto mt-6 grid max-w-6xl grid-cols-2 gap-3 sm:gap-5 md:mt-8 md:gap-8">
        <div className="animate-[gtIn_0.4s_ease-out_both]">
          <GoatCard player={a} photo={photos.get(a.id)} data={data} side="left" hotkey="←" state={cardState(a)} onPick={() => choose(a)} />
        </div>
        <div className="animate-[gtIn_0.4s_ease-out_both]" style={{ animationDelay: "70ms" }}>
          <GoatCard player={b} photo={photos.get(b.id)} data={data} side="right" hotkey="→" state={cardState(b)} onPick={() => choose(b)} />
        </div>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 top-1/2 z-20 grid h-14 w-14 place-items-center rounded-full border-4 border-page bg-navy shadow-2xl animate-[gtVs_0.45s_cubic-bezier(.2,.8,.2,1)_both] sm:h-20 sm:w-20 md:h-24 md:w-24 ${
            chosen ? "opacity-0 transition-opacity duration-200" : ""
          }`}
        >
          <span className={`${FONT} text-xl font-black italic leading-none sm:text-3xl md:text-4xl`}>
            <span className="text-accent-hi">V</span>
            <span className="text-yellow">S</span>
          </span>
        </span>
      </div>

      <div className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className={`hidden ${FONT} text-sm text-faint lg:block`}>{tr("Klaviatura: ← sol, → sağ, Backspace geri al")}</p>
        <p className={`${FONT} text-sm text-muted lg:hidden`}>{tr("Daha yaxşı hesab etdiyin oyunçuya toxun")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={undo} disabled={!history.length || Boolean(chosen)} className={`${BTN_GHOST} disabled:opacity-40`}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <Undo2 className="h-4 w-4" />
            {tr("Geri al")}
          </button>
          <button type="button" onClick={restart} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <RotateCcw className="h-4 w-4" />
            {tr("Yenidən başla")}
          </button>
        </div>
      </div>

      <p className={`mt-4 text-center ${FONT} text-xs text-faint`}>
        {tr("{n} oyunçu · {done}/{total} seçim", { n: GOAT_PLAYERS.slice(0, size).length, done: played, total })}
      </p>
    </div>
  );
}
