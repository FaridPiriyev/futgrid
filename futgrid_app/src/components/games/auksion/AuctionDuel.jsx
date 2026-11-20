import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDuelRoom } from "../../../lib/games/useDuelRoom";
import DuelLobby from "../common/DuelLobby";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { tr } from "../../../i18n";

export default function AuctionDuel({ data, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({ game: "auction", invitedCode: params.get("otaq")?.toUpperCase() ?? "" });
  const [left, setLeft] = useState(0);
  const state = duel.room?.state ?? {};
  const lot = state.lot;
  const team = state.teams?.[duel.myId];
  const player = lot ? data.playersById.get(lot.playerId) : null;
  const waiting = duel.room?.status === "waiting";
  const playing = duel.room?.status === "playing";

  useEffect(() => {
    if (!lot?.deadline) return setLeft(0);
    const tick = () => setLeft(Math.max(0, Math.ceil((lot.deadline - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [lot?.deadline]);

  return (
    <DuelLobby duel={duel}>
      <div className="mx-auto max-w-4xl space-y-4">
        {waiting ? (
          <div className="text-center">
            <button type="button" className={BTN_PRIMARY} onClick={duel.startGame} disabled={(duel.room?.players?.length ?? 0) < 2}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              {tr("Hərracı başlat")}
            </button>
            <p className={`mt-1 ${FONT} text-xs text-muted`}>{tr("2–4 oyunçu qoşulandan sonra host başladır.")}</p>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {duel.room?.players?.map((entry) => {
            const t = state.teams?.[entry.id];
            return (
              <div key={entry.id} className="border border-line/15 bg-surface p-3 text-sm">
                <p className={`${FONT} font-bold uppercase text-ink`}>{entry.displayName || entry.name}</p>
                <p className={`${FONT} text-xs text-muted`}>{tr("Büdcə")}: {t?.money ?? 40}₼</p>
                <p className={`${FONT} text-xs text-muted`}>{tr("Heyət")}: {t?.slots?.filter((slot) => slot.pick).length ?? 0}/5</p>
              </div>
            );
          })}
        </div>

        {playing && lot && player ? (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`${FONT} text-xs uppercase tracking-[0.2em] text-accent`}>{tr("Lot")} {(state.round ?? 0) + 1}</p>
                <p className={`${FONT} text-2xl font-black uppercase text-ink`}>{player.name}</p>
                <p className={`${FONT} text-sm text-muted`}>{lot.pos} · {tr("Reytinq")}: {lot.rating}</p>
              </div>
              <div className="text-right">
                <p className={`${FONT} text-3xl font-black text-gold-hi`}>{lot.price}₼</p>
                <p className={`${FONT} text-sm text-muted`}>{left}{tr(" san")}</p>
                <p className={`${FONT} text-xs text-muted`}>{lot.leader ? `${duel.room?.players?.find((p) => p.id === lot.leader)?.displayName || tr("Lider")}` : tr("Lider yoxdur")}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 5].map((add) => (
                <button key={add} type="button" className={BTN_PRIMARY} onClick={() => duel.sendMove({ action: "bid", amount: lot.price + add })}>
                  <span aria-hidden="true" className={SWEEP_WHITE} />
                  +{add}₼
                </button>
              ))}
              <button type="button" className={`${FONT} text-sm uppercase text-muted hover:text-ink`} onClick={() => duel.sendMove({ action: "pass" })}>
                {tr("Keç")}
              </button>
            </div>
            <p className={`mt-2 ${FONT} text-xs text-muted`}>{tr("Sənin büdcən")}: {team?.money ?? 40}₼</p>
          </div>
        ) : null}

        <div className="text-center">
          <button type="button" onClick={onSettings} className={`${FONT} text-sm uppercase text-muted hover:text-ink`}>{tr("Parametrlər")}</button>
        </div>
      </div>
    </DuelLobby>
  );
}
