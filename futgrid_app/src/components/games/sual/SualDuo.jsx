import { useEffect, useMemo, useRef, useState } from "react";
import { Check, EyeOff, RotateCcw, Shuffle, Trophy } from "lucide-react";
import { answerOf, entityQuestion, pickSecret } from "../../../lib/games/questions";
import { SIDES, otherSide } from "../ortaq/settings";
import PlayerSearch from "../common/PlayerSearch";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { AnswerBoard, QuestionBank, RevealCard } from "./SualParts";

import { tr } from "../../../i18n";

const usedOf = (list) => list.filter((i) => i.answer !== null).length;

function SecretPick({ data, settings, side, names, onDone }) {
  const [picked, setPicked] = useState(null);
  const opp = otherSide(side);
  const s = SIDES[side];
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-edge bg-surface p-5 animate-[sqIn_0.35s_ease-out_both] md:p-7">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${FONT} text-xs font-black uppercase tracking-wider ${s.solid}`}>
        <EyeOff className="h-3.5 w-3.5" />
        {tr("{name} ekrana baxmasın", { name: names[opp] })}
      </span>
      <h2 className={`mt-3 ${FONT} text-2xl font-black uppercase leading-tight md:text-3xl ${s.text}`}>
        {tr("{name}, gizli futbolçunu seç", { name: names[side] })}
      </h2>
      <p className={`mt-1 ${FONT} text-sm text-muted md:text-base`}>
        {tr("Seçdiyin futbolçunu {name} suallarla tapmağa çalışacaq.", { name: names[opp] })}
      </p>
      {picked ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-good/50 bg-good/8 px-4 py-3">
          <span className={`inline-flex items-center gap-2 ${FONT} text-base font-black uppercase text-good-hi`}>
            <Check className="h-5 w-5" />
            {tr("Futbolçu seçildi")}
            <span className="select-none tracking-[0.3em] text-ink blur-[5px]">{picked.name}</span>
          </span>
          <button type="button" onClick={() => setPicked(null)} className={`${FONT} text-sm font-bold uppercase text-muted hover:text-ink`}>
            {tr("Dəyiş")}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <PlayerSearch data={data} onSelect={setPicked} placeholder={tr("Futbolçunun adını yaz...")} />
          <button
            type="button"
            onClick={() => setPicked(pickSecret(data, settings))}
            className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-accent/60 px-3.5 py-1.5 ${FONT} text-sm font-bold text-accent hover:bg-accent/8`}
          >
            <Shuffle className="h-4 w-4" />
            {tr("Təsadüfi seç")}
          </button>
        </div>
      )}
      <button type="button" disabled={!picked} onClick={() => onDone(picked)} className={`${BTN_PRIMARY} mt-6 w-full`}>
        <span aria-hidden="true" className={SWEEP_WHITE} />
        {side === "A" ? tr("Təsdiqlə, sonra cihazı ver: {name}", { name: names[opp] }) : tr("Təsdiqlə və oyuna başla")}
      </button>
    </section>
  );
}

export function PlayerCard({ side, name, used, max, active, found, activeText }) {
  const s = SIDES[side];
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 rounded-xl border-2 bg-surface px-3 py-2 transition-[border-color,box-shadow] duration-300 md:px-4 md:py-3 ${
        side === "B" ? "flex-row-reverse text-right" : ""
      } ${active ? s.border : "border-edge"}`}
      style={active ? { boxShadow: `0 10px 24px -14px ${s.glow}` } : undefined}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${s.solid} ${FONT} text-base font-black md:h-10 md:w-10`}>
        {(name[0] ?? "?").toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className={`block truncate ${FONT} text-sm font-black uppercase leading-none text-ink md:text-lg`}>{name}</span>
        <span className={`mt-1 block ${FONT} text-[11px] text-muted md:text-xs`}>
          {found != null ? tr("{n} sualda tapdı", { n: found }) : active ? activeText ?? tr("növbə səndədir") : tr("{n}/{max} sual", { n: used, max })}
        </span>
      </span>
    </div>
  );
}

export default function SualDuo({ data, settings, names }) {
  const max = settings.maxQuestions;
  const [phase, setPhase] = useState("secretA");
  const [secrets, setSecrets] = useState({ A: null, B: null });
  const [items, setItems] = useState({ A: [], B: [] });
  const [turn, setTurn] = useState("A");
  const [found, setFound] = useState({ A: null, B: null });
  const [lock, setLock] = useState(false);
  const [message, setMessage] = useState(null);
  const [result, setResult] = useState(null);
  const [lastChance, setLastChance] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const asked = useMemo(() => new Map(items[turn].filter((i) => i.kind !== "guess").map((i) => [i.id, i.answer])), [items, turn]);
  const target = secrets[otherSide(turn)];

  const finish = (winner) => {
    setResult({ winner });
    setPhase("done");
  };

  const after = (side, nextItems, nextFound) => {
    const usedA = usedOf(nextItems.A);
    const usedB = usedOf(nextItems.B);
    const canA = usedA < max;
    const canB = usedB < max;
    if (side === "A") {
      if (nextFound.A != null) {
        if (canB) {
          setLastChance(true);
          return "B";
        }
        return finish("A");
      }
      if (canB) return "B";
      if (canA) return "A";
      return finish(null);
    }
    if (nextFound.A != null && nextFound.B != null) return finish(null);
    if (nextFound.A != null) return finish("A");
    if (nextFound.B != null) return finish("B");
    if (canA) return "A";
    if (canB) return "B";
    return finish(null);
  };

  const act = (entry, isFound) => {
    const nextItems = { ...items, [turn]: [...items[turn], entry] };
    const nextFound = isFound ? { ...found, [turn]: usedOf(nextItems[turn]) } : found;
    setItems(nextItems);
    setFound(nextFound);
    if (entry.answer === null) {
      setMessage({ tone: "muted", text: tr("Bu barədə məlumat yoxdur, sual sayılmadı. Yenə sən soruş.") });
      return;
    }
    setLock(true);
    setMessage({
      tone: entry.answer ? "good" : "bad",
      text: isFound
        ? tr("{name} tapdı!", { name: names[turn] })
        : `${entry.text} ${entry.answer ? tr("Bəli") : tr("Xeyr")}`,
    });
    timer.current = setTimeout(() => {
      setLock(false);
      setMessage(null);
      const next = after(turn, nextItems, nextFound);
      if (next) setTurn(next);
    }, 1300);
  };

  const ask = (q) => {
    if (lock || phase !== "play") return;
    const question = q.type ? entityQuestion(q) : q;
    if (asked.has(question.id)) return;
    act({ id: question.id, text: question.text, answer: answerOf(question, target, data), kind: "q" }, false);
  };

  const guess = (p) => {
    if (lock || phase !== "play") return;
    const ok = p.id === target.id;
    act({ id: `g-${p.id}`, text: tr("{name}?", { name: p.name }), answer: ok, kind: "guess" }, ok);
  };

  const restart = () => {
    setSecrets({ A: null, B: null });
    setItems({ A: [], B: [] });
    setFound({ A: null, B: null });
    setTurn("A");
    setResult(null);
    setLastChance(false);
    setMessage(null);
    setPhase("secretA");
  };

  if (phase === "secretA" || phase === "secretB") {
    const side = phase === "secretA" ? "A" : "B";
    return (
      <SecretPick
        key={side}
        data={data}
        settings={settings}
        side={side}
        names={names}
        onDone={(p) => {
          setSecrets((s) => ({ ...s, [side]: p }));
          setPhase(side === "A" ? "secretB" : "play");
        }}
      />
    );
  }

  const s = SIDES[turn];
  const opp = otherSide(turn);
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
        <PlayerCard side="A" name={names.A} used={usedOf(items.A)} max={max} active={phase === "play" && turn === "A"} found={found.A} />
        <span className={`${FONT} text-xl font-black text-faint md:text-3xl`}>VS</span>
        <PlayerCard side="B" name={names.B} used={usedOf(items.B)} max={max} active={phase === "play" && turn === "B"} found={found.B} />
      </div>

      {phase === "play" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
          <section key={turn} className={`rounded-2xl border-2 bg-surface p-4 animate-[sqIn_0.3s_ease-out_both] md:p-5 ${s.border}`}>
            <h2 className={`${FONT} text-xl font-black uppercase leading-tight md:text-2xl ${s.text}`}>
              {lastChance ? tr("{name}, son şansın!", { name: names[turn] }) : tr("Növbə: {name}", { name: names[turn] })}
            </h2>
            <p className={`mt-1 ${FONT} text-sm text-muted`}>
              {lastChance
                ? tr("{name} tapdı. Bu növbədə sən də tapsan, heç-heçə olacaq.", { name: names[opp] })
                : tr("Rəqibin ({name}) gizli futbolçusunu tap: bir sual ver və ya adını yaz.", { name: names[opp] })}
            </p>
            <div className="mt-4">
              <PlayerSearch data={data} onSelect={guess} disabled={lock} focusKey={`${turn}-${items[turn].length}`} placeholder={tr("Təxminin: futbolçunun adı...")} />
            </div>
            <p
              className={`mt-2 min-h-5 ${FONT} text-sm font-bold ${
                message?.tone === "good" ? "text-good" : message?.tone === "bad" ? "text-bad" : "text-muted"
              }`}
            >
              {message?.text ?? tr("Səhv təxmin də 1 sual sayılır.")}
            </p>
            <div className="mt-3 border-t border-edge pt-4">
              <QuestionBank data={data} asked={asked} onAsk={ask} disabled={lock} accent={s.border} />
            </div>
          </section>
          <div className="grid grid-cols-1 gap-3 lg:sticky lg:top-24">
            {["A", "B"].map((side) => (
              <AnswerBoard
                key={side}
                compact
                title={tr("Suallar · {name}", { name: names[side] })}
                accent={side === "A" ? "text-accent-hi" : "text-yellow"}
                items={items[side]}
                used={usedOf(items[side])}
                max={max}
                active={turn === side}
                empty={tr("Hələ sual yoxdur.")}
              />
            ))}
          </div>
        </div>
      ) : (
        <section className="mt-4 rounded-2xl border border-edge bg-surface p-5 text-center animate-[sqIn_0.35s_ease-out_both] md:p-7">
          <Trophy className={`mx-auto h-9 w-9 ${result?.winner ? SIDES[result.winner].text : "text-muted"}`} />
          <p className={`mt-2 ${FONT} text-3xl font-black uppercase leading-none md:text-4xl ${result?.winner ? SIDES[result.winner].text : "text-ink"}`}>
            {result?.winner ? tr("{name} qalib gəldi!", { name: names[result.winner] }) : tr("Heç-heçə!")}
          </p>
          <p className={`mt-2 ${FONT} text-base text-muted`}>
            {["A", "B"]
              .map((side) => (found[side] != null ? tr("{name}: {n} sualda tapdı", { name: names[side], n: found[side] }) : tr("{name}: tapa bilmədi", { name: names[side] })))
              .join(" · ")}
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 text-left md:grid-cols-2">
            {["A", "B"].map((side) => (
              <div key={side}>
                <p className={`mb-1.5 ${FONT} text-xs font-black uppercase tracking-[0.18em] ${SIDES[side].text}`}>
                  {tr("Gizli futbolçu · {name}", { name: names[side] })}
                </p>
                <RevealCard data={data} player={secrets[side]} tone={SIDES[side].border} />
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={restart} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              {tr("Yenidən oyna")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

