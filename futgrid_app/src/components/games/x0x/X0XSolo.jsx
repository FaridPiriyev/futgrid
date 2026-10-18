import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Eye,
  Flag,
  Settings2,
  Shuffle,
  Target,
} from "lucide-react";
import {
  cellCats,
  checkAnswer,
  generateGrid,
  isFull,
  multipleChoice,
} from "../../../lib/games/x0x";
import { seeded, seedFrom, todayKey } from "../../../lib/random";
import PlayerSearch from "../common/PlayerSearch";
import ResultModal from "../common/ResultModal";
import { Notice } from "../common/GameStatus";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  FONT,
  SWEEP_BLUE,
  SWEEP_WHITE,
} from "../common/ui";
import X0XBoard from "./X0XBoard";
import X0XChoices from "./X0XChoices";
import { catText } from "./CategoryHeader";

const GUESSES = 9;
const emptyBoard = () => Array(9).fill(null);

function seedKey(settings) {
  const cats = Object.entries(settings.categories)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort()
    .join(",");
  return `${todayKey()}|${settings.era}|${settings.difficulty}|${cats}`;
}

export default function X0XSolo({ data, settings, onSettings }) {
  const [daily, setDaily] = useState(true);
  const [grid, setGrid] = useState(undefined);
  const [board, setBoard] = useState(emptyBoard);
  const [left, setLeft] = useState(GUESSES);
  const [activeCell, setActiveCell] = useState(null);
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [over, setOver] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [reveal, setReveal] = useState(false);

  const start = useCallback(
    (isDaily) => {
      const random = isDaily
        ? seeded(seedFrom(seedKey(settings)))
        : Math.random;
      setDaily(isDaily);
      setGrid(
        generateGrid(data, {
          difficulty: settings.difficulty,
          categories: settings.categories,
          random,
        }),
      );
      setBoard(emptyBoard());
      setLeft(GUESSES);
      setActiveCell(null);
      setChoices([]);
      setFeedback(null);
      setOver(false);
      setShowResult(false);
      setReveal(false);
    },
    [data, settings],
  );

  useEffect(() => {
    start(true);
  }, [start]);

  const score = board.filter(Boolean).length;
  const rarity = useMemo(() => {
    if (!grid) return 0;
    return board.reduce(
      (sum, b, i) =>
        b ? sum + Math.round(100 / Math.max(1, grid.answers[i])) : sum,
      0,
    );
  }, [board, grid]);

  const finish = () => {
    setOver(true);
    setActiveCell(null);
    setChoices([]);
    setShowResult(true);
  };

  const pickCell = (cell) => {
    setActiveCell(cell);
    setFeedback(null);
    setChoices(
      settings.multipleChoice ? multipleChoice(data, grid, cell, board) : [],
    );
  };

  const answer = (player) => {
    const cell = activeCell;
    const status = checkAnswer(grid, cell, player, board);
    const remaining = left - 1;
    setLeft(remaining);
    setActiveCell(null);
    setChoices([]);

    let next = board;
    if (status === "ok") {
      next = [...board];
      next[cell] = { mark: "solo", playerId: player.id, name: player.name };
      setBoard(next);
      setFeedback({ type: "ok", text: `${player.name} düzgündür!` });
    } else {
      setFeedback({
        type: "wrong",
        text:
          status === "used"
            ? `${player.name} artıq istifadə olunub.`
            : `${player.name} bu xanaya uyğun deyil.`,
      });
    }
    if (isFull(next) || remaining <= 0) finish();
  };

  const [rowCat, colCat] =
    activeCell !== null && grid ? cellCats(grid, activeCell) : [];

  const corner = (
    <span className="text-center">
      <span
        className={`block ${FONT} text-3xl font-bold leading-none text-white md:text-5xl`}
      >
        {left}
      </span>
      <span
        className={`mt-1 block ${FONT} text-[10px] uppercase tracking-wider text-blue-100 md:text-xs`}
      >
        cəhd qalıb
      </span>
    </span>
  );

  if (grid === null) {
    return (
      <Notice
        title="Cədvəl yaradılmadı"
        text="Bu parametrlərlə uyğun cədvəl tapılmadı. Çətinliyi və ya kateqoriyaları dəyiş."
      />
    );
  }
  if (!grid) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-6">
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <div className="grid grid-cols-3 gap-2">
          <Stat
            Icon={daily ? CalendarDays : Shuffle}
            label={daily ? "Günün cədvəli" : "Təsadüfi"}
            value={daily ? todayKey().slice(5) : "Məşq"}
          />
          <Stat Icon={Target} label="Xal" value={`${score} / 9`} />
          <Stat Icon={Eye} label="Nadirlik" value={rarity} />
        </div>

        <PlayerSearch
          data={data}
          disabled={activeCell === null || settings.multipleChoice || over}
          focusKey={`${activeCell}-${left}`}
          placeholder={
            activeCell !== null
              ? `${catText(rowCat)} × ${catText(colCat)}`
              : over
                ? "Oyun bitdi"
                : "Əvvəlcə xana seç"
          }
          onSelect={answer}
          onCancel={() => setActiveCell(null)}
        />

        {settings.multipleChoice && activeCell !== null && !over && (
          <X0XChoices options={choices} onSelect={answer} />
        )}

        <div
          aria-live="polite"
          className={`min-h-11 border-l-2 px-4 py-2.5 ${FONT} text-sm md:text-base ${
            feedback?.type === "ok"
              ? "border-l-emerald-400 bg-emerald-500/10 text-emerald-300"
              : feedback?.type === "wrong"
                ? "border-l-rose-500 bg-rose-500/10 text-rose-300"
                : "border-l-white/20 bg-white/5 text-neutral-400"
          }`}
        >
          {feedback?.text ??
            "Hər cavab bir cəhd aparır. Az adamın tapdığı xanalar daha çox nadirlik xalı verir."}
        </div>
      </div>

      <div className="mx-auto w-full lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-w-[calc((100svh-25rem)*1.33)]">
        <X0XBoard
          data={data}
          grid={grid}
          board={board}
          activeCell={activeCell}
          locked={over}
          reveal={reveal}
          canPick={(cell) => !board[cell]}
          onPick={pickCell}
          corner={corner}
        />
      </div>

      <div className="flex flex-wrap gap-2 lg:col-start-2 lg:row-start-2 lg:content-start">
        {over && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className={BTN_GHOST}
          >
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <Eye className="h-4 w-4" />
            {reveal ? "Gizlət" : "Cavablar"}
          </button>
        )}
        <button
          type="button"
          onClick={() => start(false)}
          className={over ? BTN_PRIMARY : BTN_GHOST}
        >
          <span
            aria-hidden="true"
            className={over ? SWEEP_WHITE : SWEEP_BLUE}
          />
          <Shuffle className="h-4 w-4" />
          Təsadüfi
        </button>
        {!daily && (
          <button
            type="button"
            onClick={() => start(true)}
            className={BTN_GHOST}
          >
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <CalendarDays className="h-4 w-4" />
            Günün cədvəli
          </button>
        )}
        {!over && (
          <button type="button" onClick={finish} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <Flag className="h-4 w-4" />
            Təslim ol
          </button>
        )}
        <button type="button" onClick={onSettings} className={BTN_GHOST}>
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <Settings2 className="h-4 w-4" />
          Parametrlər
        </button>
      </div>

      <ResultModal
        open={showResult}
        onClose={() => setShowResult(false)}
        eyebrow={daily ? "Günün cədvəli" : "Təsadüfi cədvəl"}
        title={score === 9 ? "Mükəmməl cədvəl!" : `${score} / 9 xana`}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setShowResult(false);
                setReveal(true);
              }}
              className={BTN_PRIMARY}
            >
              <span aria-hidden="true" className={SWEEP_WHITE} />
              Cavablara bax
            </button>
            <button
              type="button"
              onClick={() => start(false)}
              className={BTN_GHOST}
            >
              <span aria-hidden="true" className={SWEEP_BLUE} />
              Təsadüfi cədvəl
            </button>
          </>
        }
      >
        <p className={`${FONT} text-base text-neutral-400`}>
          Nadirlik xalı: <span className="font-bold text-white">{rarity}</span>
        </p>
        <p className={`mt-1 ${FONT} text-sm text-neutral-500`}>
          Mümkün cavablar: {grid.answers.reduce((a, b) => a + b, 0)}
        </p>
      </ResultModal>
    </div>
  );
}

function Stat({ Icon, label, value }) {
  return (
    <div className="min-w-0 border border-white/10 bg-white/5 px-3 py-2">
      <span
        className={`flex items-center gap-1.5 ${FONT} text-[10px] uppercase tracking-[0.15em] text-neutral-500 md:text-xs`}
      >
        <Icon className="h-3.5 w-3.5 text-blue-400" />
        {label}
      </span>
      <span
        className={`mt-0.5 block truncate ${FONT} text-lg font-bold text-white md:text-xl`}
      >
        {value}
      </span>
    </div>
  );
}
