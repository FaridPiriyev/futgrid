import { useState } from "react";
import { KeyRound, Plus, RotateCcw } from "lucide-react";
import { Loader, Notice } from "./GameStatus";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "./ui";
import { tr } from "../../../i18n";

function Pill({ player, active, index }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${FONT} text-sm font-bold uppercase ${
        active ? "border-accent bg-accent/10 text-ink" : "border-line/15 bg-surface text-muted"
      }`}
    >
      {player?.avatarUrl ? (
        <img src={player.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
      ) : (
        <span className="grid h-5 w-5 place-items-center bg-accent text-[11px] text-white">
          {player?.name?.[0]?.toUpperCase() ?? index + 1}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate">{player?.displayName || player?.name || tr("Gözlənilir...")}</span>
        {player?.username ? <span className="block truncate text-[10px] normal-case tracking-normal text-muted">@{player.username}</span> : null}
      </span>
    </span>
  );
}

export default function DuelLobby({ duel, children, playerNames }) {
  const [joinCode, setJoinCode] = useState("");
  if (duel.loading) return <Loader text={tr("Yüklənir...")} />;

  if (!duel.connected && !duel.room) {
    return (
      <div className="space-y-3">
        <Notice
          title={tr("Onlayn oyuna qoşulmaq alınmadı")}
          text={duel.error || tr("Server işlədiyini yoxlayın.")}
        />
        <button type="button" onClick={duel.reconnect} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          {tr("Yenidən cəhd et")}
        </button>
      </div>
    );
  }

  const players = duel.room?.players ?? [];
  const waiting = duel.room?.status === "waiting";
  const finished = duel.room?.status === "finished";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill player={players[0]} index={0} active={duel.room?.status === "playing"} />
        <span className={`${FONT} text-sm font-black text-faint`}>VS</span>
        <Pill player={players[1]} index={1} active={duel.room?.status === "playing"} />
        {playerNames?.map((name, index) => (
          <span key={`${name}-${index}`} className={`${FONT} text-xs text-muted`}>
            {name}
          </span>
        ))}
      </div>

      {!duel.room ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-accent`}>
            {tr("Dostla oynamaq")}
          </p>
          {!duel.connected ? (
            <p className={`mt-2 ${FONT} text-sm text-muted`}>{tr("Serverə qoşulur...")}</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void duel.createRoom()}
                className={BTN_PRIMARY}
              >
                <span aria-hidden="true" className={SWEEP_WHITE} />
                <Plus className="h-4 w-4" />
                {tr("Otaq yarat")}
              </button>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder={tr("6 rəqəmli otaq ID")}
                  className={`min-w-0 flex-1 border-2 border-line/20 bg-surface px-3 py-2 ${FONT} text-lg font-bold tracking-[0.2em] text-ink outline-none focus:border-accent`}
                />
                <button
                  type="button"
                  disabled={joinCode.length !== 6}
                  onClick={() => void duel.joinRoom(joinCode)}
                  className={BTN_GHOST}
                >
                  <span aria-hidden="true" className={SWEEP_BLUE} />
                  <KeyRound className="h-4 w-4" />
                  {tr("Qoşul")}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {waiting ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
          <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-accent`}>
            {tr("Otaq ID")}
          </p>
          <p className={`mt-1 ${FONT} text-4xl font-black tracking-[0.3em] text-ink`}>
            {duel.room.code}
          </p>
          <p className={`mt-2 ${FONT} text-sm text-muted`}>
            {tr("Bu ID-ni dostuna göndər. O, “ID ilə qoşul” yerinə yazsın.")}
          </p>
        </div>
      ) : null}

      {finished ? (
        <div className="rounded-xl border border-good/30 bg-good/10 p-4 text-center">
          <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-good-hi`}>
            {duel.result?.winnerId === duel.myId
              ? tr("Qazandın!")
              : duel.result?.winnerId
                ? tr("Uduzdun")
                : tr("Heç-heçə")}
          </p>
          <button type="button" onClick={duel.rematch} className={`${BTN_PRIMARY} mt-3`}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <RotateCcw className="h-4 w-4" />
            {tr("Yenidən oyna")}
          </button>
        </div>
      ) : null}

      {duel.error ? <p className={`${FONT} text-sm font-bold text-bad-hi`}>{duel.error}</p> : null}
      {duel.room ? children : null}
    </div>
  );
}
