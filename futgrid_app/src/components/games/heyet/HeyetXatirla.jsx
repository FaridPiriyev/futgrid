import { useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import { dateLabel, matches, playableSides } from "../../../lib/games/lineups";
import GameLayout from "../common/GameLayout";
import { FONT } from "../common/ui";
import LineupGame, { LINEUP_KEYFRAMES } from "./LineupGame";

function SidePicker({ match, onPick }) {
  const sides = playableSides(match);
  const options = [
    ...(sides.length === 2 ? [{ key: "both", label: "Hər iki komanda", sub: "22 oyunçu", sides }] : []),
    ...sides.map((s) => ({ key: s, label: match[s].name, sub: "11 oyunçu", sides: [s] })),
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

export default function HeyetXatirla() {
  const [open, setOpen] = useState(null);
  const [game, setGame] = useState(null);

  return (
    <GameLayout
      eyebrow="Yaddaş oyunu"
      title="Heyəti xatırla"
      description="Məşhur oyunları seç və meydana çıxan başlanğıc heyəti xatırla. Ad və ya soyad yazmaq kifayətdir."
      compact={Boolean(game)}
    >
      <style>{LINEUP_KEYFRAMES}</style>
      {game ? (
        <LineupGame
          key={`${game.match.id}-${game.sides.join()}`}
          match={game.match}
          sides={game.sides}
          onBack={() => setGame(null)}
        />
      ) : (
        <div className="mx-auto max-w-3xl space-y-3">
          {matches.map((m, i) => (
            <div
              key={m.id}
              className="border border-line/10 bg-surface p-4 animate-[luIn_0.45s_ease-out_both] md:p-5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpen(open === m.id ? null : m.id)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span>
                  <span className={`block ${FONT} text-xs font-bold uppercase tracking-[0.18em] text-accent`}>
                    {m.competition}
                  </span>
                  <span className={`mt-1 block ${FONT} text-xl font-bold uppercase text-ink md:text-2xl`}>
                    {m.home.name} <span className="text-accent">{m.home.score}–{m.away.score}</span> {m.away.name}
                  </span>
                  <span className={`block ${FONT} text-sm text-muted`}>
                    {dateLabel(m.date)} · {m.venue}
                  </span>
                </span>
                <span className={`inline-flex shrink-0 items-center gap-1.5 ${FONT} text-sm font-bold text-faint`}>
                  <Users className="h-4 w-4" />
                  {playableSides(m).length * 11}
                </span>
              </button>
              {open === m.id && <SidePicker match={m} onPick={(sides) => setGame({ match: m, sides })} />}
            </div>
          ))}
        </div>
      )}
    </GameLayout>
  );
}
