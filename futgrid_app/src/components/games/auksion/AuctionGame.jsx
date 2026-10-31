import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  bidAmount,
  botLimit,
  buildPool,
  canBid,
  newGame,
  nextPrice,
  passLot,
  placeBid,
  tick,
} from "../../../lib/games/auction";
import { BTN_GHOST, FONT, SWEEP_BLUE } from "../common/ui";
import AuctionResult from "./AuctionResult";
import {
  BidControls,
  Feed,
  LotCard,
  MiniTeam,
  PriceRow,
  TeamPanel,
} from "./AuctionParts";
import { KEYS, sideNames } from "./settings";

import { tr } from "../../../i18n";
const BOT_DELAY = {
  easy: [1200, 3600],
  normal: [700, 2600],
  hard: [500, 1800],
};

export default function AuctionGame({ data, mode, settings, onSettings }) {
  const timerMs = settings.timer * 1000;
  const solo = mode === "solo";
  const pool = useMemo(() => buildPool(data, settings.pool), [data, settings.pool]);
  const names = sideNames(mode, settings);
  const [round, setRound] = useState(0);
  const [state, setState] = useState(() =>
    newGame(pool, Math.random, Date.now(), timerMs),
  );
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  const botRef = useRef({ lotId: null, limit: 0 });
  stateRef.current = state;

  const done = state.phase === "done";

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((s) => tick(s, pool, Math.random, t, timerMs));
    }, 100);
    return () => clearInterval(id);
  }, [done, pool, timerMs]);

  const lot = state.lot;
  const botKey =
    solo && state.phase === "bid" && lot
      ? `${lot.id}|${lot.price}|${lot.leader}|${lot.passed.B}|${lot.passed.A}`
      : null;

  useEffect(() => {
    if (!botKey) return;
    const s = stateRef.current;
    if (!canBid(s, "B")) return;
    if (botRef.current.lotId !== s.lot.id)
      botRef.current = {
        lotId: s.lot.id,
        limit: botLimit(s.lot, s.teams.B, settings.bot, Math.random),
      };
    const [lo, hi] = BOT_DELAY[settings.bot] ?? BOT_DELAY.normal;
    const left = s.deadline - Date.now();
    const delay = Math.max(250, Math.min(lo + Math.random() * (hi - lo), left - 450));
    const t = setTimeout(() => {
      setState((cur) => {
        if (!canBid(cur, "B")) return cur;
        const limit = botRef.current.lotId === cur.lot.id ? botRef.current.limit : 0;
        if (nextPrice(cur.lot) > limit) return passLot(cur, "B");
        const jump = limit - nextPrice(cur.lot) >= 6 && Math.random() < 0.3 ? 2 : 1;
        const inc = bidAmount(cur.lot, jump) <= limit ? jump : 1;
        return placeBid(cur, "B", inc, Date.now(), timerMs);
      });
    }, delay);
    return () => clearTimeout(t);
  }, [botKey, settings.bot, timerMs]);

  const bid = useCallback(
    (side, inc) => setState((s) => placeBid(s, side, inc, Date.now(), timerMs)),
    [timerMs],
  );
  const pass = useCallback((side) => setState((s) => passLot(s, side)), []);

  useEffect(() => {
    const sides = solo ? ["A"] : ["A", "B"];
    const onKey = (e) => {
      if (e.repeat || e.target.closest?.("input, textarea")) return;
      const k = e.key.toLowerCase();
      for (const side of sides) {
        const i = KEYS[side].bids.indexOf(k);
        if (i >= 0) {
          bid(side, [1, 2, 4][i]);
          return;
        }
        if (k === KEYS[side].pass) {
          pass(side);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [solo, bid, pass]);

  const restart = () => {
    botRef.current = { lotId: null, limit: 0 };
    setState(newGame(pool, Math.random, Date.now(), timerMs));
    setRound((r) => r + 1);
  };

  if (done)
    return (
      <AuctionResult
        key={round}
        data={data}
        state={state}
        names={names}
        solo={solo}
        onAgain={restart}
        onSettings={onSettings}
      />
    );

  const controls = (side, extra = "") => (
    <div className={extra}>
      <BidControls
        side={side}
        state={state}
        names={names}
        onBid={bid}
        onPass={pass}
        showName={!solo}
        showKeys
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
          {tr("Lot")}{" "} <span className="font-bold text-ink">{state.lotNo}</span>
          <span className="mx-2 text-dim">·</span>
          {tr("Satılan")}{" "}
          <span className="font-bold text-ink">
            {state.log.filter((l) => l.winner).length}
          </span>
          /10
        </p>
        <button type="button" onClick={onSettings} className={`${BTN_GHOST} px-4! py-2!`}>
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">{tr("Parametrlər")}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <MiniTeam side="A" name={names.A} state={state} />
        <MiniTeam side="B" name={names.B} state={state} isBot={solo} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)_minmax(0,290px)]">
        <div className="hidden space-y-4 lg:block">
          <TeamPanel data={data} side="A" name={names.A} state={state} />
          {!solo && controls("A")}
        </div>

        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
          {lot && (
            <LotCard
              data={data}
              lot={lot}
              phase={state.phase}
              outcome={state.outcome}
              names={names}
            />
          )}
          {lot && <PriceRow state={state} names={names} now={now} timerMs={timerMs} />}
          {lot && controls("A", solo ? "w-full" : "w-full lg:hidden")}
          {lot && !solo && controls("B", "w-full lg:hidden")}
          <div className="hidden w-full lg:block">
            <Feed state={state} names={names} />
          </div>
        </div>

        <div className="hidden space-y-4 lg:block">
          <TeamPanel data={data} side="B" name={names.B} state={state} isBot={solo} />
          {!solo && controls("B")}
        </div>
      </div>
    </div>
  );
}
