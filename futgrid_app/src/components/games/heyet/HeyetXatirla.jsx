import { useState } from "react";
import { ChevronRight, Shuffle, Users } from "lucide-react";
import { dateLabel, matches, playableSides } from "../../../lib/games/lineups";
import GameLayout from "../common/GameLayout";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import LineupGame, { LINEUP_KEYFRAMES } from "./LineupGame";

import { tr } from "../../../i18n";
const RECENT_KEY = "futgrid:heyet:recent";

const ALL_GAMES = matches.flatMap((m) =>
  playableSides(m).map((s) => ({ match: m, sides: [s], key: `${m.id}:${s}` })),
);

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function pickRandom(exclude) {
  const recent = readRecent();
  const limit = Math.min(recent.length, Math.max(0, ALL_GAMES.length - 3));
  const avoid = new Set([...recent.slice(0, limit), exclude].filter(Boolean));
  const pool = ALL_GAMES.filter((g) => !avoid.has(g.key));
  const list = pool.length ? pool : ALL_GAMES.filter((g) => g.key !== exclude);
  const game = list[Math.floor(Math.random() * list.length)] ?? ALL_GAMES[0];
  try {
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify([game.key, ...recent.filter((k) => k !== game.key)].slice(0, 12)),
    );
  } catch {}
  return game;
}

function SidePicker({ match, onPick }) {
  const sides = playableSides(match);
  const options = [
    ...(sides.length === 2 ? [{ key: "both", label: tr("Hər iki komanda"), sub: tr("22 oyunçu"), sides }] : []),
    ...sides.map((s) => ({ key: s, label: tr(match[s].name), sub: tr("11 oyunçu"), sides: [s] })),
  ];
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onPick(o.sides)}
          className="group flex items-center justify-between border border-line/10 bg-line/5 px-4 py-3 text-left transition-colors duration-200 hover:border-accent hover:bg-accent/10"
        >
          <span>
            <span className={`block ${FONT} text-base font-bold uppercase text-ink`}>{o.label}</span>
            <span className={`block ${FONT} text-xs text-faint`}>{o.sub}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent" />
        </button>
      ))}
    </div>
  );
}

function MatchList({ onPick, onRandom }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
          {tr("Oyunu özün seç")}
        </p>
        <button type="button" onClick={onRandom} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          <Shuffle className="h-4 w-4" />
          {tr("Təsadüfi oyun")}
        </button>
      </div>
      <div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-2">
        {matches.map((m, i) => (
          <div
            key={m.id}
            className="border border-line/10 bg-surface p-4 animate-[luIn_0.45s_ease-out_both] md:p-5"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <button
              type="button"
              onClick={() => setOpen(open === m.id ? null : m.id)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <span>
                <span className={`block ${FONT} text-xs font-bold uppercase tracking-[0.18em] text-accent`}>
                  {tr(m.competition)}
                </span>
                <span className={`mt-1 block ${FONT} text-xl font-bold uppercase text-ink md:text-2xl`}>
                  {tr(m.home.name)} <span className="text-accent">{m.home.score}–{m.away.score}</span> {tr(m.away.name)}
                </span>
                <span className={`block ${FONT} text-sm text-muted`}>
                  {dateLabel(m.date)} · {tr(m.venue)}
                </span>
              </span>
              <span className={`inline-flex shrink-0 items-center gap-1.5 ${FONT} text-sm font-bold text-faint`}>
                <Users className="h-4 w-4" />
                {playableSides(m).length * 11}
              </span>
            </button>
            {open === m.id && <SidePicker match={m} onPick={(sides) => onPick({ match: m, sides })} />}
          </div>
        ))}
      </div>
    </>
  );
}

export default function HeyetXatirla() {
  const [game, setGame] = useState(() => pickRandom());
  const [round, setRound] = useState(0);

  const start = (g) => {
    setGame(g);
    setRound((r) => r + 1);
  };
  const next = () => start(pickRandom(game?.key));

  return (
    <GameLayout
      eyebrow={tr("Yaddaş oyunu")}
      title={tr("Heyəti xatırla")}
      description={tr("Təsadüfi məşhur oyun və komanda gəlir. Başlanğıc heyəti xatırla: ad və ya soyad yazmaq kifayətdir.")}
      compact={Boolean(game)}
    >
      <style>{LINEUP_KEYFRAMES}</style>
      {game ? (
        <LineupGame
          key={`${round}-${game.match.id}-${game.sides.join()}`}
          match={game.match}
          sides={game.sides}
          onNext={next}
          onList={() => setGame(null)}
        />
      ) : (
        <MatchList
          onRandom={next}
          onPick={(g) => start({ ...g, key: `${g.match.id}:${g.sides.join("+")}` })}
        />
      )}
    </GameLayout>
  );
}
