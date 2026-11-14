import { Copy, RotateCcw, Wifi } from "lucide-react";
import { Loader, Notice } from "./GameStatus";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "./ui";
import { tr } from "../../../i18n";

function Pill({ player, active, index }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${FONT} text-sm font-bold uppercase ${
        active ? "border-accent bg-accent/10 text-ink" : "border-line/15 bg-surface text-muted"
      }`}
    >
      <span className="grid h-5 w-5 place-items-center bg-accent text-[11px] text-white">
        {player?.name?.[0]?.toUpperCase() ?? index + 1}
      </span>
      {player?.name ?? tr("Gözlənilir...")}
    </span>
  );
}

export default function DuelLobby({ duel, children, playerNames }) {
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

      {duel.connected && !duel.room ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-accent`}>
            {tr("Otaq yaradılır...")}
          </p>
        </div>
      ) : null}

      {waiting ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className={`${FONT} text-sm font-bold uppercase tracking-[0.18em] text-accent`}>
            {tr("Otaq yaradıldı")}
          </p>
          <p className={`mt-1 ${FONT} text-3xl font-black tracking-[0.22em] text-ink`}>
            {duel.room.code}
          </p>
          <p className={`mt-2 break-all ${FONT} text-xs text-muted`}>{duel.inviteLink}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={duel.copyLink} className={BTN_PRIMARY}>
              <span aria-hidden="true" className={SWEEP_WHITE} />
              <Copy className="h-4 w-4" />
              {duel.copied ? tr("Kopyalandı") : tr("Linki kopyala")}
            </button>
            <span className={`inline-flex items-center gap-2 ${FONT} text-sm text-muted`}>
              <Wifi className="h-4 w-4 text-accent" />
              {tr("Dostun linkə keçəndə otağa qoşulacaq.")}
            </span>
          </div>
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
      {duel.room && duel.room.status === "playing" ? children : null}
    </div>
  );
}
