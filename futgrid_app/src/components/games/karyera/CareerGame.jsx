import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronRight, Lightbulb, RotateCcw, SkipForward, X } from "lucide-react";
import {
  MAX_WRONG,
  careerPath,
  careerPool,
  pathKey,
  pickRounds,
  roundPoints,
} from "../../../lib/games/career";
import { POS_NAME, countryOf } from "../../../lib/games/playerInfo";
import ClubBadge from "../common/ClubBadge";
import PlayerAvatar, { Flag } from "../common/PlayerAvatar";
import PlayerSearch from "../common/PlayerSearch";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";

import { tr } from "../../../i18n";
export const CAREER_KEYFRAMES = `
@keyframes kyIn { from { opacity: 0; transform: translateY(16px) scale(.95); } to { opacity: 1; transform: none; } }
@keyframes kyLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes kyShake { 0%,100% { transform: translateX(0); } 25%,75% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
`;

const birthDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return day && m ? `${day}.${m}.${y}` : y;
};

const initialsOf = (name) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => `${w[0]?.toUpperCase() ?? ""}.`)
    .join(" ");

function Chain({ path, roundKey }) {
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-y-3">
      {path.map((step, i) => (
        <div key={`${roundKey}-${i}`} className="flex items-center">
          {i > 0 && (
            <span
              className="mx-1 flex items-center text-accent animate-[kyIn_0.4s_ease-out_both] md:mx-2"
              style={{ animationDelay: `${i * 140 - 60}ms` }}
            >
              <ChevronRight className="h-5 w-5" />
            </span>
          )}
          <div
            className="flex w-24 flex-col items-center border border-line/10 bg-surface pb-2 animate-[kyIn_0.45s_cubic-bezier(.2,.8,.2,1)_both] md:w-32"
            style={{ animationDelay: `${i * 140}ms` }}
          >
            <span className="flex h-24 w-full md:h-28">
              <ClubBadge club={step.club} compact />
            </span>
            <span className={`${FONT} text-xs font-bold tracking-wide text-accent`}>
              {step.years ?? "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Summary({ results, score, onAgain }) {
  return (
    <div className="mx-auto max-w-2xl border border-line/10 bg-surface p-5 text-center animate-[kyIn_0.4s_ease-out_both] md:p-8">
      <p className={`${FONT} text-sm font-bold uppercase tracking-[0.2em] text-accent`}>{tr("Oyun bitdi")}</p>
      <p className={`mt-2 ${FONT} text-5xl font-bold text-ink`}>
        {score}
        <span className="text-xl text-faint"> / {results.length * 3}</span>
      </p>
      <ul className="mt-6 space-y-2 text-left">
        {results.map((r, i) => (
          <li key={i} className="flex items-center gap-3 border border-line/10 px-3 py-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center ${r.points ? "bg-good-lo text-white" : "bg-bad-lo text-white"}`}
            >
              {r.points ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </span>
            <span className={`flex-1 ${FONT} text-base font-bold text-ink`}>{r.player.name}</span>
            <span className={`${FONT} text-sm font-bold text-muted`}>+{r.points}</span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onAgain} className={`${BTN_PRIMARY} mt-6`}>
        <span aria-hidden="true" className={SWEEP_WHITE} />
        <RotateCcw className="h-4 w-4" />
        {tr("Yenidən oyna")}
      </button>
    </div>
  );
}

export default function CareerGame({ data, difficulty }) {
  const pool = useMemo(() => careerPool(data, difficulty), [data, difficulty]);
  const [rounds, setRounds] = useState(() => pickRounds(pool));
  const [idx, setIdx] = useState(0);
  const [hints, setHints] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [status, setStatus] = useState("play");
  const [results, setResults] = useState([]);
  const [shake, setShake] = useState(0);

  const target = rounds[idx];
  const path = useMemo(() => (target ? careerPath(data, target) : []), [data, target]);
  const score = results.reduce((s, r) => s + r.points, 0);

  function restart() {
    setRounds(pickRounds(pool));
    setIdx(0);
    setHints(0);
    setWrong([]);
    setStatus("play");
    setResults([]);
  }

  if (!target) return <Summary results={results} score={score} onAgain={restart} />;

  const key = pathKey(data, target);
  const country = countryOf(data, target);
  const hintList = [
    { label: tr("Doğum tarixi"), value: birthDate(target.birth_date) },
    {
      label: tr("Ölkə"),
      value: country ? (
        <span className="inline-flex items-center gap-1.5">
          <Flag key={country.code} country={country} />
          {country.name}
        </span>
      ) : (
        "—"
      ),
    },
    { label: tr("Mövqe"), value: POS_NAME[target.position] ?? "—" },
    { label: tr("Baş hərflər"), value: initialsOf(target.name) },
  ];

  const finish = (points) => {
    setResults((r) => [...r, { player: target, points }]);
    setStatus(points ? "right" : "lost");
  };

  const guess = (p) => {
    if (status !== "play") return;
    if (pathKey(data, p) === key) return finish(roundPoints(hints));
    const next = [...wrong, p];
    setWrong(next);
    setShake((s) => s + 1);
    if (next.length >= MAX_WRONG) finish(0);
  };

  const next = () => {
    setIdx((i) => i + 1);
    setHints(0);
    setWrong([]);
    setStatus("play");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
          {tr("Raund")}{" "} <span className="font-bold text-ink">{idx + 1}</span> / {rounds.length}
          <span className="mx-2 text-dim">·</span>
          {tr("Xal")}{" "} <span className="font-bold text-ink">{score}</span>
        </p>
        <div className="flex items-center gap-1.5" aria-label={tr("Qalan cəhd")}>
          {Array.from({ length: MAX_WRONG }, (_, i) => (
            <span key={i} className={`h-2.5 w-6 ${i < MAX_WRONG - wrong.length ? "bg-accent" : "bg-line/15"}`} />
          ))}
        </div>
      </div>

      <h2 className={`mt-5 text-center ${FONT} text-xl font-bold uppercase text-ink md:text-2xl`}>
        {tr("Bu karyera kimindir?")}
      </h2>
      <div className="mt-5">
        <Chain path={path} roundKey={idx} />
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        {status === "play" ? (
          <>
            <div key={shake} className={shake ? "animate-[kyShake_0.35s_ease-out]" : ""}>
              <PlayerSearch data={data} onSelect={guess} focusKey={idx} placeholder={tr("Futbolçunun adını yaz...")} />
            </div>
            {wrong.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {wrong.map((p) => (
                  <span key={p.id} className={`inline-flex items-center gap-1.5 border border-bad/40 bg-bad/10 px-2.5 py-1 ${FONT} text-sm text-bad-hi line-through`}>
                    {p.name}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {hintList.map((h, i) =>
                i < hints ? (
                  <div key={h.label} className={`rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5 ${FONT} text-sm animate-[kyIn_0.3s_ease-out_both]`}>
                    <span className="block text-xs uppercase tracking-wider text-muted">{h.label}</span>
                    <span className="font-bold text-ink">{h.value}</span>
                  </div>
                ) : (
                  <button
                    key={h.label}
                    type="button"
                    disabled={i !== hints}
                    onClick={() => setHints((n) => n + 1)}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-edge px-3 py-2.5 ${FONT} text-sm font-bold uppercase tracking-wide text-muted transition-colors duration-200 enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-40`}
                  >
                    <Lightbulb className="h-4 w-4" />
                    {h.label}
                  </button>
                ),
              )}
            </div>
            <div className="mt-4 flex justify-between gap-3">
              <p className={`${FONT} text-sm text-faint`}>
                {tr("İndi düzgün cavab:")}{" "} <span className="font-bold text-ink">{tr("+{n} xal", { n: roundPoints(hints) })}</span>
              </p>
              <button type="button" onClick={() => finish(0)} className={`inline-flex items-center gap-1.5 ${FONT} text-sm font-bold uppercase tracking-wide text-muted hover:text-ink`}>
                <SkipForward className="h-4 w-4" />
                {tr("Bilmirəm")}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 border border-line/10 bg-surface p-5 text-center animate-[kyIn_0.4s_ease-out_both] sm:flex-row sm:text-left">
            <PlayerAvatar player={target} className="h-16 w-16" textClass="text-xl" />
            <div className="flex-1">
              <p className={`${FONT} text-sm font-bold uppercase tracking-[0.2em] ${status === "right" ? "text-good" : "text-bad"}`}>
                {status === "right" ? tr("Düzdür! +{points} xal", { points: results[results.length - 1]?.points }) : tr("Cavab")}
              </p>
              <p className={`${FONT} text-2xl font-bold uppercase text-ink`}>{target.name}</p>
            </div>
            <button type="button" onClick={next} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              {idx + 1 < rounds.length ? tr("Növbəti") : tr("Nəticə")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

