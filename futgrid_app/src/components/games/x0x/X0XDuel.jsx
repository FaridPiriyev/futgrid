import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, RotateCcw, Wifi } from "lucide-react";
import { io } from "socket.io-client";
import { getGuestId } from "../../../lib/api";
import PlayerSearch from "../common/PlayerSearch";
import { Notice } from "../common/GameStatus";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import X0XBoard from "./X0XBoard";

import { tr } from "../../../i18n";

function socketBase() {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const api = import.meta.env.VITE_API_URL || "http://localhost:3000/v1";
  return api.replace(/\/v1\/?$/, "").replace(/\/$/, "");
}

function PlayerPill({ player, mark, active }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${FONT} text-sm font-bold uppercase ${
        active ? "border-accent bg-accent/10 text-ink" : "border-line/15 bg-surface text-muted"
      }`}
    >
      <span className="grid h-5 w-5 place-items-center bg-accent text-[11px] text-white">{mark ?? "?"}</span>
      {player.name}
    </span>
  );
}

export default function X0XDuel({ data, onSettings }) {
  const [params] = useSearchParams();
  const myId = getGuestId();
  const socketRef = useRef(null);
  const roomRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeCell, setActiveCell] = useState(null);
  const [copied, setCopied] = useState(false);
  const invitedCode = params.get("otaq")?.toUpperCase() ?? "";

  const connect = useCallback(() => {
    setError("");
    const socket = io(socketBase(), {
      auth: { guestId: getGuestId() },
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (invitedCode) socket.emit("room:join", { code: invitedCode });
      else socket.emit("room:create", { game: "xox" });
    });
    socket.on("connect_error", (err) => {
      setConnected(false);
      setError(err?.message || tr("Serverə qoşulmaq mümkün olmadı"));
    });
    socket.on("room:state", (state) => {
      roomRef.current = state;
      setRoom(state);
      setResult(null);
    });
    socket.on("game:state", (state) => {
      roomRef.current = state;
      setRoom(state);
      setActiveCell(null);
    });
    socket.on("game:result", (state) => {
      roomRef.current = state;
      setRoom(state);
      setResult(state);
      setActiveCell(null);
    });
    socket.on("disconnect", (reason) => {
      setConnected(false);
      if (!roomRef.current) {
        setError((current) => current || `Socket bağlandı: ${reason}`);
      }
    });
    socket.on("error", (payload) => {
      const message = payload?.error?.message ?? payload?.error?.code ?? "ERROR";
      setError(String(message));
    });
  }, [invitedCode]);

  useEffect(() => {
    connect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  const state = room?.state ?? {};
  const grid = state.grid;
  const cells = state.cells ?? Array(9).fill(null);
  const marks = state.marks ?? {};
  const myMark = marks[myId];
  const myTurn = state.turn === myId;
  const players = room?.players ?? [];
  const code = room?.code ?? invitedCode;
  const inviteLink = code ? `${window.location.origin}/oyunlar/futbol-x0x?otaq=${code}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const pickCell = (cell) => {
    if (!myTurn || cells[cell]) return;
    setActiveCell(cell);
  };

  const answer = (player) => {
    if (activeCell === null || !socketRef.current) return;
    socketRef.current.emit("game:move", { code, cell: activeCell, playerId: player.id });
    setActiveCell(null);
  };

  const rematch = () => {
    if (!socketRef.current) return;
    setResult(null);
    socketRef.current.emit("game:rematch", { code });
  };

  const waiting = room?.status === "waiting";
  const playing = room?.status === "playing";
  const finished = room?.status === "finished";

  const board = useMemo(
    () => cells.map((cell) => (cell ? { mark: cell.mark, playerId: cell.playerId, name: cell.name } : null)),
    [cells],
  );

  if (!connected && !room) {
    return (
      <div className="space-y-3">
        <Notice
          title={tr("Onlayn oyuna qoşulmaq alınmadı")}
          text={error || tr("Server işlədiyini yoxlayın.")}
        />
        <button type="button" onClick={connect} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          {tr("Yenidən cəhd et")}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-6">
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <div className="flex flex-wrap items-center gap-2">
          <PlayerPill player={players[0] ?? { name: tr("Gözlənilir...") }} mark="X" active={playing && state.turn === players[0]?.id} />
          <span className={`${FONT} text-sm font-black text-faint`}>VS</span>
          <PlayerPill player={players[1] ?? { name: tr("Gözlənilir...") }} mark="O" active={playing && state.turn === players[1]?.id} />
        </div>

        {connected && !room && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-accent`}>
              {tr("Otaq yaradılır...")}
            </p>
            <p className={`mt-1 ${FONT} text-xs text-muted`}>
              {tr("Bir neçə saniyə gözləyin.")}
            </p>
          </div>
        )}

        {waiting && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-accent`}>{tr("Otaq yaradıldı")}</p>
            <p className={`mt-1 ${FONT} text-3xl font-black tracking-[0.22em] text-ink`}>{code}</p>
            <p className={`mt-2 break-all ${FONT} text-xs text-muted`}>{inviteLink}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={copyLink} className={BTN_PRIMARY}>
                <span aria-hidden="true" className={SWEEP_WHITE} />
                <Copy className="h-4 w-4" />
                {copied ? tr("Kopyalandı") : tr("Linki kopyala")}
              </button>
              <span className={`inline-flex items-center gap-2 ${FONT} text-sm text-muted`}>
                <Wifi className="h-4 w-4 text-accent" />
                {tr("Dostun linkə keçəndə otağa qoşulacaq.")}
              </span>
            </div>
          </div>
        )}

        {playing && (
          <div className="rounded-xl border border-line/15 bg-surface p-4">
            <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-muted`}>{tr("Növbə")}</p>
            <p className={`mt-1 ${FONT} text-xl font-black uppercase text-ink`}>
              {myTurn ? tr("Sənin növbəndir") : `${players.find((p) => p.id === state.turn)?.name ?? tr("Rəqib")} oynayır`}
            </p>
            <p className={`mt-1 ${FONT} text-xs text-faint`}>
              {tr("Xana seç, sonra iki kateqoriyaya uyğun futbolçunu yaz.")}
            </p>
          </div>
        )}

        {finished && result && (
          <div className="rounded-xl border border-good/30 bg-good/10 p-4 text-center">
            <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-good-hi`}>
              {result.winnerId === myId ? tr("Qazandın!") : result.winnerId ? tr("Uduzdun") : tr("Heç-heçə")}
            </p>
            <p className={`mt-1 ${FONT} text-xs text-muted`}>{result.endedReason}</p>
            <button type="button" onClick={rematch} className={`${BTN_PRIMARY} mt-3`}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <RotateCcw className="h-4 w-4" />
              {tr("Yenidən oyna")}
            </button>
          </div>
        )}

        {error && <p className={`${FONT} text-sm font-bold text-bad-hi`}>{error}</p>}

        <PlayerSearch
          data={data}
          disabled={activeCell === null || !myTurn}
          focusKey={`${activeCell}-${state.turn}`}
          placeholder={
            activeCell === null
              ? tr("Əvvəlcə xana seç")
              : tr("Uyğun futbolçunu yaz...")
          }
          onSelect={answer}
          onCancel={() => setActiveCell(null)}
        />

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onSettings} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            {tr("Parametrlər")}
          </button>
        </div>
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
            corner={
              <span className={`${FONT} text-xl font-black text-white md:text-3xl`}>
                {myMark ?? "X0X"}
              </span>
            }
          />
        ) : (
          <div className="grid aspect-square place-items-center border border-line/10 bg-surface">
            <p className={`${FONT} text-sm uppercase tracking-[0.2em] text-muted`}>
              {waiting ? tr("Dostun qoşulmasını gözləyirik...") : tr("Oyun hazırlanır...")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
