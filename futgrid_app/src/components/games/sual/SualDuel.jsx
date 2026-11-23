import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Shuffle, Timer } from "lucide-react";
import { useDuelRoom, duelErrorText } from "../../../lib/games/useDuelRoom";
import { QUESTIONS } from "../../../lib/games/questions";
import { countryName } from "../../../lib/games/x0xCategories";
import { SIDES } from "../ortaq/settings";
import PlayerSearch from "../common/PlayerSearch";
import DuelLobby from "../common/DuelLobby";
import OnlineSetup from "../common/OnlineSetup";
import { Field, Segmented } from "../common/controls";
import { DuelFooter, nameOf, stepKeyOf, useDuelClock, useStepFeedback } from "../common/DuelKit";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { AnswerBoard, QuestionBank, RevealCard } from "./SualParts";
import { PlayerCard } from "./SualDuo";
import { ERAS, LEVELS, LIMITS } from "./options";
import { tr } from "../../../i18n";

const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? String(value);
const usedOf = (list) => list.filter((i) => i.answer !== null).length;

export function sualSummary(settings) {
  if (!settings) return [];
  return [
    { label: tr("Sual limiti"), value: labelOf(LIMITS, settings.maxQuestions) },
    { label: tr("Çətinlik"), value: labelOf(LEVELS, settings.difficulty) },
    { label: tr("Dövr"), value: labelOf(ERAS, settings.era) },
  ];
}

/** Serverdəki sual ID-sindən mətn (klub/ölkə sualları da daxil). */
function questionText(data, id) {
  const fixed = QUESTIONS.get(id);
  if (fixed) return fixed.text;
  const [type, value] = id.split(":");
  if (type === "club") {
    const club = data.clubsById.get(Number(value));
    return tr("{club} klubunda oynayıb?", { club: club?.name ?? value });
  }
  if (type === "country") return tr("{country} futbolçusudur?", { country: countryName(value, data) ?? value });
  return id;
}

function itemsFor(data, list) {
  return (list ?? []).map((item) => ({
    id: item.id,
    kind: item.kind === "guess" ? "guess" : "q",
    answer: item.answer,
    text:
      item.kind === "guess"
        ? tr("{name}?", { name: data.playersById.get(item.playerId)?.name ?? "?" })
        : item.kind === "timeout"
          ? tr("Vaxt bitdi")
          : questionText(data, item.id),
  }));
}

function Setup({ settings, onChange, create, connected, onBack }) {
  const set = (key) => (value) => onChange({ ...settings, [key]: value });
  return (
    <OnlineSetup
      sub={tr("Hər biriniz rəqibi üçün gizli futbolçu seçir. Növbə ilə sual verirsiniz, cavabları sistem verir. Rəqibinin futbolçusunu daha az sualla tapan qalib gəlir.")}
      onCreate={() => create({ difficulty: settings.difficulty, era: settings.era, maxQuestions: settings.maxQuestions })}
      onBack={onBack}
      connected={connected}
    >
      <Field label={tr("Çətinlik")} hint={tr("təsadüfi seçim üçün")}>
        <Segmented label={tr("Çətinlik")} options={LEVELS} value={settings.difficulty} onChange={set("difficulty")} />
      </Field>
      <Field label={tr("Dövr")}>
        <Segmented label={tr("Dövr")} options={ERAS} value={settings.era} onChange={set("era")} />
      </Field>
      <Field label={tr("Sual limiti")}>
        <Segmented label={tr("Sual limiti")} options={LIMITS} value={settings.maxQuestions} onChange={set("maxQuestions")} />
      </Field>
    </OnlineSetup>
  );
}

