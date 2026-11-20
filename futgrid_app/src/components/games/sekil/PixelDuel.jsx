import { useSearchParams } from "react-router-dom";
import { useDuelRoom } from "../../../lib/games/useDuelRoom";
import PlayerSearch from "../common/PlayerSearch";
import DuelLobby from "../common/DuelLobby";
import PixelBoard from "./PixelBoard";
import { FONT } from "../common/ui";
import { tr } from "../../../i18n";

export default function PixelDuel({ data, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({ game: "sekil", invitedCode: params.get("otaq")?.toUpperCase() ?? "" });
  const state = duel.room?.state ?? {};
  const scores = state.scores ?? {};
  const fakePlayer = state.photoUrl ? { photo_url: state.photoUrl, name: "" } : null;
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
        <div className="mx-auto w-full max-w-sm">
          {fakePlayer ? (
            <PixelBoard player={fakePlayer} size={16} order={Array.from({ length: 16 }, (_, i) => i)} opened={state.opened ?? 0} all={false} onReady={() => {}} onBroken={() => {}} />
          ) : null}
        </div>
        <PlayerSearch
          data={data}
          focusKey={state.round}
          disabled={duel.room?.status !== "playing"}
          placeholder={tr("Şəkildəki futbolçunu yaz...")}
          onSelect={(player) => duel.sendMove({ playerId: player.id })}
        />
        <div className="text-center">
          <button type="button" onClick={onSettings} className={`${FONT} text-sm uppercase text-muted hover:text-ink`}>{tr("Parametrlər")}</button>
        </div>
      </div>
    </DuelLobby>
  );
}
