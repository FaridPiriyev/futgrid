import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useDuelRoom, duelErrorText } from "../../../lib/games/useDuelRoom";
import { isFree, tierOf } from "../../../lib/games/auction";
import { buildClueIndex } from "../../../lib/games/auctionClues";
import AuctionSettings from "./AuctionSettings";
import { OPTIONS } from "./settings";
import DuelLobby from "../common/DuelLobby";
import { DuelFooter, EventToast, nameOf, stepKeyOf, useDuelClock, useStepFeedback } from "../common/DuelKit";
import { FONT } from "../common/ui";
import { AUCTION_KEYFRAMES, BidControls, Feed, LotCard, MiniTeam, PriceRow, TeamPanel } from "./AuctionParts";
import AuctionResult from "./AuctionResult";
import { tr } from "../../../i18n";

const labelOf = (list, value) => list.find((o) => o.value === value)?.label ?? String(value);

export function auctionSummary(settings) {
  if (!settings) return [];
  const f = settings.formation ?? {};
  const formation = isFree(f) ? tr("Sərbəst") : ["GK", "DF", "MF", "FW"].map((pos) => f[pos] ?? 0).join("-");
  return [
    { label: tr("Oyun növü"), value: settings.mystery ? tr("Gizli oyunçu") : tr("Açıq") },
    { label: tr("Heyət"), value: formation },
    { label: tr("Oyunçu hovuzu"), value: labelOf(OPTIONS.pool, settings.pool) },
    { label: tr("Təklif vaxtı"), value: labelOf(OPTIONS.timer, settings.timer) },
  ];
}

const UNKNOWN = { id: "?", name: "?" };

// Gizli rejimdə server ipucunun yalnız açarını göndərir — mətni brauzerdəki eyni indeksdən götürürük.
function clueOf(data, clue) {
  if (!clue) return null;
  const local = buildClueIndex(data).find((c) => c.key === clue.key);
  return { ...clue, label: local?.label ?? (() => tr("Gizli oyunçu")) };
}

// Server vəziyyətini lokal hərrac komponentlərinin dilinə çeviririk: mən "A", rəqib "B".
function toLocal(data, s, me, them, offset) {
  if (!s?.teams || !me || !them) return null;
  const sideOf = (seat) => (seat === me ? "A" : seat === them ? "B" : null);
  const team = (seat) => {
    const t = s.teams[seat];
    return {
      money: t.money,
      slots: t.slots.map((slot) => ({
        pos: slot.pos,
        pick: slot.pick ? { ...slot.pick, player: data.playersById.get(slot.pick.playerId) ?? { id: slot.pick.playerId, name: "?" } } : null,
      })),
    };
  };
  const lot = s.lot
    ? {
        ...s.lot,
        id: `${s.lotNo}`,
        player: s.lot.playerId != null ? data.playersById.get(s.lot.playerId) ?? { id: s.lot.playerId, name: "?" } : UNKNOWN,
        tier: tierOf(s.lot.rating ?? s.lot.expected ?? 80),
        clue: clueOf(data, s.lot.clue),
        leader: sideOf(s.lot.leader),
        opener: sideOf(s.lot.opener),
        decider: null,
        passed: { A: Boolean(s.lot.passed?.[me]), B: Boolean(s.lot.passed?.[them]) },
        history: (s.lot.history ?? []).map((h) => ({ ...h, side: sideOf(h.seat) })),
      }
    : null;
  return {
    phase: s.phase,
    lot,
    lotNo: s.lotNo,
    // Lokal komponentlər brauzer saatı ilə işləyir.
    deadline: s.deadline ? s.deadline - offset : 0,
    outcome: s.outcome ? { ...s.outcome, winner: sideOf(s.outcome.seat) } : null,
    teams: { A: team(me), B: team(them) },
    log: (s.log ?? []).map((l) => ({ ...l, winner: sideOf(l.seat), player: data.playersById.get(l.playerId) })),
  };
}

