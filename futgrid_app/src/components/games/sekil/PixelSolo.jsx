import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw, SkipForward, Timer, Trophy } from "lucide-react";
import { pickPhoto, pointsFor, revealOrder } from "../../../lib/games/pixel";
import PlayerSearch from "../common/PlayerSearch";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { RevealCard } from "../sual/SualParts";
import PixelBoard, { TileMeter } from "./PixelBoard";

import { tr } from "../../../i18n";

const BEST_KEY = "futgrid:sekil:best";
const LAST_CALL = 8;

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

export default function PixelSolo({ data, settings }) {
  const size = settings.grid;
  const total = settings.rounds;
  const bestKey = `${settings.difficulty}-${settings.era}-${size}-${total}`;
  const seen = useRef(new Set());
  const [round, setRound] = useState(1);
  const [player, setPlayer] = useState(() => pickPhoto(data, settings));
  const [order, setOrder] = useState(() => revealOrder(size));
  const [opened, setOpened] = useState(0);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState("play");
  const [lastCall, setLastCall] = useState(LAST_CALL);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);
  const [best, setBest] = useState(() => readBest(bestKey));

  const score = history.reduce((s, h) => s + h.points, 0);

  useEffect(() => {
    if (phase !== "play" || !ready) return;
    if (opened < size) {
      const t = setTimeout(() => setOpened((n) => Math.min(size, n + 1)), opened === 0 ? 400 : settings.speed * 1000);
      return () => clearTimeout(t);
    }
    if (lastCall <= 0) {
      endRound(false);
      return;
    }
    const t = setTimeout(() => setLastCall((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, ready, opened, lastCall]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(t);
  }, [message]);

  function endRound(won) {
    const points = won ? pointsFor(size, opened) : 0;
    const next = [...history, { player, points, opened }];
    setHistory(next);
    setPhase(round >= total ? "done" : "round");
    if (round >= total) {
      const sum = next.reduce((s, h) => s + h.points, 0);
      if (sum > best) {
        writeBest(bestKey, sum);
        setBest(sum);
      }
    }
  }

  const guess = (p) => {
    if (phase !== "play" || !ready) return;
    if (p.id === player.id) {
      endRound(true);
      return;
    }
    setMessage(tr("{name} deyil. Cəza: bir xana da açıldı.", { name: p.name }));
    setShake((s) => s + 1);
    setOpened((n) => Math.min(size, n + 1));
  };

  const newPlayer = () => {
    seen.current.add(player?.id);
    setPlayer(pickPhoto(data, settings, seen.current));
    setOrder(revealOrder(size));
    setOpened(0);
    setReady(false);
    setLastCall(LAST_CALL);
    setMessage(null);
  };

  const next = () => {
    setRound((r) => r + 1);
    newPlayer();
    setPhase("play");
  };

  const restart = () => {
    setHistory([]);
    setRound(1);
    newPlayer();
    setPhase("play");
  };

  const last = history[history.length - 1];
  const playing = phase === "play";

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-start">
      <div className="mx-auto w-full max-w-[20rem] sm:max-w-[24rem] md:max-w-none">
        <PixelBoard
          player={player}
          size={size}
          order={order}
          opened={opened}
          all={!playing}
          onReady={() => setReady(true)}
          onBroken={() => setTimeout(newPlayer, 300)}
        />
        <div className="mt-3">
          <TileMeter size={size} opened={playing ? opened : size} />
        </div>
      </div>

      <section className="rounded-2xl border border-edge bg-surface p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className={`${FONT} text-xs font-black uppercase tracking-[0.2em] text-accent`}>
            {tr("Raund {n}/{total}", { n: Math.min(round, total), total })}
          </p>
          <p className={`${FONT} text-sm font-black uppercase text-ink`}>
            {tr("Xal: {n}", { n: score })}
            {best > 0 && <span className="ml-2 text-gold-hi">· {tr("Rekord: {n}", { n: best })}</span>}
          </p>
        </div>

        {playing ? (
          <>
            <h2 className={`mt-3 ${FONT} text-2xl font-black uppercase leading-tight text-ink md:text-3xl`}>{tr("Kimdir bu?")}</h2>
            <p className={`mt-1 ${FONT} text-sm text-muted`}>
              {opened < size
                ? tr("Hər {n} saniyədən bir xana açılır. Tez tapsan, çox xal alırsan: indi {p} xal.", { n: settings.speed, p: pointsFor(size, opened) })
                : tr("Bütün xanalar açıldı: son {n} saniyə!", { n: lastCall })}
            </p>
            <div key={shake} className={`mt-4 ${shake ? "animate-[pxShake_0.35s_ease-out]" : ""}`}>
              <PlayerSearch data={data} onSelect={guess} disabled={!ready} focusKey={round} placeholder={tr("Futbolçunun adını yaz...")} />
            </div>
            <div className="mt-2 flex min-h-7 items-center justify-between gap-3">
              <p className={`${FONT} text-sm font-bold ${message ? "text-bad" : "text-faint"}`}>
                {message ?? tr("Səhv cavab bir xana da açır.")}
              </p>
              <button type="button" onClick={() => endRound(false)} className={`inline-flex shrink-0 items-center gap-1.5 ${FONT} text-sm font-bold uppercase text-muted hover:text-ink`}>
                <SkipForward className="h-4 w-4" />
                {tr("Bilmirəm")}
              </button>
            </div>
            {opened >= size && (
              <p className={`mt-2 inline-flex items-center gap-1.5 ${FONT} text-sm font-black text-bad`}>
                <Timer className="h-4 w-4" />
                0:{String(lastCall).padStart(2, "0")}
              </p>
            )}
          </>
        ) : (
          <div className="mt-3 animate-[pxIn_0.35s_ease-out_both]">
            {phase === "done" ? (
              <>
                <Trophy className="h-8 w-8 text-gold" />
                <p className={`mt-2 ${FONT} text-3xl font-black uppercase leading-none text-ink`}>{tr("Oyun bitdi: {n} xal", { n: score })}</p>
                <p className={`mt-1 ${FONT} text-sm text-muted`}>
                  {tr("{n} futbolçudan {k}-nı tapdın", { n: total, k: history.filter((h) => h.points > 0).length })}
                </p>
              </>
            ) : (
              <p className={`${FONT} text-2xl font-black uppercase leading-tight ${last?.points ? "text-good" : "text-bad"}`}>
                {last?.points ? tr("Düzdür! +{n} xal", { n: last.points }) : tr("Tapılmadı")}
              </p>
            )}
            {last && (
              <div className="mt-3">
                <RevealCard data={data} player={last.player} tone={last.points ? "border-good" : "border-bad"} />
              </div>
            )}
            {phase === "done" && (
              <ul className="mt-4 space-y-1">
                {history.map((h, i) => (
                  <li key={i} className={`flex items-center justify-between gap-3 border-b border-edge py-1.5 ${FONT} text-sm`}>
                    <span className="truncate font-bold uppercase text-ink">{h.player.name}</span>
                    <span className={h.points ? "font-black text-good" : "text-faint"}>{h.points ? `+${h.points}` : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={phase === "done" ? restart : next} className={`${BTN_PRIMARY} mt-5`}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              {phase === "done" ? <RotateCcw className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              {phase === "done" ? tr("Yenidən oyna") : tr("Növbəti futbolçu")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
