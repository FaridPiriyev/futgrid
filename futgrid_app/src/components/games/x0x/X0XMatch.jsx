import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Flag, RotateCcw, Settings2, SkipForward } from "lucide-react";
import {
  cellCats,
  checkAnswer,
  generateGrid,
  isFull,
  multipleChoice,
  winnerOf,
} from "../../../lib/games/x0x";
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
import X0XScoreboard from "./X0XScoreboard";
import { catText } from "./CategoryHeader";
import { other } from "./marks";
import { playerName, winsNeeded } from "./settings";
import useTurnTimer from "./useTurnTimer";

const emptyBoard = () => Array(9).fill(null);
const stealPool = (s) =>
  s === "none" ? null : s === "unlimited" ? Infinity : s;

export default function X0XMatch({ data, settings, onSettings }) {
  const [grid, setGrid] = useState(undefined);
  const [board, setBoard] = useState(emptyBoard);
  const [turn, setTurn] = useState("X");
  const [starter, setStarter] = useState("X");
  const [turnId, setTurnId] = useState(0);
  const [activeCell, setActiveCell] = useState(null);
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [round, setRound] = useState(1);
  const [roundResult, setRoundResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [wins, setWins] = useState({ X: 0, O: 0 });
  const [steals, setSteals] = useState({ X: 0, O: 0 });

  const names = { X: playerName(settings, "X"), O: playerName(settings, "O") };
  const target = winsNeeded(settings.bestOf);
  const matchOver = wins.X >= target || wins.O >= target;
  const roundOver = Boolean(roundResult);

  const startRound = useCallback(
    (first) => {
      setGrid(
        generateGrid(data, {
          difficulty: settings.difficulty,
          categories: settings.categories,
        }),
      );
      setBoard(emptyBoard());
      setTurn(first);
      setStarter(first);
      setTurnId((n) => n + 1);
      setActiveCell(null);
      setChoices([]);
      setFeedback(null);
      setRoundResult(null);
      setShowResult(false);
      setReveal(false);
      const pool = stealPool(settings.steals);
      setSteals({ X: pool ?? 0, O: pool ?? 0 });
    },
    [data, settings],
  );

  useEffect(() => {
    startRound("X");
  }, [startRound]);

  const nextTurn = useCallback((text, type = "info") => {
    setActiveCell(null);
    setChoices([]);
    if (text) setFeedback({ type, text });
    setTurn((t) => other(t));
    setTurnId((n) => n + 1);
  }, []);

  const timeLeft = useTurnTimer(
    settings.timer,
    turnId,
    !roundOver && grid,
    () => nextTurn(`Vaxt bitdi. Növbə: ${names[other(turn)]}.`, "wrong"),
  );

  const endRound = (result) => {
    setRoundResult(result);
    setActiveCell(null);
    setChoices([]);
    if (result.type === "win")
      setWins((w) => ({ ...w, [result.mark]: w[result.mark] + 1 }));
    setShowResult(true);
  };

  const owner = (cell) => board[cell]?.mark;
  const canSteal = steals[turn] > 0;
  const canPick = (cell) => !board[cell] || (owner(cell) !== turn && canSteal);

  const pickCell = (cell) => {
    setActiveCell(cell);
    setFeedback(
      board[cell]
        ? {
            type: "info",
            text: `${names[turn]}, oğurlama: ${board[cell].name} əvəzinə başqa düzgün oyunçu yaz.`,
          }
        : null,
    );
    setChoices(
      settings.multipleChoice ? multipleChoice(data, grid, cell, board) : [],
    );
  };

  const answer = (player) => {
    const cell = activeCell;
    const stealing = Boolean(board[cell]);
    const status = checkAnswer(grid, cell, player, board);

    if (status !== "ok") {
      nextTurn(
        status === "used"
          ? `${player.name} artıq lövhədədir. Növbə: ${names[other(turn)]}.`
          : `${player.name} bu xanaya uyğun deyil. Növbə: ${names[other(turn)]}.`,
        "wrong",
      );
      return;
    }

    const next = [...board];
    next[cell] = { mark: turn, playerId: player.id, name: player.name };
    setBoard(next);
    if (stealing) setSteals((s) => ({ ...s, [turn]: s[turn] - 1 }));

    const win = winnerOf(next);
    if (win) return endRound({ type: "win", ...win });
    if (isFull(next)) return endRound({ type: "draw" });
    nextTurn(
      stealing
        ? `${names[turn]} xananı oğurladı: ${player.name}!`
        : `${player.name} düzgündür!`,
      "ok",
    );
  };

  const giveUp = () =>
    endRound({ type: "win", mark: other(turn), line: [], gaveUp: turn });

  const newMatch = () => {
    setWins({ X: 0, O: 0 });
    setRound(1);
    startRound("X");
  };

  const nextRound = () => {
    setRound((r) => r + 1);
    startRound(other(starter));
  };

  const [rowCat, colCat] =
    activeCell !== null && grid ? cellCats(grid, activeCell) : [];
  const corner = useMemo(
    () => (
      <span className="text-center">
        <span
          className={`block ${FONT} text-xl font-bold uppercase leading-none text-white md:text-3xl`}
        >
          X0X
        </span>
        <span
          className={`mt-1 block ${FONT} text-[10px] uppercase tracking-wider text-blue-100 md:text-xs`}
        >
          Raund {round}
        </span>
      </span>
    ),
    [round],
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

  const winnerName = roundResult?.mark ? names[roundResult.mark] : "";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-6">
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <X0XScoreboard
          names={names}
          turn={turn}
          wins={wins}
          steals={stealPool(settings.steals) === null ? null : steals}
          timeLeft={timeLeft}
          timer={settings.timer}
          roundOver={roundOver}
        />

        <p
          className={`text-center ${FONT} text-xs uppercase tracking-[0.15em] text-neutral-500`}
        >
          {settings.bestOf === "unlimited"
            ? "Limitsiz seriya"
            : `${settings.bestOf} raundluq seriya · ${target} qələbə lazımdır`}
        </p>

        <PlayerSearch
          data={data}
          disabled={activeCell === null || settings.multipleChoice || roundOver}
          focusKey={`${activeCell}-${turnId}`}
          placeholder={
            activeCell !== null
              ? `${catText(rowCat)} × ${catText(colCat)}`
              : roundOver
                ? "Raund bitdi"
                : `${names[turn]}: xana seç`
          }
          onSelect={answer}
          onCancel={() => setActiveCell(null)}
        />

        {settings.multipleChoice && activeCell !== null && !roundOver && (
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
          {feedback?.text ?? `Raundu ${names[starter]} başlayır.`}
        </div>
      </div>

      <div className="mx-auto w-full lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-w-[calc((100svh-25rem)*1.33)]">
        <X0XBoard
          data={data}
          grid={grid}
          board={board}
          activeCell={activeCell}
          winLine={roundResult?.line ?? []}
          locked={roundOver}
          reveal={reveal}
          canPick={canPick}
          onPick={pickCell}
          corner={corner}
        />
      </div>

      <div className="flex flex-wrap gap-2 lg:col-start-2 lg:row-start-2 lg:content-start">
        {!roundOver ? (
          <button
            type="button"
            onClick={() => nextTurn(`${names[turn]} növbəni ötürdü.`)}
            className={BTN_GHOST}
          >
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <SkipForward className="h-4 w-4" />
            Növbəni ötür
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={matchOver ? newMatch : nextRound}
              className={BTN_PRIMARY}
            >
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              {matchOver ? "Yeni matç" : "Növbəti raund"}
            </button>
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className={BTN_GHOST}
            >
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <Eye className="h-4 w-4" />
              {reveal ? "Gizlət" : "Cavablar"}
            </button>
          </>
        )}
        {!roundOver && (
          <button type="button" onClick={giveUp} className={BTN_PRIMARY}>
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
        eyebrow={matchOver ? "Matç bitdi" : `Raund ${round} bitdi`}
        title={
          roundResult?.type === "draw"
            ? "Heç-heçə"
            : matchOver
              ? `Matçı ${winnerName} qazandı!`
              : roundResult?.gaveUp
                ? `${names[roundResult.gaveUp]} təslim oldu`
                : `Raundu ${winnerName} qazandı!`
        }
        actions={
          <>
            <button
              type="button"
              onClick={matchOver ? newMatch : nextRound}
              className={BTN_PRIMARY}
            >
              <span aria-hidden="true" className={SWEEP_WHITE} />
              {matchOver ? "Yeni matç" : "Növbəti raund"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowResult(false);
                setReveal(true);
              }}
              className={BTN_GHOST}
            >
              <span aria-hidden="true" className={SWEEP_BLUE} />
              Cavablara bax
            </button>
          </>
        }
      >
        <p className={`${FONT} text-base text-neutral-400`}>
          Hesab:{" "}
          <span className="font-bold text-blue-400">
            {names.X} {wins.X}
          </span>{" "}
          –{" "}
          <span className="font-bold text-amber-300">
            {wins.O} {names.O}
          </span>
        </p>
      </ResultModal>
    </div>
  );
}
