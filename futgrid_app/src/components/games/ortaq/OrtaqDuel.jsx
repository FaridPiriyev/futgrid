import { useSearchParams } from "react-router-dom";
import { useDuelRoom } from "../../../lib/games/useDuelRoom";
import PlayerSearch from "../common/PlayerSearch";
import DuelLobby from "../common/DuelLobby";
import { FONT } from "../common/ui";
import { tr } from "../../../i18n";

function EntityCard({ entity }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 border border-line/15 bg-surface p-4 text-center">
      {entity?.flag ? <span className="text-4xl">{entity.flag}</span> : null}
      {entity?.club ? (
        <span className={`${FONT} text-xs uppercase tracking-wide text-muted`}>{entity.club.name}</span>
      ) : null}
      <span className={`${FONT} text-lg font-black uppercase text-ink`}>{entity?.label}</span>
      <span className={`${FONT} text-[11px] uppercase tracking-wide text-faint`}>{entity?.type}</span>
    </div>
  );
}

export default function OrtaqDuel({ data, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({
    game: "orta",
    invitedCode: params.get("otaq")?.toUpperCase() ?? "",
  });
  const state = duel.room?.state ?? {};
  const pair = state.pairs?.[state.round];
  const scores = state.scores ?? {};

  return (
    <DuelLobby duel={duel}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
            {tr("Sual")} <span className="font-bold text-ink">{(state.round ?? 0) + 1}</span> /{" "}
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
            <div className="flex items-stretch gap-3">
              <EntityCard entity={pair.a} />
              <span className={`grid place-items-center ${FONT} text-2xl font-black text-accent`}>+</span>
              <EntityCard entity={pair.b} />
            </div>
            <PlayerSearch
              data={data}
              focusKey={state.round}
              placeholder={tr("{label} və {label2} ilə bağlı oyunçunu yaz...", {
                label: pair.a?.label,
                label2: pair.b?.label,
              })}
              onSelect={(player) => duel.sendMove({ playerId: player.id })}
            />
            <p className={`text-center ${FONT} text-sm text-muted`}>
              {tr("Düzgün cavab +1, səhv cavab −1. İlk 5 xal qazanan və ya 10 raunddan sonra lider udur.")}
            </p>
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
