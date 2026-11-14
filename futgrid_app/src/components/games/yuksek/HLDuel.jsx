import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useDuelRoom } from "../../../lib/games/useDuelRoom";
import DuelLobby from "../common/DuelLobby";
import { euro } from "../../../lib/games/playerInfo";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { tr } from "../../../i18n";

export default function HLDuel({ data, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({
    game: "higherLower",
    invitedCode: params.get("otaq")?.toUpperCase() ?? "",
  });
  const state = duel.room?.state ?? {};
  const current = state.current;
  const revealed = state.revealed && state.revealed.bId === state.current?.bId ? state.revealed : null;
  const a = current ? data.playersById.get(current.aId) : null;
  const b = current ? data.playersById.get(current.bId) : null;
  const scores = state.scores ?? {};
  const answered = Boolean(state.answers?.[duel.myId]);

  return (
    <DuelLobby duel={duel}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
            {tr("Raund")}{" "}
            <span className="font-bold text-ink">{(state.index ?? 0) + 1}</span>
          </p>
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
            {duel.room?.players?.map((player) => (
              <span key={player.id} className="ml-3">
                {player.name}: <span className="font-bold text-ink">{scores[player.id] ?? 0}</span>
              </span>
            ))}
          </p>
        </div>

        {current ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-line/15 bg-surface p-5 text-center">
                <p className={`${FONT} text-xs uppercase tracking-[0.2em] text-muted`}>{tr("Açıq dəyər")}</p>
                <p className={`mt-2 ${FONT} text-xl font-black uppercase text-ink`}>{a?.name}</p>
                <p className={`mt-1 ${FONT} text-3xl font-bold text-gold-hi`}>{euro(current.aValue)}</p>
              </div>
              <div className="border border-line/15 bg-surface p-5 text-center">
                <p className={`${FONT} text-xs uppercase tracking-[0.2em] text-muted`}>{tr("Gizli dəyər")}</p>
                <p className={`mt-2 ${FONT} text-xl font-black uppercase text-ink`}>{b?.name}</p>
                <p className={`mt-1 ${FONT} text-3xl font-bold ${revealed ? "text-gold-hi" : "text-gold-hi"}`}>
                  {revealed ? euro(revealed.bValue) : "?"}
                </p>
              </div>
            </div>

            {!answered && duel.room?.status === "playing" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => duel.sendMove({ direction: "up" })} className={BTN_PRIMARY}>
                  <span aria-hidden="true" className={SWEEP_WHITE} />
                  <ArrowUp className="h-4 w-4" />
                  {tr("Daha çox")}
                </button>
                <button type="button" onClick={() => duel.sendMove({ direction: "down" })} className={BTN_PRIMARY}>
                  <span aria-hidden="true" className={SWEEP_WHITE} />
                  <ArrowDown className="h-4 w-4" />
                  {tr("Daha az")}
                </button>
              </div>
            ) : (
              <p className={`text-center ${FONT} text-sm text-muted`}>
                {answered ? tr("Rəqibin cavabı gözlənilir...") : tr("Cavab ver")}
              </p>
            )}

            {revealed ? (
              <p className={`text-center ${FONT} text-sm font-bold text-accent`}>
                {tr("Düzgün cavab")}: {revealed.correctDirection === "up" ? tr("Daha çox") : tr("Daha az")}
              </p>
            ) : null}
          </>
        ) : (
          <p className={`text-center ${FONT} text-sm text-muted`}>{tr("Rəqib gözlənilir...")}</p>
        )}

        <div className="text-center">
          <button type="button" onClick={onSettings} className={`${FONT} text-sm uppercase text-muted hover:text-ink`}>
            {tr("Parametrlər")}
          </button>
        </div>
      </div>
    </DuelLobby>
  );
}