export default function AuctionDuel({ data, settings, onSettingsChange, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({ game: "auction", invitedCode: params.get("otaq") ?? "" });
  const raw = duel.room?.state;
  const playing = duel.room?.status === "playing";
  const finished = duel.room?.status === "finished";
  const offset = duel.offset;
  const localNow = useDuelClock(duel, playing, 200) - offset;
  const me = duel.myId;
  const them = duel.opponent?.id;
  const state = useMemo(() => toLocal(data, raw, me, them, offset), [data, raw, me, them, offset]);
  const [feedback, setFeedback] = useStepFeedback(stepKeyOf(raw));
  const names = { A: tr("Sən"), B: nameOf(duel.opponent) };
  const timerMs = raw?.actionMs ?? 15000;
  const lot = state?.lot;

  const send = async (payload) => {
    const res = await duel.move(payload);
    setFeedback(res?.error ? duelErrorText(res.error.code) : "");
  };
  const bidExact = (side, amount) => void send({ action: "bid", amount });
  const bid = (side, inc) => {
    if (!lot) return;
    // Sürətli düymələr: açılışda 1 · 2 · 4 ₼, sonra +0.5 · +1 · +2 ₼ (yarım manat vahidi).
    const amount = lot.leader ? lot.price + inc : 2 * inc;
    void send({ action: "bid", amount });
  };
  const pass = () => void send({ action: "pass" });

  const describe = useCallback(
    (e) => {
      const mine = e.seat === me;
      if (e.type === "sold") {
        const player = data.playersById.get(e.playerId)?.name ?? "";
        const price = `${e.price / 2} ₼`;
        return mine ? { tone: "good", text: tr("{name} sənin oldu · {price}", { name: player, price }) } : { tone: "neutral", text: tr("{name} rəqibə getdi · {price}", { name: player, price }) };
      }
      if (e.type === "auto_open") return mine ? { tone: "bad", text: tr("Vaxtında açmadın — avtomatik 1 ₼ təklif olundu.") } : null;
      return null;
    },
    [data, me],
  );

  // Təslim/çıxış/bağlantı ilə bitəndə komanda müqayisəsi göstərmirik — qalibi server artıq müəyyən edib.
  const forfeited = ["surrender", "left", "disconnect"].includes(duel.room?.endedReason);
  if (finished && state && !forfeited && raw?.strength) {
    const strength = raw.strength;
    const detail = tr("Komanda gücü {a} : {b} (reytinqlər + kimya)", { a: strength[me]?.total ?? "—", b: strength[them]?.total ?? "—" });
    return (
      <DuelLobby duel={duel} onBack={onSettings} finishedDetail={detail}>
        <AuctionResult data={data} state={state} names={names} solo={false} header={false} actions={false} />
      </DuelLobby>
    );
  }

  return (
    <DuelLobby
      duel={duel}
      onBack={onSettings}
      summary={auctionSummary(duel.room?.settings)}
      setup={({ create, connected }) => (
        <AuctionSettings
          mode="online"
          settings={settings}
          onChange={onSettingsChange}
          onStart={() => create({ pool: settings.pool, timer: settings.timer, formation: settings.formation, mystery: Boolean(settings.mystery) })}
          onBack={onSettings}
          connected={connected}
        />
      )}
    >
      <style>{AUCTION_KEYFRAMES}</style>
      {state && !finished ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
              {tr("Lot")} <span className="font-bold text-ink">{state.lotNo}</span>
              <span className="mx-2 text-dim">·</span>
              {tr("Satılan")} <span className="font-bold text-ink">{state.log.filter((l) => l.winner).length}</span>/10
            </p>
          </div>
          <EventToast event={raw?.lastEvent} describe={describe} />

          <div className="grid grid-cols-2 gap-2 lg:hidden">
            <MiniTeam side="A" name={names.A} state={state} />
            <MiniTeam side="B" name={names.B} state={state} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)_minmax(0,290px)]">
            <div className="hidden lg:block">
              <TeamPanel data={data} side="A" name={names.A} state={state} />
            </div>
            <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
              {lot ? <LotCard data={data} lot={lot} phase={state.phase} outcome={state.outcome} names={names} /> : null}
              {lot ? <PriceRow state={state} names={names} now={localNow} timerMs={timerMs} /> : null}
              {lot ? (
                <div className="w-full">
                  <BidControls side="A" state={state} names={names} onBid={bid} onBidExact={bidExact} onPass={pass} />
                  {feedback ? <p className={`mt-2 ${FONT} text-sm font-bold text-bad-hi`}>{feedback}</p> : null}
                </div>
              ) : null}
              <div className="w-full">
                <Feed state={state} names={names} />
              </div>
            </div>
            <div className="hidden lg:block">
              <TeamPanel data={data} side="B" name={names.B} state={state} />
            </div>
          </div>
          <DuelFooter duel={duel} onSettings={onSettings} />
        </div>
      ) : null}
    </DuelLobby>
  );
}
