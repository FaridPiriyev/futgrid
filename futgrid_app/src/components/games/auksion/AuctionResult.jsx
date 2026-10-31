import { useEffect, useState } from "react";
import { RotateCcw, Settings2, Trophy } from "lucide-react";
import { BUDGET, money, teamStrength } from "../../../lib/games/auction";
import { clubOf, countryOf } from "../../../lib/games/playerInfo";
import PlayerAvatar from "../common/PlayerAvatar";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { shortName } from "./AuctionParts";
import { SIDES } from "./settings";

import { tr } from "../../../i18n";
const SPOTS = {
  GK: [[50, 86]],
  DF: [[50, 63]],
  MF: [[50, 40]],
  FW: [
    [27, 14],
    [73, 14],
  ],
};

function useCount(target, run, duration = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let frame;
    let start;
    const step = (t) => {
      start ??= t;
      const p = Math.min(1, (t - start) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, run, duration]);
  return v;
}

function Pitch({ team, side }) {
  const used = { GK: 0, DF: 0, MF: 0, FW: 0 };
  return (
    <div data-theme="dark" className="relative h-80 overflow-hidden border border-line/8 bg-linear-to-b from-[#0d2a1c] to-[#0a1f16] md:h-96">
      <span className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/12" />
      <span className="absolute bottom-0 left-1/2 h-12 w-32 -translate-x-1/2 border border-b-0 border-line/12" />
      <span className="absolute inset-x-0 top-0 h-px bg-line/12" />
      {team.slots.map((s, i) => {
        if (!s.pick) return null;
        const [x, y] = SPOTS[s.pos][used[s.pos]++] ?? [50, 50];
        return (
          <div
            key={i}
            className="absolute w-24 -translate-x-1/2 -translate-y-1/2 text-center animate-[auLot_0.5s_cubic-bezier(.2,.8,.2,1)_both]"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${300 + i * 120}ms` }}
          >
            <span className="relative mx-auto block w-fit">
              <PlayerAvatar
                player={s.pick.player}
                className={`h-11 w-11 border-2 ${SIDES[side].border}`}
                textClass="text-sm"
              />
              <span className="absolute -bottom-1.5 -right-2.5 bg-gold px-1 text-[10px] font-bold text-black">
                {s.pick.rating}
              </span>
            </span>
            <span
              className={`mt-1.5 block truncate ${FONT} text-[11px] font-bold text-ink [text-shadow:0_1px_4px_#000]`}
            >
              {shortName(s.pick.player.name)}
            </span>
            <span className={`block ${FONT} text-[10px] text-muted`}>
              {s.pick.auto ? "avtomatik" : money(s.pick.price)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Bar({ label, value, width, color }) {
  return (
    <div>
      <div className={`flex justify-between ${FONT} text-sm text-soft`}>
        <span>{label}</span>
        <span className="font-bold text-ink">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden bg-line/8">
        <span
          className={`block h-full origin-left animate-[auGrow_1s_ease-out_0.4s_both] ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, width))}%` }}
        />
      </div>
    </div>
  );
}

function TeamCard({ data, side, name, team, res, place, delay }) {
  const best = team.slots
    .map((s) => s.pick)
    .filter((p) => p && !p.auto)
    .sort((a, b) => b.rating / Math.max(1, b.price) - a.rating / Math.max(1, a.price))[0];
  const chemNotes = res.links.slice(0, 3).map((l) => {
    const what =
      l.type === "club" ? clubOf(data, l.a)?.name : countryOf(data, l.a)?.name;
    return `${shortName(l.a.name)} + ${shortName(l.b.name)} — ${what}`;
  });
  const total = useCount(res.total, true);

  return (
    <div
      className={`grid gap-5 border bg-surface/85 p-4 animate-[auIn_0.6s_ease-out_both] md:grid-cols-[240px_1fr] md:p-5 ${
        place === 1 ? `border-transparent ${SIDES[side].shadow}` : "border-line/10"
      }`}
      style={{ animationDelay: delay }}
    >
      <Pitch team={team} side={side} />
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className={`${FONT} text-xl font-bold uppercase ${SIDES[side].text}`}>{name}</span>
          {place === 1 && (
            <span
              className={`inline-flex items-center gap-1.5 bg-gold/15 px-2.5 py-1 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-gold-hi`}
            >
              <Trophy className="h-3.5 w-3.5" />
              {tr("Qalib")}
            </span>
          )}
        </div>
        <p className={`mt-2 ${FONT} text-5xl font-bold text-ink`}>
          {total}
          <span className="ml-2 text-sm font-normal text-faint">{tr("güc xalı")}</span>
        </p>
        <div className="mt-4 space-y-3">
          <Bar label={tr("Reytinq cəmi")} value={res.ratings} width={(res.ratings / 495) * 100} color={SIDES[side].bar} />
          <Bar label={tr("Kimya (eyni klub / ölkə)")} value={`+${res.chem}`} width={res.chem * 10} color="bg-good" />
          <Bar label={tr("Xərclənən")} value={money(res.spent)} width={(res.spent / BUDGET) * 100} color="bg-violet-400" />
        </div>
        <div className={`mt-4 space-y-1 border-t border-line/8 pt-3 ${FONT} text-sm leading-relaxed text-muted`}>
          {best && (
            <p>
              {tr("Ən sərfəli alış:")}{" "}
              <span className="font-bold text-gold-hi">
                {shortName(best.player.name)} · {money(best.price)}
              </span>{" "}
              ({best.rating})
            </p>
          )}
          {chemNotes.length ? (
            chemNotes.map((n) => <p key={n}>{tr("Kimya:")}{" "} {n}</p>)
          ) : (
            <p>{tr("Kimya bonusu yoxdur.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuctionResult({ data, state, names, solo, onAgain, onSettings }) {
  const res = { A: teamStrength(state.teams.A), B: teamStrength(state.teams.B) };
  const winner =
    res.A.total === res.B.total ? null : res.A.total > res.B.total ? "A" : "B";
  const title = !winner
    ? tr("Bərabərlik!")
    : solo
      ? winner === "A"
        ? tr("Sənin komandan daha güclüdür")
        : tr("Bot daha güclü komanda qurdu")
      : tr("{winner} qalib gəldi", { winner: names[winner] });
  const a = useCount(res.A.total, true);
  const b = useCount(res.B.total, true);

  return (
    <div>
      <div className="text-center animate-[auIn_0.5s_ease-out_both]">
        <p className={`${FONT} text-sm font-bold uppercase tracking-[0.28em] text-gold`}>
          {tr("Hərrac bitdi")}
        </p>
        <h2 className={`mt-2 ${FONT} text-3xl font-bold uppercase text-ink md:text-5xl`}>
          {title}
        </h2>
        <p className={`mt-2 ${FONT} text-sm text-muted`}>
          {tr("Reytinqlərin cəmi + kimya bonusu (eyni klub +2, eyni ölkə +1, maksimum +10)")}
        </p>
        <div className={`mt-4 flex items-center justify-center gap-6 ${FONT} font-bold`}>
          <span className={`text-5xl md:text-6xl ${SIDES.A.text}`}>{a}</span>
          <span className="text-sm tracking-[0.3em] text-dim">{"VS"}</span>
          <span className={`text-5xl md:text-6xl ${SIDES.B.text}`}>{b}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <TeamCard
          data={data}
          side="A"
          name={names.A}
          team={state.teams.A}
          res={res.A}
          place={winner === "A" ? 1 : 2}
          delay="150ms"
        />
        <TeamCard
          data={data}
          side="B"
          name={names.B}
          team={state.teams.B}
          res={res.B}
          place={winner === "B" ? 1 : 2}
          delay="300ms"
        />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onAgain} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          <RotateCcw className="h-4 w-4" />
          {tr("Yenidən oyna")}
        </button>
        <button type="button" onClick={onSettings} className={BTN_GHOST}>
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <Settings2 className="h-4 w-4" />
          {tr("Parametrlər")}
        </button>
      </div>
    </div>
  );
}
