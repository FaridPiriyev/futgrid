import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Flag, RotateCcw, SkipForward } from "lucide-react";
import { useDuelRoom, duelErrorText } from "../../../lib/games/useDuelRoom";
import { cellCats, multipleChoice } from "../../../lib/games/x0x";
import { buildCategoryPool, countryName } from "../../../lib/games/x0xCategories";
import PlayerSearch from "../common/PlayerSearch";
import ResultModal from "../common/ResultModal";
import DuelLobby from "../common/DuelLobby";
import { DuelFooter, nameOf, stepKeyOf, useDuelClock, useStepFeedback } from "../common/DuelKit";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import X0XBoard from "./X0XBoard";
import X0XChoices from "./X0XChoices";
import X0XScoreboard from "./X0XScoreboard";
import X0XSettings from "./X0XSettings";
import { catText } from "./CategoryHeader";
import { OPTIONS } from "./settings";
import { tr } from "../../../i18n";

function resolveCategory(data, byKey, cat) {
  const local = byKey.get(cat.key);
  if (local) return local;
  if (cat.type === "club" && cat.club) return { ...cat, club: data.clubsById.get(cat.club.id) ?? cat.club };
  if (cat.type === "country" && cat.code) {
    const info = data.countriesByCode.get(cat.code);
    return {
      ...cat,
      label: countryName(cat.code, data) ?? cat.label,
      flagUrls: [info?.flag_url, `https://flagcdn.com/${cat.code.toLowerCase()}.svg`].filter(Boolean),
    };
  }
  return cat;
}

const optionLabel = (list, value) => list.find((o) => o.value === value)?.label ?? String(value);

export function x0xSummary(settings) {
  if (!settings) return [];
  const cats = [tr("Klub")];
  if (settings.categories?.country) cats.push(tr("Ölkə"));
  if (settings.categories?.trophy) cats.push(tr("Kubok"));
  if (settings.categories?.coach) cats.push(tr("Məşqçi"));
  return [
    { label: tr("Qələbə üçün"), value: optionLabel(OPTIONS.target, settings.target) },
    { label: tr("Çətinlik"), value: optionLabel(OPTIONS.difficulty, settings.difficulty) },
    { label: tr("Növbə vaxtı"), value: settings.timer ? tr("{n} san.", { n: settings.timer }) : tr("Limitsiz") },
    { label: tr("Oğurlama"), value: optionLabel(OPTIONS.steals, settings.steals) },
    { label: tr("Kateqoriyalar"), value: cats.join(", ") },
    ...(settings.multipleChoice ? [{ label: tr("Rejim"), value: tr("Çoxseçimli") }] : []),
  ];
}

