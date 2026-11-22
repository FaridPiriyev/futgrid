import { useEffect, useMemo, useState } from "react";
import { Flag as FlagIcon, RotateCcw, Trophy } from "lucide-react";
import { answerOf, entityQuestion, pickSecret } from "../../../lib/games/questions";
import PlayerSearch from "../common/PlayerSearch";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { AnswerBoard, QuestionBank, RevealCard, SecretCard } from "./SualParts";

import { tr } from "../../../i18n";

const BEST_KEY = "futgrid:sual:best";
const LEVEL = { easy: "Asan", normal: "Normal", hard: "Çətin" };

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

export default function SualSolo({ data, settings }) {
  const max = settings.maxQuestions;
  const bestKey = `${settings.difficulty}-${settings.era}-${max}`;
  const [seen] = useState(() => new Set());
  const [secret, setSecret] = useState(() => pickSecret(data, settings));
  const [items, setItems] = useState([]);
  const [phase, setPhase] = useState("play");
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(0);
  const [best, setBest] = useState(() => readBest(bestKey));

  const used = items.filter((i) => i.answer !== null).length;
  const asked = useMemo(() => new Map(items.filter((i) => i.kind !== "guess").map((i) => [i.id, i.answer])), [items]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2400);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (phase === "play" && used >= max) setPhase("lost");
  }, [used, max, phase]);

  const ask = (q) => {
    if (phase !== "play") return;
    const question = q.type ? entityQuestion(q) : q;
    if (asked.has(question.id)) return;
    const answer = answerOf(question, secret, data);
    setItems((list) => [...list, { id: question.id, text: question.text, answer, kind: "q" }]);
    if (answer === null) setMessage({ bad: false, text: tr("Bu barədə məlumat yoxdur, sual sayılmadı.") });
  };

  const guess = (p) => {
    if (phase !== "play") return;
    if (p.id === secret.id) {
      const n = used + 1;
      setItems((list) => [...list, { id: `g-${p.id}`, text: tr("{name}?", { name: p.name }), answer: true, kind: "guess" }]);
      setPhase("won");
      if (!best || n < best) {
        writeBest(bestKey, n);
        setBest(n);
      }
      return;
    }
    setItems((list) => [...list, { id: `g-${p.id}`, text: tr("{name}?", { name: p.name }), answer: false, kind: "guess" }]);
    setMessage({ bad: true, text: tr("{name} deyil. Səhv təxmin də 1 sual sayılır.", { name: p.name }) });
    setShake((s) => s + 1);
  };

  const restart = () => {
    seen.add(secret.id);
    setSecret(pickSecret(data, settings, seen));
    setItems([]);
    setMessage(null);
    setPhase("play");
  };

  const left = Math.max(0, max - used);
  const playing = phase === "play";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        <section className="rounded-2xl border border-edge bg-surface p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SecretCard
              label={tr("Gizli futbolçu")}
              sub={tr("{level} · {n} sual qalıb", { level: tr(LEVEL[settings.difficulty]), n: left })}
            />
            <div className="flex flex-wrap items-center gap-3">
              {best > 0 && (
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-gold/12 px-3 py-1 ${FONT} text-xs font-black uppercase text-gold-hi`}>
                  <Trophy className="h-3.5 w-3.5" />
                  {tr("Rekord: {n} sual", { n: best })}
                </span>
              )}
              {playing && (
                <button type="button" onClick={() => setPhase("lost")} className={`inline-flex items-center gap-1.5 ${FONT} text-sm font-bold uppercase text-muted hover:text-bad`}>
                  <FlagIcon className="h-4 w-4" />
                  {tr("Təslim ol")}
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line/10">
            <span
              className={`block h-full rounded-full transition-[width] duration-500 ${left <= 3 ? "bg-bad" : "bg-accent"}`}
              style={{ width: `${(left / max) * 100}%` }}
            />
          </div>

          {playing ? (
            <>
              <div key={shake} className={`mt-4 ${shake ? "animate-[sqShake_0.35s_ease-out]" : ""}`}>
                <p className={`mb-1.5 ${FONT} text-[11px] font-black uppercase tracking-[0.2em] text-faint`}>{tr("Bildin? Adını yaz")}</p>
                <PlayerSearch data={data} onSelect={guess} focusKey={items.length} placeholder={tr("Təxminin: futbolçunun adı...")} />
              </div>
              <p className={`mt-2 min-h-5 ${FONT} text-sm font-bold ${message?.bad ? "text-bad" : "text-muted"}`}>
                {message?.text ?? tr("Sual seç: cavabı sistem dərhal verəcək.")}
              </p>
              <div className="mt-3 border-t border-edge pt-4">
                <QuestionBank data={data} asked={asked} onAsk={ask} />
              </div>
            </>
          ) : (
            <div className="mt-5 animate-[sqIn_0.35s_ease-out_both]">
              <p className={`${FONT} text-2xl font-black uppercase leading-tight md:text-3xl ${phase === "won" ? "text-good" : "text-bad"}`}>
                {phase === "won" ? tr("Tapdın! {n} sualda", { n: used }) : tr("Bu dəfə alınmadı")}
              </p>
              <p className={`mt-1 ${FONT} text-sm text-muted`}>{tr("Gizli futbolçu:")}</p>
              <div className="mt-3">
                <RevealCard data={data} player={secret} tone={phase === "won" ? "border-good" : "border-bad"} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={restart} className={BTN_PRIMARY}>
                  <span aria-hidden="true" className={SWEEP_WHITE} />
                  <RotateCcw className="h-4 w-4" />
                  {tr("Yeni futbolçu")}
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="lg:sticky lg:top-24">
          <AnswerBoard
            title={tr("Futbolçu təxmini")}
            items={items}
            used={used}
            max={max}
            empty={tr("Hələ sual verilməyib. Suallardan birini seç: məsələn, “Hücumçudur?”")}
          />
        </div>
      </div>
    </div>
  );
}

