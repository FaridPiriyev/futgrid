import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronRight, Eye, RotateCcw, X } from "lucide-react";
import { careerPath } from "../../../lib/games/career";
import { checkClub, nextEmpty, orderPool, pickPlayers } from "../../../lib/games/clubOrder";
import { POS_NAME, ageOf, countryOf } from "../../../lib/games/playerInfo";
import ClubBadge from "../common/ClubBadge";
import EntitySearch from "../common/EntitySearch";
import PlayerAvatar, { Flag } from "../common/PlayerAvatar";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";

import { tr } from "../../../i18n";
export const ORDER_KEYFRAMES = `
@keyframes coIn { from { opacity: 0; transform: translateY(16px) scale(.94); } to { opacity: 1; transform: none; } }
@keyframes coHit { 0% { transform: scale(.7); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }
@keyframes coShake { 0%,100% { transform: translateX(0); } 25%,75% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
@keyframes coPulse { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--fg-accent) 45%, transparent); } 50% { box-shadow: 0 0 0 8px transparent; } }
`;

function Slot({ step, index, state, active, showYears, onPick, roundKey }) {
  const filled = state === "hit" || state === "lost";
  return (
    <div className="flex items-center">
      {index > 0 && (
        <span className="mx-0.5 flex items-center text-accent md:mx-1.5">
          <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
        </span>
      )}
      <button
        key={`${roundKey}-${state}`}
        type="button"
        disabled={filled}
        onClick={onPick}
        aria-pressed={active}
        aria-label={tr("Qutu {n}", { n: index + 1 })}
        className={`relative flex w-[4.6rem] flex-col items-center overflow-hidden rounded-xl border-2 bg-surface pb-1.5 transition-[border-color,translate,background-color] duration-200 sm:w-24 md:w-28 ${
          state === "hit"
            ? "border-good animate-[coHit_0.4s_ease-out]"
            : state === "lost"
              ? "border-bad/70 opacity-80"
              : active
                ? "-translate-y-1 border-accent bg-accent/5 animate-[coPulse_1.6s_ease-in-out_infinite]"
                : "border-dashed border-edge hover:-translate-y-0.5 hover:border-accent/50"
        }`}
      >
        <span
          className={`absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full ${FONT} text-[11px] font-black ${
            state === "hit"
              ? "bg-good text-white"
              : state === "lost"
                ? "bg-bad text-white"
                : active
                  ? "bg-accent text-white"
                  : "bg-page-2 text-muted"
          }`}
        >
          {state === "hit" ? <Check className="h-3 w-3" strokeWidth={3.5} /> : state === "lost" ? <X className="h-3 w-3" strokeWidth={3.5} /> : index + 1}
        </span>
        <span className="flex h-20 w-full items-center justify-center md:h-24">
          {filled ? (
            <ClubBadge club={step.club} compact />
          ) : (
            <span className={`${FONT} text-3xl font-black ${active ? "text-accent" : "text-dim"}`}>?</span>
          )}
        </span>
        <span className={`${FONT} text-[11px] font-bold tracking-wide md:text-xs ${active ? "text-accent" : "text-muted"}`}>
          {showYears || filled ? step.years ?? "—" : "····"}
        </span>
      </button>
    </div>
  );
}

