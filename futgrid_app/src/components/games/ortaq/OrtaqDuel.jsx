import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Flag, Hand, RotateCcw, Timer } from "lucide-react";
import { useDuelRoom, duelErrorText } from "../../../lib/games/useDuelRoom";
import { datasetFor } from "../../../lib/data";
import { commonPlayers, entityIndex } from "../../../lib/games/common";
import EntitySearch from "../common/EntitySearch";
import PlayerSearch from "../common/PlayerSearch";
import DuelLobby from "../common/DuelLobby";
import { DuelFooter, nameOf, stepKeyOf, useDuelClock, useStepFeedback } from "../common/DuelKit";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import AnswerList, { FoundPlayer } from "./AnswerList";
import OrtaqSettings from "./OrtaqSettings";
import PokerCard from "./PokerCard";
import { Feedback, ScorePanel } from "./OrtaqVersus";
import { OPTIONS, SIDES } from "./settings";
import { tr } from "../../../i18n";

const CLUB_ONLY = ["club"];
const ANY = ["club", "country"];

export function ortaqSummary(settings) {
  if (!settings) return [];
  return [
    { label: tr("Oyunçular"), value: OPTIONS.era.find((o) => o.value === settings.era)?.label ?? settings.era },
    { label: tr("Neçə xala qədər"), value: tr("{n} xal", { n: settings.target }) },
  ];
}