function Match({ duel, data, settings }) {
  const state = duel.room?.state ?? {};
  const playing = duel.room?.status === "playing";
  const live = playing && state.phase === "play";
  const now = useDuelClock(duel, playing);
  const [feedbackError, setFeedbackError] = useStepFeedback(stepKeyOf(state));
  const [pick, setPick] = useState({ key: "", cell: null });
  const [reveal, setReveal] = useState(false);
  const [closedRound, setClosedRound] = useState(0);

  const marks = state.marks ?? {};
  const seatOf = (mark) => Object.keys(marks).find((seat) => marks[seat] === mark);
  const players = duel.room?.players ?? [];
  const names = {
    X: nameOf(players.find((p) => p.id === seatOf("X"))),
    O: nameOf(players.find((p) => p.id === seatOf("O"))),
  };
  const myMark = marks[duel.myId] ?? "X";
  const turnMark = marks[state.turn] ?? "X";
  const myTurn = live && state.turn === duel.myId;
  const round = state.round ?? 1;

  const byKey = useMemo(() => {
    const pool = buildCategoryPool(data);
    return new Map(Object.values(pool).flat().map((c) => [c.key, c]));
  }, [data]);
  const grid = useMemo(
    () => (state.grid ? { rows: state.grid.rows.map((c) => resolveCategory(data, byKey, c)), cols: state.grid.cols.map((c) => resolveCategory(data, byKey, c)) } : null),
    [data, byKey, state.grid],
  );
  const board = useMemo(() => (state.cells ?? Array(9).fill(null)).map((c) => (c ? { mark: c.mark, playerId: c.playerId, name: c.name } : null)), [state.cells]);
  const withIds = Boolean(grid && [...grid.rows, ...grid.cols].every((c) => c.ids));

  const turnKey = `${round}-${state.turn}-${state.lastEvent?.at ?? 0}`;
  const activeCell = myTurn && pick.key === turnKey ? pick.cell : null;
  const steals = state.steals;
  const myStealsLeft = steals ? steals[duel.myId] : 0;
  const canPick = (cell) => myTurn && (!board[cell] || (board[cell].mark !== myMark && (myStealsLeft === -1 || myStealsLeft > 0)));

  const choices = useMemo(
    () => (settings.multipleChoice && withIds && activeCell !== null ? multipleChoice(data, grid, activeCell, board) : []),
    [settings.multipleChoice, withIds, activeCell, data, grid, board],
  );

  const answer = async (player) => {
    if (activeCell === null) return;
    const cell = activeCell;
    setPick({ key: "", cell: null });
    const res = await duel.move({ cell, playerId: player.id });
    if (res?.error) setFeedbackError(duelErrorText(res.error.code));
  };

  const e = state.lastEvent;
  const markOfSeat = (seat) => marks[seat] ?? "X";
  const nextName = names[markOfSeat(state.turn)];
  let feedback = null;
  if (feedbackError) feedback = { type: "wrong", text: feedbackError };
  else if (activeCell !== null && board[activeCell])
    feedback = { type: "info", text: tr("{turn}, oğurlama: {name} əvəzinə başqa düzgün oyunçu yaz.", { turn: names[myMark], name: board[activeCell].name }) };
  else if (e && live) {
    const who = names[markOfSeat(e.seat)];
    if (e.type === "wrong") feedback = { type: "wrong", text: tr("{name} bu xanaya uyğun deyil. Növbə: {v2}.", { name: e.name, v2: nextName }) };
    else if (e.type === "used") feedback = { type: "wrong", text: tr("{name} artıq lövhədədir. Növbə: {v2}.", { name: e.name, v2: nextName }) };
    else if (e.type === "correct") feedback = { type: "ok", text: tr("{name} düzgündür!", { name: e.name }) };
    else if (e.type === "steal") feedback = { type: "ok", text: tr("{turn} xananı oğurladı: {name}!", { turn: who, name: e.name }) };
    else if (e.type === "pass") feedback = { type: "info", text: tr("{turn} növbəni ötürdü.", { turn: who }) };
    else if (e.type === "timeout") feedback = { type: "wrong", text: tr("Vaxt bitdi. Növbə: {v1}.", { v1: nextName }) };
  }

  const [rowCat, colCat] = activeCell !== null && grid ? cellCats(grid, activeCell) : [];
  const timeLeft = live && state.deadline ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null;
  const wins = { X: state.wins?.[seatOf("X")] ?? 0, O: state.wins?.[seatOf("O")] ?? 0 };
  const stealView = steals
    ? { X: steals[seatOf("X")] === -1 ? Infinity : steals[seatOf("X")] ?? 0, O: steals[seatOf("O")] === -1 ? Infinity : steals[seatOf("O")] ?? 0 }
    : null;
  const roundOver = state.phase === "round" || !playing;
  const result = state.result;
  const winnerName = result?.seat ? names[markOfSeat(result.seat)] : "";
  const iReady = (state.ready ?? []).includes(duel.myId);
  const nextIn = state.phase === "round" && state.deadline ? Math.max(0, Math.ceil((state.deadline - now) / 1000)) : null;
  const modalOpen = playing && state.phase === "round" && closedRound !== round;
  const target = settings.target ?? 2;

  const corner = (
    <span className="text-center">
      <span className={`block ${FONT} text-xl font-bold uppercase leading-none text-ink md:text-3xl`}>{myMark}</span>
      <span className={`mt-1 block ${FONT} text-[10px] uppercase tracking-wider text-accent-hi md:text-xs`}>
        {tr("Raund")} {round}
      </span>
    </span>
  );

  const nextButton = (
    <button type="button" onClick={() => void duel.move({ action: "next" })} disabled={iReady} className={`${BTN_PRIMARY} disabled:opacity-60`}>
      <span aria-hidden="true" className={SWEEP_WHITE} />
      <RotateCcw className="h-4 w-4" />
      {iReady ? tr("Rəqib gözlənilir…") : tr("Növbəti raund")}
    </button>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-6">
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <X0XScoreboard names={names} turn={turnMark} wins={wins} steals={stealView} timeLeft={timeLeft} timer={settings.timer} roundOver={roundOver} />

        <p className={`text-center ${FONT} text-xs uppercase tracking-[0.15em] text-faint`}>
          {tr("Raund {round}", { round })} · {tr("{n} raund qələbəsinə qədər", { n: target })} · {tr("Sən")}: <span className="font-bold text-ink">{myMark}</span>
        </p>

        <PlayerSearch
          data={data}
          disabled={activeCell === null || settings.multipleChoice || roundOver}
          focusKey={`${activeCell}-${turnKey}`}
          placeholder={
            activeCell !== null && rowCat && colCat
              ? `${catText(rowCat)} × ${catText(colCat)}`
              : roundOver
                ? tr("Raund bitdi")
                : myTurn
                  ? tr("{turn}: xana seç", { turn: names[myMark] })
                  : tr("{opp} düşünür…", { opp: names[turnMark] })
          }
          onSelect={(p) => void answer(p)}
          onCancel={() => setPick({ key: "", cell: null })}
        />

        {settings.multipleChoice && activeCell !== null && !roundOver && <X0XChoices options={choices} onSelect={(p) => void answer(p)} />}

        <div
          aria-live="polite"
          className={`min-h-11 border-l-2 px-4 py-2.5 ${FONT} text-sm md:text-base ${
            feedback?.type === "ok"
              ? "border-l-good bg-good-lo/10 text-good-hi"
              : feedback?.type === "wrong"
                ? "border-l-bad-lo bg-bad-lo/10 text-bad-hi"
                : "border-l-line/20 bg-line/5 text-muted"
          }`}
        >
          {feedback?.text ??
            (roundOver && result
              ? result.type === "draw"
                ? tr("Heç-heçə")
                : tr("Raundu {winnerName} qazandı!", { winnerName })
              : myTurn
                ? tr("Növbə səndədir — xana seç.")
                : tr("Raundu {starter} başlayır.", { starter: names[markOfSeat(state.starter)] }))}
        </div>
      </div>

      <div className="mx-auto w-full lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-w-[calc((100svh-25rem)*1.33)]">
        {grid ? (
          <X0XBoard
            data={data}
            grid={grid}
            board={board}
            activeCell={activeCell}
            winLine={result?.line ?? []}
            locked={roundOver || !myTurn}
            reveal={reveal && withIds}
            canPick={canPick}
            onPick={(cell) => setPick({ key: turnKey, cell })}
            corner={corner}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 lg:col-start-2 lg:row-start-2 lg:content-start">
        {!roundOver ? (
          <>
            {myTurn ? (
              <button type="button" onClick={() => void duel.move({ action: "pass" })} className={BTN_GHOST}>
                <span aria-hidden="true" className={SWEEP_BLUE} />
                <SkipForward className="h-4 w-4" />
                {tr("Növbəni ötür")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(tr("Bu raundu rəqibə verirsən. Əminsən?"))) void duel.move({ action: "giveup" });
              }}
              className={BTN_GHOST}
            >
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <Flag className="h-4 w-4" />
              {tr("Raundu ver")}
            </button>
          </>
        ) : (
          <>
            {playing && state.phase === "round" ? nextButton : null}
            {withIds ? (
              <button type="button" onClick={() => setReveal((v) => !v)} className={BTN_GHOST}>
                <span aria-hidden="true" className={SWEEP_BLUE} />
                <Eye className="h-4 w-4" />
                {reveal ? tr("Gizlət") : tr("Cavablar")}
              </button>
            ) : null}
          </>
        )}
      </div>

      <ResultModal
        open={modalOpen}
        onClose={() => setClosedRound(round)}
        eyebrow={tr("Raund {round} bitdi", { round })}
        title={
          result?.type === "draw"
            ? tr("Heç-heçə")
            : result?.gaveUp
              ? tr("{gaveUp} təslim oldu", { gaveUp: names[markOfSeat(result.gaveUp)] })
              : tr("Raundu {winnerName} qazandı!", { winnerName })
        }
        actions={
          <>
            {nextButton}
            {withIds ? (
              <button
                type="button"
                onClick={() => {
                  setClosedRound(round);
                  setReveal(true);
                }}
                className={BTN_GHOST}
              >
                <span aria-hidden="true" className={SWEEP_BLUE} />
                {tr("Cavablara bax")}
              </button>
            ) : null}
          </>
        }
      >
        <p className={`${FONT} text-base text-muted`}>
          {tr("Hesab:")} <span className="font-bold text-accent-hi">{names.X} {wins.X}</span> –{" "}
          <span className="font-bold text-gold-hi">{wins.O} {names.O}</span>
        </p>
        {nextIn != null ? <p className={`mt-2 ${FONT} text-sm text-faint`}>{tr("Növbəti raund {n} saniyəyə başlayır", { n: nextIn })}</p> : null}
      </ResultModal>
    </div>
  );
}

export default function X0XDuel({ data, settings, onSettingsChange, available = {}, onSettings }) {
  const [params] = useSearchParams();
  const duel = useDuelRoom({ game: "xox", invitedCode: params.get("otaq") ?? "" });
  const roomSettings = duel.room?.settings ?? settings;
  return (
    <DuelLobby
      duel={duel}
      onBack={onSettings}
      summary={x0xSummary(duel.room?.settings)}
      setup={({ create, connected }) => (
        <X0XSettings
          mode="online"
          settings={settings}
          onChange={onSettingsChange}
          onStart={() => create({ ...settings, timer: settings.timer || 40, categories: settings.categories })}
          onBack={onSettings}
          available={available}
          connected={connected}
        />
      )}
    >
      <div className="space-y-4">
        <Match duel={duel} data={data} settings={roomSettings} />
        <DuelFooter duel={duel} onSettings={onSettings} />
      </div>
    </DuelLobby>
  );
}
