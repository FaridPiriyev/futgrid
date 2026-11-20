import { useSearchParams } from "react-router-dom";
import { useDuelRoom } from "../../../lib/games/useDuelRoom";
import PlayerSearch from "../common/PlayerSearch";
import DuelLobby from "../common/DuelLobby";
import { FONT } from "../common/ui";
import { tr } from "../../../i18n";

export default function SualDuel({ data, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({ game: "sual", invitedCode: params.get("otaq")?.toUpperCase() ?? "" });
  const state = duel.room?.state ?? {};
  const scores = state.scores ?? {};
  return (
    <DuelLobby duel={duel}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
            {tr("Raund")} <span className="font-bold text-ink">{(state.round ?? 0) + 1}</span> / {state.maxRounds ?? 5}
          </p>
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
            {duel.room?.players?.map((player) => (
              <span key={player.id} className="ml-3">{player.displayName || player.name}: <span className="font-bold text-ink">{scores[player.id] ?? 0}</span></span>
            ))}
          </p>
        </div>
        <p className={`text-center ${FONT} text-lg font-bold text-ink`}>
          {tr("Gizli futbolçunu ilk tapan xal qazanır. İlk 3 xal matçı udur.")}
        </p>
        <PlayerSearch
          data={data}
          focusKey={state.round}
          disabled={duel.room?.status !== "playing"}
          placeholder={tr("Gizli futbolçunu yaz...")}
          onSelect={(player) => duel.sendMove({ playerId: player.id })}
        />
        <div className="text-center">
          <button type="button" onClick={onSettings} className={`${FONT} text-sm uppercase text-muted hover:text-ink`}>{tr("Parametrlər")}</button>
        </div>
      </div>
    </DuelLobby>
  );
}
