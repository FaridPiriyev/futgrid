import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { useDuelRoom, duelErrorText } from "../../../lib/games/useDuelRoom";
import DuelLobby from "../common/DuelLobby";
import { DuelFooter, DuelScoreboard, nameOf, stepKeyOf, useDuelClock, useStepFeedback } from "../common/DuelKit";
import PlayerAvatar from "../common/PlayerAvatar";
import { euro } from "../../../lib/games/playerInfo";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { tr } from "../../../i18n";

function PlayerPanel({ player, label, value, hidden }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-edge bg-surface p-4 text-center md:p-5">
      <p className={`${FONT} text-xs font-bold uppercase tracking-[0.2em] text-muted`}>{label}</p>
      <div className="mt-3">
        <PlayerAvatar player={player} className="h-20 w-20 md:h-24 md:w-24" textClass="text-2xl" />
      </div>
      <p className={`mt-3 ${FONT} text-lg font-black uppercase leading-tight text-ink md:text-xl`}>{player?.name ?? "?"}</p>
      <p className={`mt-1 ${FONT} text-3xl font-bold text-gold-hi`}>{hidden ? "?" : euro(value)}</p>
    </div>
  );
}

function Match({ duel, data }) {
  const state = duel.room?.state ?? {};
  const playing = duel.room?.status === "playing";
  const now = useDuelClock(duel, playing, 250);
  const [error, setError] = useStepFeedback(stepKeyOf(state));
  const current = state.current;
  const a = current ? data.playersById.get(current.aId) : null;
  const b = current ? data.playersById.get(current.bId) : null;
  const answered = (state.answered ?? []).includes(duel.myId);
  const theyAnswered = duel.opponent && (state.answered ?? []).includes(duel.opponent.id);
  const last = state.revealed;
  const lastFresh = last && now - (state.deadline ?? 0) + (state.roundMs ?? 20000) < 3500;
  const lastA = last ? data.playersById.get(last.aId) : null;
  const lastB = last ? data.playersById.get(last.bId) : null;
  const myLast = last?.answers?.[duel.myId];

  const send = async (direction) => {
    const res = await duel.move({ direction });
    if (res?.error) setError(duelErrorText(res.error.code));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <DuelScoreboard
        duel={duel}
        scores={state.scores ?? {}}
        deadline={playing ? state.deadline : null}
        total={state.roundMs ?? 20000}
        label={tr("Raund {n}", { n: (state.index ?? 0) + 1 })}
        sub={tr("{n} xala qədər", { n: 5 })}
        marks={Object.fromEntries((state.answered ?? []).map((id) => [id, "✓"]))}
        now={now}
      />

      {last && lastFresh ? (
        <p
          key={`${last.aId}-${last.bId}`}
          className={`flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-center ${FONT} text-sm font-bold animate-[duelIn_0.3s_ease-out] ${
            myLast === last.correctDirection ? "bg-good/12 text-good-hi" : "bg-bad/10 text-bad-hi"
          }`}
        >
          {myLast === last.correctDirection ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {lastB?.name ?? "?"}: {euro(last.bValue)}
          <span className="font-normal opacity-80">
            · {lastA?.name ?? ""}: {euro(last.aValue)} · {last.correctDirection === "up" ? tr("Daha çox") : tr("Daha az")}
          </span>
        </p>
      ) : null}

      {current ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <PlayerPanel player={a} label={tr("Açıq dəyər")} value={current.aValue} />
            <PlayerPanel player={b} label={tr("Gizli dəyər")} hidden />
          </div>

          {playing && !answered ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => void send("up")} className={BTN_PRIMARY}>
                <span aria-hidden="true" className={SWEEP_WHITE} />
                <ArrowUp className="h-4 w-4" />
                {tr("Daha çox")}
              </button>
              <button type="button" onClick={() => void send("down")} className={BTN_PRIMARY}>
                <span aria-hidden="true" className={SWEEP_WHITE} />
                <ArrowDown className="h-4 w-4" />
                {tr("Daha az")}
              </button>
            </div>
          ) : playing ? (
            <p className={`text-center ${FONT} text-sm text-muted`}>
              {tr("{name} cavab verir…", { name: nameOf(duel.opponent) })}
            </p>
          ) : null}
          {playing && !answered && theyAnswered ? (
            <p className={`text-center ${FONT} text-xs font-bold uppercase tracking-wider text-yellow`}>
              {tr("Rəqib artıq cavab verdi!")}
            </p>
          ) : null}
        </>
      ) : null}

      {error ? (
        <p role="alert" className={`text-center ${FONT} text-sm font-bold text-bad-hi`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function HLDuel({ data, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({
    game: "higherLower",
    invitedCode: params.get("otaq") ?? "",
  });
  return (
    <DuelLobby
      duel={duel}
      onBack={onSettings}
      summary={[
        { label: tr("Qələbə xalı"), value: "5" },
        { label: tr("Cavab vaxtı"), value: tr("{n} san", { n: 20 }) },
      ]}
    >
      <div className="space-y-4">
        <Match duel={duel} data={data} />
        <DuelFooter duel={duel} onSettings={onSettings} />
      </div>
    </DuelLobby>
  );
}
