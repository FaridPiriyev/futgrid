import { useState } from "react";
import { sampleAnswers } from "../../../lib/games/x0x";
import { FONT } from "../common/ui";
import CategoryHeader from "./CategoryHeader";
import Shirt from "./Shirt";
import { MARKS } from "./marks";

import { tr } from "../../../i18n";
export default function X0XBoard({
  data,
  grid,
  board,
  activeCell,
  winLine = [],
  locked,
  reveal,
  canPick,
  onPick,
  corner,
}) {
  return (
    <div className="grid grid-cols-4 overflow-hidden border border-line/10 bg-surface">
      <div className="flex items-center justify-center border-b border-r border-line/10 bg-accent p-2">
        {corner}
      </div>
      {grid.cols.map((c) => (
        <div
          key={c.key}
          className="border-b border-r border-line/10 bg-cell-2 last:border-r-0"
        >
          <CategoryHeader cat={c} />
        </div>
      ))}

      {grid.rows.map((r, ri) => (
        <Row
          key={r.key}
          row={r}
          ri={ri}
          data={data}
          grid={grid}
          board={board}
          activeCell={activeCell}
          winLine={winLine}
          locked={locked}
          reveal={reveal}
          canPick={canPick}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

function Row({
  row,
  ri,
  data,
  grid,
  board,
  activeCell,
  winLine,
  locked,
  reveal,
  canPick,
  onPick,
}) {
  return (
    <>
      <div
        className={`border-r border-line/10 bg-cell-2 ${ri < 2 ? "border-b" : ""}`}
      >
        <CategoryHeader cat={row} />
      </div>
      {[0, 1, 2].map((ci) => {
        const cell = ri * 3 + ci;
        return (
          <Cell
            key={cell}
            cell={cell}
            value={board[cell]}
            photo={
              board[cell]
                ? data.playersById.get(board[cell].playerId)?.photo_url
                : null
            }
            active={activeCell === cell}
            inLine={winLine.includes(cell)}
            striped={(ri + ci) % 2 === 0}
            pickable={!locked && canPick(cell)}
            samples={
              reveal && !board[cell]
                ? sampleAnswers(data, grid, cell, board)
                : []
            }
            last={{ right: ci === 2, bottom: ri === 2 }}
            onPick={onPick}
          />
        );
      })}
    </>
  );
}

const markLabel = (value) =>
  value.mark === "X" || value.mark === "O" ? value.mark : "✓";

function PhotoCell({
  cell,
  value,
  photo,
  mark,
  active,
  inLine,
  pickable,
  last,
  onPick,
  onBroken,
}) {
  return (
    <button
      type="button"
      disabled={!pickable}
      onClick={() => onPick(cell)}
      aria-label={`${value.mark === "solo" ? "" : value.mark} ${value.name}`.trim()}
      className={`group relative aspect-square overflow-hidden bg-cell ${last.right ? "" : "border-r"} ${
        last.bottom ? "" : "border-b"
      } border-line/10 ${pickable ? "cursor-pointer" : "cursor-default"}`}
    >
      <img
        src={photo}
        alt=""
        loading="lazy"
        onError={onBroken}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <span aria-hidden="true" className={`absolute inset-0 ${mark.tint}`} />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 to-transparent"
      />
      <span
        aria-hidden="true"
        className={`absolute inset-0 ring-inset ${active ? "ring-4 ring-line" : inLine ? `ring-4 ${mark.ring}` : `ring-2 ${mark.ring}`}`}
      />
      <span
        className={`absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center ${mark.solid} ${FONT} text-lg font-bold leading-none shadow-lg md:h-9 md:w-9 md:text-2xl`}
      >
        {markLabel(value)}
      </span>
      <span
        className={`absolute inset-x-1 bottom-1.5 line-clamp-2 text-center ${FONT} text-[10px] font-bold uppercase leading-tight text-ink md:text-xs`}
      >
        {value.name}
      </span>
    </button>
  );
}

function Cell(props) {
  const {
    cell,
    value,
    photo,
    active,
    inLine,
    striped,
    pickable,
    samples,
    last,
    onPick,
  } = props;
  const [broken, setBroken] = useState(null);
  const mark = value ? (MARKS[value.mark] ?? MARKS.solo) : null;
  if (value && photo && broken !== photo)
    return (
      <PhotoCell {...props} mark={mark} onBroken={() => setBroken(photo)} />
    );

  return (
    <button
      type="button"
      disabled={!pickable}
      onClick={() => onPick(cell)}
      aria-label={
        value
          ? `${value.mark === "solo" ? "" : value.mark} ${value.name}`.trim()
          : tr("Boş xana")
      }
      className={`group relative flex aspect-square flex-col items-center justify-center overflow-hidden p-1.5 transition-colors duration-200 ${
        last.right ? "" : "border-r"
      } ${last.bottom ? "" : "border-b"} border-line/10 ${
        active
          ? "bg-accent/20 ring-2 ring-inset ring-accent"
          : inLine
            ? `${mark.bg} ring-2 ring-inset ${mark.ring}`
            : value
              ? mark.bg
              : striped
                ? "bg-cell-hi"
                : "bg-cell"
      } ${pickable ? "cursor-pointer enabled:hover:bg-accent/15" : "cursor-default"}`}
    >
      <span className="relative flex h-3/5 w-3/5 items-center justify-center">
        <Shirt
          className={`absolute inset-0 h-full w-full transition-colors duration-200 ${
            value
              ? mark.shirt
              : "text-ink/[0.06] group-enabled:group-hover:text-ink/10"
          }`}
        />
        {value ? (
          <span
            className={`relative mt-2 ${FONT} text-2xl font-bold leading-none text-ink md:text-4xl`}
          >
            {markLabel(value)}
          </span>
        ) : samples.length ? null : (
          <span
            className={`relative mt-2 ${FONT} text-2xl font-light leading-none text-ink/25 group-enabled:group-hover:text-accent-hi md:text-4xl`}
          >
            +
          </span>
        )}
      </span>

      {value ? (
        <span
          className={`mt-1 line-clamp-2 text-center ${FONT} text-[10px] font-bold uppercase leading-tight text-ink md:text-xs`}
        >
          {value.name}
        </span>
      ) : samples.length ? (
        <span
          className={`absolute inset-x-1 bottom-1.5 text-center ${FONT} text-[9px] leading-tight text-soft md:text-[11px]`}
        >
          {samples.map((p) => (
            <span key={p.id} className="block truncate">
              {p.name}
            </span>
          ))}
        </span>
      ) : (
        <span
          className={`mt-1 ${FONT} text-[9px] font-bold uppercase tracking-wide text-ink/20 md:text-[11px]`}
        >
          {tr("Oyunçu tap")}
        </span>
      )}
    </button>
  );
}