function Summary({ results, onAgain }) {
  const score = results.reduce((s, r) => s + r.found, 0);
  const total = results.reduce((s, r) => s + r.total, 0);
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-edge bg-surface p-5 text-center animate-[coIn_0.4s_ease-out_both] md:p-8">
      <p className={`${FONT} text-sm font-bold uppercase tracking-[0.2em] text-accent`}>{tr("Oyun bitdi")}</p>
      <p className={`mt-2 ${FONT} text-5xl font-black text-ink`}>
        {score}
        <span className="text-xl text-faint"> / {total}</span>
      </p>
      <p className={`${FONT} text-sm text-muted`}>{tr("düzgün yerləşdirilən klub")}</p>
      <ul className="mt-6 space-y-2 text-left">
        {results.map((r, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-edge px-3 py-2">
            <PlayerAvatar player={r.player} className="h-8 w-8" textClass="text-[10px]" />
            <span className={`flex-1 truncate ${FONT} text-base font-bold text-ink`}>{r.player.name}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 ${FONT} text-sm font-black ${
                r.found === r.total ? "bg-good text-white" : r.found ? "bg-accent/10 text-accent" : "bg-bad/10 text-bad"
              }`}
            >
              {r.found}/{r.total}
            </span>
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

export default function ClubOrderGame({ data, difficulty, lives, showYears }) {
  const pool = useMemo(() => orderPool(data, difficulty), [data, difficulty]);
  const [players, setPlayers] = useState(() => pickPlayers(pool));
  const [idx, setIdx] = useState(0);
  const [filled, setFilled] = useState([]);
  const [active, setActive] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [status, setStatus] = useState("play");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);

  const target = players[idx];
  const path = useMemo(() => (target ? careerPath(data, target) : []), [data, target]);

  useEffect(() => {
    setFilled(Array(path.length).fill(false));
    setActive(0);
    setMistakes(0);
    setStatus("play");
    setMessage(null);
  }, [path]);

  const score = results.reduce((s, r) => s + r.found, 0);
  const found = filled.filter(Boolean).length;
  const limited = lives > 0;
  const left = limited ? Math.max(0, lives - mistakes) : null;

  const restart = () => {
    setPlayers(pickPlayers(pool));
    setIdx(0);
    setResults([]);
  };

  if (!target) return <Summary results={results} onAgain={restart} />;
  if (filled.length !== path.length) return null;

  const finish = (nextFilled) => {
    const n = nextFilled.filter(Boolean).length;
    setResults((r) => [...r, { player: target, found: n, total: path.length }]);
    setStatus(n === path.length ? "won" : "lost");
  };

  const fail = (text) => {
    setMessage({ type: "bad", text });
    setShake((s) => s + 1);
    const m = mistakes + 1;
    setMistakes(m);
    if (limited && m >= lives) finish(filled);
  };

  const pick = (entity) => {
    if (status !== "play" || active === null) return;
    const club = entity.club;
    const res = checkClub(path, filled, active, club.id);
    if (res.type === "hit") {
      const next = filled.map((v, i) => (i === active ? true : v));
      setFilled(next);
      setMessage({ type: "ok", text: tr("{club} — düzdür!", { club: club.name }) });
      if (next.every(Boolean)) finish(next);
      else setActive(nextEmpty(next, active + 1));
      return;
    }
    if (res.type === "used") {
      setMessage({ type: "info", text: tr("{club} artıq yerləşdirilib", { club: club.name }) });
      return;
    }
    if (res.type === "elsewhere")
      return fail(tr("{club} onun karyerasında var, amma başqa qutuda", { club: club.name }));
    fail(tr("{club} onun karyerasında yoxdur", { club: club.name }));
  };

  const country = countryOf(data, target);
  const age = ageOf(target);
  const slotState = (i) => (filled[i] ? "hit" : status !== "play" ? "lost" : "empty");

  const next = () => setIdx((i) => i + 1);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
          {tr("Raund")}{" "}<span className="font-bold text-ink">{idx + 1}</span> / {players.length}
          <span className="mx-2 text-dim">·</span>
          {tr("Xal")}{" "}<span className="font-bold text-ink">{score + (status === "play" ? found : 0)}</span>
        </p>
        {limited ? (
          <div className="flex items-center gap-1.5" aria-label={tr("Qalan cəhd")}>
            {Array.from({ length: lives }, (_, i) => (
              <span key={i} className={`h-2.5 w-6 rounded-full ${i < left ? "bg-accent" : "bg-line/15"}`} />
            ))}
          </div>
        ) : (
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
            {tr("Səhv")}{" "}<span className="font-bold text-ink">{mistakes}</span>
          </p>
        )}
      </div>

      <div
        key={target.id}
        className="mx-auto mt-5 flex max-w-2xl items-center gap-4 rounded-2xl border border-edge bg-surface p-4 shadow-[0_30px_60px_-44px_var(--fg-shadow)] animate-[coIn_0.45s_ease-out_both] md:p-5"
      >
        <PlayerAvatar player={target} className="h-16 w-16 md:h-20 md:w-20" textClass="text-xl" />
        <div className="min-w-0 flex-1">
          <p className={`${FONT} text-xs font-bold uppercase tracking-[0.2em] text-accent`}>{tr("Bu futbolçunun klubları")}</p>
          <p className={`break-words ${FONT} text-xl font-black uppercase leading-tight text-ink sm:text-2xl md:text-3xl`}>{target.name}</p>
          <p className={`mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 ${FONT} text-sm text-muted`}>
            {country && (
              <span className="inline-flex items-center gap-1.5">
                <Flag country={country} />
                {country.name}
              </span>
            )}
            {POS_NAME[target.position] && <span>{POS_NAME[target.position]}</span>}
            {age && <span>{tr("{n} yaş", { n: age })}</span>}
          </p>
        </div>
        <span className={`hidden shrink-0 rounded-full bg-yellow px-3 py-1 ${FONT} text-sm font-black uppercase text-on-yellow sm:inline`}>
          {tr("{n} klub", { n: path.length })}
        </span>
      </div>

      <ol className={`mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2 ${FONT} text-xs font-bold uppercase tracking-wide`}>
        <li className="rounded-full bg-accent px-3 py-1 text-white">{tr("1 · Qutunu seç")}</li>
        <li className="rounded-full bg-page-2 px-3 py-1 text-muted">{tr("2 · O sıradakı klubu yaz")}</li>
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-y-3">
        {path.map((step, i) => (
          <Slot
            key={i}
            step={step}
            index={i}
            roundKey={target.id}
            state={slotState(i)}
            active={status === "play" && active === i}
            showYears={showYears}
            onPick={() => status === "play" && setActive(i)}
          />
        ))}
      </div>

      <div className="mx-auto mt-6 max-w-2xl">
        {status === "play" ? (
          <>
            <div key={shake} className={shake ? "animate-[coShake_0.35s_ease-out]" : ""}>
              <EntitySearch
                data={data}
                types={["club"]}
                onSelect={pick}
                focusKey={`${target.id}-${active}`}
                placeholder={tr("Qutu {n}: klubu yaz...", { n: (active ?? 0) + 1 })}
              />
            </div>
            <div className="mt-2 flex min-h-7 items-center justify-between gap-3">
              {message ? (
                <p
                  key={message.text + shake}
                  className={`${FONT} text-sm font-bold animate-[coIn_0.2s_ease-out] ${
                    message.type === "ok" ? "text-good" : message.type === "bad" ? "text-bad" : "text-muted"
                  }`}
                >
                  {message.text}
                </p>
              ) : (
                <span className={`${FONT} text-sm text-faint`}>{tr("{found} / {total} klub tapıldı", { found, total: path.length })}</span>
              )}
              <button
                type="button"
                onClick={() => finish(filled)}
                className={`inline-flex shrink-0 items-center gap-1.5 ${FONT} text-sm font-bold uppercase tracking-wide text-muted hover:text-ink`}
              >
                <Eye className="h-4 w-4" />
                {tr("Cavabı göstər")}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-edge bg-surface p-5 text-center animate-[coIn_0.4s_ease-out_both] sm:flex-row sm:text-left">
            <div className="flex-1">
              <p className={`${FONT} text-sm font-bold uppercase tracking-[0.2em] ${status === "won" ? "text-good" : "text-bad"}`}>
                {status === "won" ? tr("Əla! Bütün klublar yerində") : tr("Raund bitdi")}
              </p>
              <p className={`${FONT} text-2xl font-black uppercase text-ink`}>
                {tr("+{n} xal", { n: found })}
                <span className="ml-2 text-base font-bold text-muted normal-case">{found} / {path.length}</span>
              </p>
            </div>
            <button type="button" onClick={next} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              {idx + 1 < players.length ? tr("Növbəti") : tr("Nəticə")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
