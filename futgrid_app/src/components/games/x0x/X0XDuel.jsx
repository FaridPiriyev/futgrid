import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDuelRoom } from "../../../lib/games/useDuelRoom";
import PlayerSearch from "../common/PlayerSearch";
import DuelLobby from "../common/DuelLobby";
import { FONT } from "../common/ui";
import X0XBoard from "./X0XBoard";
import { tr } from "../../../i18n";

export default function X0XDuel({ data, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({
    game: "xox",
    invitedCode: params.get("otaq")?.toUpperCase() ?? "",
  });
  const [activeCell, setActiveCell] = useState(null);
  const state = duel.room?.state ?? {};
  const grid = state.grid;
  const cells = state.cells ?? Array(9).fill(null);
  const marks = state.marks ?? {};
  const myMark = marks[duel.myId];
  const myTurn = state.turn === duel.myId;
  const playing = duel.room?.status === "playing";

  const board = useMemo(
    () => cells.map((cell) => (cell ? { mark: cell.mark, playerId: cell.playerId, name: cell.name } : null)),
    [cells],
  );

  const pickCell = (cell) => {
    if (!playing || !myTurn || cells[cell]) return;
    setActiveCell(cell);
  };

  return (
    <DuelLobby duel={duel}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-6">
        <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
          <div className="rounded-xl border border-line/15 bg-surface p-4">
            <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-muted`}>{tr("Növbə")}</p>
            <p className={`mt-1 ${FONT} text-xl font-black uppercase text-ink`}>
              {myTurn ? tr("Sənin növbəndir") : `${duel.room?.players?.find((p) => p.id === state.turn)?.displayName || duel.room?.players?.find((p) => p.id === state.turn)?.name || tr("Rəqib")} oynayır`}
            </p>
            <p className={`mt-1 ${FONT} text-xs text-faint`}>{tr("Xana seç, sonra uyğun futbolçunu yaz.")}</p>
          </div>
          <PlayerSearch
            data={data}
            disabled={activeCell === null || !myTurn}
            focusKey={`${activeCell}-${state.turn}`}
            placeholder={activeCell === null ? tr("Əvvəlcə xana seç") : tr("Uyğun futbolçunu yaz...")}
            onSelect={(player) => {
              if (activeCell !== null) duel.sendMove({ cell: activeCell, playerId: player.id });
              setActiveCell(null);
            }}
            onCancel={() => setActiveCell(null)}
          />
          <button type="button" onClick={onSettings} className={`${FONT} text-sm uppercase text-muted hover:text-ink`}>
            {tr("Parametrlər")}
          </button>
        </div>
        <div className="mx-auto w-full lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-w-[calc((100svh-25rem)*1.33)]">
          {grid ? (
            <X0XBoard
              data={data}
              grid={grid}
              board={board}
              activeCell={activeCell}
              locked={!playing || !myTurn}
              reveal={false}
              canPick={(cell) => playing && myTurn && !cells[cell]}
              onPick={pickCell}
              corner={<span className={`${FONT} text-xl font-black text-white md:text-3xl`}>{myMark ?? "X0X"}</span>}
            />
          ) : (
            <div className="grid aspect-square place-items-center border border-line/10 bg-surface">
              <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>{tr("Oyun hazırlanır...")}</p>
            </div>
          )}
        </div>
      </div>
    </DuelLobby>
  );
}
