import { useSearchParams } from "react-router-dom";
import { useDuelRoom } from "../../../lib/games/useDuelRoom";
import PlayerSearch from "../common/PlayerSearch";
import DuelLobby from "../common/DuelLobby";
import { FONT } from "../common/ui";
import { tr } from "../../../i18n";

export default function TwoLettersDuel({ data, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({
    game: "twoLetters",
    invitedCode: params.get("otaq")?.toUpperCase() ?? "",
  });
  const state = duel.room?.state ?? {};
  const pair = state.pairs?.[state.index];
  const scores = state.scores ?? {};
  const myTurn = state.turn === duel.myId;
  const current = duel.room?.players?.find((player) => player.id === state.turn);

  return (
    <DuelLobby duel={duel}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
            {tr("Raund")} <span className="font-bold text-ink">{(state.index ?? 0) + 1}</span> /{" "}
            {state.pairs?.length ?? 10}
          </p>
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
            {duel.room?.players?.map((player) => (
              <span key={player.id} className="ml-3">
                {player.name}: <span className="font-bold text-ink">{scores[player.id] ?? 0}</span>
              </span>
            ))}
          </p>
        </div>

        {pair ? (
          <>
            <div className="flex items-center justify-center gap-4">
              <span className={`grid h-20 w-20 place-items-center bg-accent ${FONT} text-5xl font-black text-white`}>
                {pair.a}
              </span>
              <span className={`${FONT} text-3xl font-black text-faint`}>+</span>
              <span className={`grid h-20 w-20 place-items-center bg-gold ${FONT} text-5xl font-black text-white`}>
                {pair.b}
              </span>
            </div>
            <p className={`text-center ${FONT} text-sm uppercase tracking-[0.18em] text-muted`}>
              {myTurn ? tr("Sənin növbəndir") : `${current?.name ?? tr("Rəqib")} oynayır`}
            </p>
            <PlayerSearch
              data={data}
              disabled={!myTurn || duel.room?.status !== "playing"}
              focusKey={state.index}
              placeholder={tr("Adında hər iki hərf olan futbolçunu yaz...")}
              onSelect={(player) => duel.sendMove({ playerId: player.id })}
            />
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