function SecretPick({ data, names, chosen, onPick, onRandom, oppChosen, left }) {
  const [picked, setPicked] = useState(null);
  const s = SIDES.A;
  if (chosen)
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-edge bg-surface p-5 text-center animate-[sqIn_0.35s_ease-out_both] md:p-7">
        <p className={`inline-flex items-center gap-2 ${FONT} text-lg font-black uppercase text-good-hi`}>
          <Check className="h-5 w-5" />
          {tr("Futbolçu seçildi")}
        </p>
        <p className={`mt-1 ${FONT} text-sm text-muted`}>
          {oppChosen ? tr("Oyun başlayır…") : tr("{name} sənin üçün gizli futbolçu seçir…", { name: names.B })}
        </p>
      </section>
    );
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-edge bg-surface p-5 animate-[sqIn_0.35s_ease-out_both] md:p-7">
      <div className="flex items-start justify-between gap-3">
        <h2 className={`${FONT} text-2xl font-black uppercase leading-tight md:text-3xl ${s.text}`}>{tr("{name}, gizli futbolçunu seç", { name: names.A })}</h2>
        {left != null ? (
          <span className={`inline-flex shrink-0 items-center gap-1 ${FONT} text-sm font-black tabular-nums ${left <= 10 ? "text-bad" : "text-muted"}`}>
            <Timer className="h-4 w-4" />
            {left}
          </span>
        ) : null}
      </div>
      <p className={`mt-1 ${FONT} text-sm text-muted md:text-base`}>{tr("Seçdiyin futbolçunu {name} suallarla tapmağa çalışacaq.", { name: names.B })}</p>
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
            onClick={onRandom}
            className={`inline-flex items-center gap-1.5 rounded-full border border-dashed border-accent/60 px-3.5 py-1.5 ${FONT} text-sm font-bold text-accent hover:bg-accent/8`}
          >
            <Shuffle className="h-4 w-4" />
            {tr("Təsadüfi seç")}
          </button>
        </div>
      )}
      <button type="button" disabled={!picked} onClick={() => onPick(picked)} className={`${BTN_PRIMARY} mt-6 w-full`}>
        <span aria-hidden="true" className={SWEEP_WHITE} />
        {tr("Təsdiqlə və oyuna başla")}
      </button>
    </section>
  );
}