function Countdown({ left, total, tone = "bg-accent" }) {
  if (left == null) return null;
  const pct = total ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className={`flex items-center justify-end gap-1 ${FONT} text-xs font-black tabular-nums ${left <= 5 ? "text-bad" : "text-muted"}`}>
        <Timer className="h-3.5 w-3.5" />
        0:{String(left).padStart(2, "0")}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line/10">
        <span className={`block h-full rounded-full transition-[width] duration-300 ease-linear ${left <= 5 ? "bg-bad" : tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Match({ duel, data }) {
  const settings = duel.room?.settings ?? {};
  const gameData = useMemo(() => datasetFor(data, settings.era ?? "active"), [data, settings.era]);
  const state = duel.room?.state ?? {};
  const playing = duel.room?.status === "playing";
  const now = useDuelClock(duel, playing);
  const [error, setError] = useStepFeedback(stepKeyOf(state));
  const [showAnswers, setShowAnswers] = useState(0);

  const me = duel.myId;
  const opp = duel.opponent?.id;
  const sideOf = (seat) => (seat === me ? "A" : "B");
  const names = { A: nameOf(duel.me), B: nameOf(duel.opponent) };
  const phase = state.phase;
  const round = state.round ?? 1;
  const iStart = state.starter === me;
  const picked = state.picked ?? {};
  const revealed = phase === "answer" || phase === "done";
  const entities = useMemo(() => {
    const byKey = entityIndex(gameData).byKey;
    return { A: state.picks ? byKey.get(state.picks[me]) ?? null : null, B: state.picks ? byKey.get(state.picks[opp]) ?? null : null };
  }, [gameData, state.picks, me, opp]);
  const answers = useMemo(() => (revealed && entities.A && entities.B ? commonPlayers(gameData, entities.A, entities.B) : []), [revealed, entities, gameData]);
  const result = state.result;
  const left = playing && state.deadline ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null;
  const scores = { A: state.scores?.[me] ?? 0, B: state.scores?.[opp] ?? 0 };
  const iReady = (state.ready ?? []).includes(me);
  const iGaveUp = (state.giveup ?? []).includes(me);
  const target = state.target ?? settings.target ?? 5;

  const cardState = (side) => {
    const seat = side === "A" ? me : opp;
    if (revealed) return "revealed";
    if (picked[seat]) return "hidden";
    if (phase === "pick" && side === "A") return "waiting";
    return "idle";
  };
  const status = (side) => {
    const seat = side === "A" ? me : opp;
    if (phase === "pick") return picked[seat] ? tr("hazır") : tr("seçir");
    if (phase === "answer") return tr("cavab verir");
    if (result?.seat === seat) return "+1";
    return "";
  };

  const send = async (payload) => {
    const res = await duel.move(payload);
    if (res?.error) setError(duelErrorText(res.error.code));
  };

  const e = state.lastEvent;
  let feedback = error ? { type: "wrong", text: error } : null;
  if (!feedback && e && playing) {
    const who = names[sideOf(e.seat)];
    if (e.type === "wrong" && phase === "answer")
      feedback = { type: "wrong", text: tr("{answerer}: {name} ortaq oyunçu deyil. −1 xal", { answerer: who, name: e.name }) };
    else if (e.type === "same" && phase === "pick") feedback = { type: "wrong", text: tr("Hər iki oyunçu eyni şeyi seçib. Yenidən seçin.") };
    else if (e.type === "giveup" && phase === "answer")
      feedback = { type: "info", text: e.seat === me ? tr("Rəqib də razılaşsa, raund xalsız bitəcək.") : tr("{name} tapa bilmir. Sən də razısansa, “Tapa bilmədik” bas.", { name: who }) };
    else if (e.type === "reveal" && phase === "answer") feedback = { type: "info", text: tr("Kartlar açıldı! Ortaq oyunçunu birinci yazan +1 xal alır.") };
  }
  if (!feedback && phase === "done" && result && !result.seat)
    feedback = {
      type: "info",
      text: result.none ? tr("Bu cütün ortaq oyunçusu yoxdur. Xal verilmir.") : result.timeout ? tr("Vaxt bitdi — heç kim tapmadı. Xal verilmir.") : tr("Heç kim tapmadı. Xal verilmir."),
    };

  const panel = (side, compact) => (
    <ScorePanel
      name={names[side]}
      score={scores[side]}
      side={SIDES[side]}
      status={status(side)}
      active={(phase === "pick" && !picked[side === "A" ? me : opp]) || phase === "answer" || result?.seat === (side === "A" ? me : opp)}
      compact={compact}
    />
  );
  const foundPlayer = result?.playerId ? gameData.playersById.get(result.playerId) ?? data.playersById.get(result.playerId) : null;

  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="mb-3 flex gap-3 md:hidden">
        {panel("A", true)}
        {panel("B", true)}
      </div>

      <div className="relative rounded-3xl border border-edge bg-surface px-2 py-5 md:px-6">
        <div className="flex items-center justify-center gap-3 md:gap-6">
          <div className="hidden md:block">{panel("A")}</div>
          <PokerCard entity={entities.A} state={cardState("A")} owner={names.A} side={SIDES.A} glow={SIDES.A.glow} delay={0} />
          <div className="flex flex-col items-center gap-1">
            <span className={`flex h-11 w-11 items-center justify-center rounded-full border border-line/15 bg-surface ${FONT} text-sm font-bold text-soft`}>VS</span>
            <span className={`${FONT} text-[10px] uppercase tracking-[0.2em] text-faint`}>R{round}</span>
          </div>
          <PokerCard entity={entities.B} state={cardState("B")} owner={names.B} side={SIDES.B} glow={SIDES.B.glow} delay={120} />
          <div className="hidden md:block">{panel("B")}</div>
        </div>
        <p className={`mt-3 text-center ${FONT} text-[11px] uppercase tracking-[0.2em] text-faint`}>{tr("{target} xala qədər", { target })}</p>
      </div>

      <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-3">
        {phase === "pick" && playing ? (
          picked[me] ? (
            <div className="rounded-2xl border-2 border-edge bg-surface p-4 text-center" style={{ animation: "ortaqDeal 350ms ease-out both" }}>
              <p className={`inline-flex items-center gap-2 ${FONT} text-base font-black uppercase text-good-hi`}>
                <EyeOff className="h-4.5 w-4.5" />
                {tr("Kartın gizli saxlanılır")}
              </p>
              <p className={`mt-1 ${FONT} text-sm text-muted`}>
                {picked[opp] ? tr("Kartlar açılır…") : tr("{name} seçir. Seçən kimi kartlar birlikdə açılacaq.", { name: names.B })}
              </p>
            </div>
          ) : (
            <div style={{ animation: "ortaqDeal 350ms ease-out both" }} className="relative z-20 flex flex-col gap-2">
              <p className={`flex items-center justify-center gap-2 text-center ${FONT} text-sm font-bold uppercase tracking-[0.15em] ${SIDES.A.text}`}>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] ${SIDES.A.solid}`}>
                  <Hand className="h-3.5 w-3.5" />
                  {iStart ? "1 / 2" : "2 / 2"}
                </span>
                {names.A}, {iStart ? tr("klub seç") : tr("klub və ya ölkə seç")}
              </p>
              <p className={`text-center ${FONT} text-xs text-muted`}>
                {iStart
                  ? tr("Raundu sən başlayırsan — yalnız klub seçə bilərsən. Seçimin kart açılana qədər gizli qalacaq.")
                  : tr("Klub və ya ölkə seç. Seçimin kart açılana qədər gizli qalacaq.")}
              </p>
              <EntitySearch
                data={gameData}
                types={iStart ? CLUB_ONLY : ANY}
                onSelect={(entity) => void send({ action: "pick", key: entity.key })}
                focusKey={`${round}-pick-${state.lastEvent?.at ?? 0}`}
                secret
                accent={SIDES.A.border}
                placeholder={iStart ? tr("Klubun adını yaz...") : tr("Klub və ya ölkə yaz...")}
              />
            </div>
          )
        ) : null}

        {phase === "answer" && playing ? (
          <>
            <PlayerSearch
              data={gameData}
              focusKey={`${round}-answer-${state.lastEvent?.at ?? 0}`}
              placeholder={tr("{answerer}, ortaq oyunçunu yaz...", { answerer: names.A })}
              onSelect={(player) => void send({ action: "answer", playerId: player.id })}
            />
            <p className={`text-center ${FONT} text-xs text-faint`}>
              {tr("Hər iki kartda oynamış futbolçunu yaz")} · {tr("{n} mümkün cavab", { n: state.answers ?? answers.length })} · {tr("səhv cavab −1 xal")}
            </p>
          </>
        ) : null}

        {phase === "done" && foundPlayer ? (
          <FoundPlayer player={foundPlayer} title={tr("{by} tapdı · +1", { by: names[sideOf(result.seat)] })} side={SIDES[sideOf(result.seat)]} />
        ) : null}
        {phase === "done" && (showAnswers === round || foundPlayer) ? <AnswerList answers={answers} exclude={foundPlayer?.id} /> : null}

        <Feedback feedback={feedback} />

        {playing && phase !== "done" ? (
          <Countdown left={left} total={phase === "pick" ? (state.pickMs ?? 45000) / 1000 : (state.answerMs ?? 75000) / 1000} />
        ) : null}

        <div className="flex flex-wrap justify-center gap-2">
          {phase === "answer" && playing ? (
            <button type="button" onClick={() => void send({ action: "giveup" })} disabled={iGaveUp} className={`${BTN_GHOST} disabled:opacity-60`}>
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <Flag className="h-4 w-4" />
              {iGaveUp ? tr("Rəqib gözlənilir…") : tr("Tapa bilmədik")}
            </button>
          ) : null}
          {phase === "done" && playing ? (
            <button type="button" onClick={() => void send({ action: "next" })} disabled={iReady} className={`${BTN_PRIMARY} disabled:opacity-60`}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              {iReady ? tr("Rəqib gözlənilir…") : tr("Növbəti raund")}
              {left != null ? <span className="tabular-nums opacity-70">· {left}</span> : null}
            </button>
          ) : null}
          {phase === "done" && showAnswers !== round && !foundPlayer && answers.length > 0 ? (
            <button type="button" onClick={() => setShowAnswers(round)} className={BTN_GHOST}>
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <Eye className="h-4 w-4" />
              {tr("Cavablar")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function OrtaqDuel({ data, settings, onSettingsChange, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({ game: "orta", invitedCode: params.get("otaq") ?? "" });
  return (
    <DuelLobby
      duel={duel}
      onBack={onSettings}
      summary={ortaqSummary(duel.room?.settings)}
      setup={({ create, connected }) => (
        <OrtaqSettings
          mode="online"
          settings={settings}
          onChange={onSettingsChange}
          onStart={() => create({ era: settings.era, target: settings.target })}
          onBack={onSettings}
          connected={connected}
        />
      )}
    >
      <div className="space-y-4">
        <Match duel={duel} data={data} />
        <DuelFooter duel={duel} onSettings={onSettings} />
      </div>
    </DuelLobby>
  );
}