function Match({ duel, data }) {
  const settings = duel.room?.settings ?? {};
  const state = duel.room?.state ?? {};
  const playing = duel.room?.status === "playing";
  const now = useDuelClock(duel, playing, 250);
  const [error, setError] = useStepFeedback(stepKeyOf(state));

  const me = duel.myId;
  const opp = duel.opponent?.id;
  const names = { A: nameOf(duel.me), B: nameOf(duel.opponent) };
  const max = state.max ?? settings.maxQuestions ?? 20;
  const phase = state.phase;
  const items = { A: state.items?.[me] ?? [], B: state.items?.[opp] ?? [] };
  const found = { A: state.found?.[me] ?? null, B: state.found?.[opp] ?? null };
  const myTurn = playing && phase === "play" && state.turn === me;
  const left = playing && state.deadline ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null;
  const asked = useMemo(() => new Map(items.A.filter((i) => i.kind === "q").map((i) => [i.id, i.answer])), [items.A]);
  const finished = !playing && duel.room?.status === "finished";

  const send = async (payload) => {
    const res = await duel.move(payload);
    if (res?.error) setError(duelErrorText(res.error.code));
  };

  const e = state.lastEvent;
  const fresh = e && now - (e.at ?? 0) < 2600;
  let message = error ? { tone: "bad", text: error } : null;
  if (!message && fresh && phase === "play" && e.seat) {
    const who = e.seat === me ? names.A : names.B;
    if (e.type === "ask") {
      const text = questionText(data, e.questionId);
      message =
        e.answer === null
          ? { tone: "muted", text: tr("Bu barədə məlumat yoxdur, sual sayılmadı. Yenə sən soruş.") }
          : { tone: e.answer ? "good" : "bad", text: `${who}: ${text} ${e.answer ? tr("Bəli") : tr("Xeyr")}` };
    } else if (e.type === "wrong") message = { tone: "bad", text: tr("{who}: {name}? Xeyr", { who, name: e.name }) };
    else if (e.type === "found") message = { tone: "good", text: tr("{name} tapdı!", { name: who }) };
    else if (e.type === "timeout") message = { tone: "bad", text: tr("{who}: vaxt bitdi — 1 sual yandı", { who }) };
  }

  const ask = (q) => {
    if (!myTurn) return;
    const id = q.type ? q.key : q.id;
    if (asked.has(id)) return;
    void send({ action: "ask", questionId: id });
  };

  if (phase === "secret" && playing)
    return (
      <SecretPick
        data={data}
        names={names}
        chosen={Boolean(state.chosen?.[me])}
        oppChosen={Boolean(state.chosen?.[opp])}
        left={left}
        onPick={(p) => void send({ action: "secret", playerId: p.id })}
        onRandom={() => void send({ action: "secret", random: true })}
      />
    );

  const activeSide = state.turn === me ? "A" : "B";
  const s = SIDES[myTurn ? "A" : "B"];
  const secrets = state.secrets;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-4">
        <PlayerCard side="A" name={names.A} used={usedOf(items.A)} max={max} active={phase === "play" && activeSide === "A"} found={found.A} />
        <span className={`${FONT} text-xl font-black text-faint md:text-3xl`}>VS</span>
        <PlayerCard side="B" name={names.B} used={usedOf(items.B)} max={max} active={phase === "play" && activeSide === "B"} found={found.B} activeText={tr("sual verir…")} />
      </div>

      {!finished ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
          <section key={state.turn} className={`rounded-2xl border-2 bg-surface p-4 animate-[sqIn_0.3s_ease-out_both] md:p-5 ${s.border}`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={`${FONT} text-xl font-black uppercase leading-tight md:text-2xl ${s.text}`}>
                {myTurn
                  ? state.lastChance
                    ? tr("{name}, son şansın!", { name: names.A })
                    : tr("Növbə: {name}", { name: names.A })
                  : tr("Növbə: {name}", { name: names.B })}
              </h2>
              {left != null ? (
                <span className={`inline-flex shrink-0 items-center gap-1 ${FONT} text-sm font-black tabular-nums ${left <= 10 ? "text-bad" : "text-muted"}`}>
                  <Timer className="h-4 w-4" />
                  {left}
                </span>
              ) : null}
            </div>
            <p className={`mt-1 ${FONT} text-sm text-muted`}>
              {myTurn
                ? state.lastChance
                  ? tr("{name} tapdı. Bu növbədə sən də tapsan, heç-heçə olacaq.", { name: names.B })
                  : tr("Rəqibin ({name}) gizli futbolçusunu tap: bir sual ver və ya adını yaz.", { name: names.B })
                : tr("{name} sual verir. Növbə sənə keçəndə soruşa biləcəksən.", { name: names.B })}
            </p>
            <div className="mt-4">
              <PlayerSearch
                data={data}
                onSelect={(p) => void send({ action: "guess", playerId: p.id })}
                disabled={!myTurn}
                focusKey={`${state.turn}-${items.A.length}`}
                placeholder={tr("Təxminin: futbolçunun adı...")}
              />
            </div>
            <p className={`mt-2 min-h-5 ${FONT} text-sm font-bold ${message?.tone === "good" ? "text-good" : message?.tone === "bad" ? "text-bad" : "text-muted"}`}>
              {message?.text ?? tr("Səhv təxmin də 1 sual sayılır.")}
            </p>
            <div className="mt-3 border-t border-edge pt-4">
              <QuestionBank data={data} asked={asked} onAsk={ask} disabled={!myTurn} accent={SIDES.A.border} />
            </div>
          </section>
          <div className="grid grid-cols-1 gap-3 lg:sticky lg:top-24">
            {["A", "B"].map((side) => (
              <AnswerBoard
                key={side}
                compact
                title={tr("Suallar · {name}", { name: names[side] })}
                accent={side === "A" ? "text-accent-hi" : "text-yellow"}
                items={itemsFor(data, items[side])}
                used={usedOf(items[side])}
                max={max}
                active={activeSide === side}
                empty={tr("Hələ sual yoxdur.")}
              />
            ))}
          </div>
        </div>
      ) : (
        <section className="mt-4 rounded-2xl border border-edge bg-surface p-5 text-center animate-[sqIn_0.35s_ease-out_both] md:p-7">
          <p className={`${FONT} text-base text-muted`}>
            {["A", "B"]
              .map((side) => (found[side] != null ? tr("{name}: {n} sualda tapdı", { name: names[side], n: found[side] }) : tr("{name}: tapa bilmədi", { name: names[side] })))
              .join(" · ")}
          </p>
          {secrets ? (
            <div className="mt-5 grid grid-cols-1 gap-3 text-left md:grid-cols-2">
              {[
                [me, "A"],
                [opp, "B"],
              ].map(([seat, side]) => (
                <div key={side}>
                  <p className={`mb-1.5 ${FONT} text-xs font-black uppercase tracking-[0.18em] ${SIDES[side].text}`}>{tr("{name} bu futbolçunu gizlətmişdi", { name: names[side] })}</p>
                  <RevealCard data={data} player={data.playersById.get(secrets[seat])} tone={SIDES[side].border} />
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-5 grid grid-cols-1 gap-3 text-left md:grid-cols-2">
            {["A", "B"].map((side) => (
              <AnswerBoard
                key={side}
                compact
                title={tr("Suallar · {name}", { name: names[side] })}
                accent={side === "A" ? "text-accent-hi" : "text-yellow"}
                items={itemsFor(data, items[side])}
                used={usedOf(items[side])}
                max={max}
                empty={tr("Hələ sual yoxdur.")}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SualDuel({ data, settings, onSettingsChange, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({ game: "sual", invitedCode: params.get("otaq") ?? "" });
  return (
    <DuelLobby
      duel={duel}
      onBack={onSettings}
      summary={sualSummary(duel.room?.settings)}
      setup={({ create, connected }) => <Setup settings={settings} onChange={onSettingsChange} create={create} connected={connected} onBack={onSettings} />}
    >
      <div className="space-y-4">
        <Match duel={duel} data={data} />
        <DuelFooter duel={duel} onSettings={onSettings} />
      </div>
    </DuelLobby>
  );
}
