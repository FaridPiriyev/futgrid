import { useRef, useState } from "react";
import { Check, Copy, KeyRound, Plus, RotateCcw, Share2, Swords, Trophy, Wifi } from "lucide-react";
import { Loader, Notice } from "./GameStatus";
import { FONT } from "./ui";
import { tr } from "../../../i18n";

const DIGITS = "font-['Tektur',sans-serif]";
const BTN = `inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] px-5 ${FONT} text-[15px] font-bold uppercase tracking-[0.08em] transition-[background-color,border-color,color,translate] duration-200 disabled:cursor-not-allowed disabled:opacity-45`;
const BTN_MAIN = `${BTN} bg-accent-lo text-white hover:-translate-y-0.5 hover:bg-accent disabled:translate-y-0`;
const BTN_LINE = `${BTN} border border-line/20 text-ink hover:border-accent hover:text-accent`;

function Avatar({ player, index, size = "h-11 w-11" }) {
  if (player?.avatarUrl)
    return <img src={player.avatarUrl} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-line/15`} />;
  if (!player)
    return (
      <span className={`grid ${size} shrink-0 place-items-center rounded-full border-2 border-dashed border-line/25 ${DIGITS} text-lg font-bold text-faint`}>
        ?
      </span>
    );
  const name = player.displayName || player.name || "";
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full ${index === 0 ? "bg-accent-lo" : "bg-yellow text-on-yellow"} ${FONT} text-base font-extrabold text-white`}
    >
      {name[0]?.toUpperCase() ?? index + 1}
    </span>
  );
}

function PlayerSide({ player, index, align = "left", me }) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <Avatar player={player} index={index} />
      <div className="min-w-0">
        <p className={`truncate ${FONT} text-base font-extrabold uppercase ${player ? "text-ink" : "text-faint"}`}>
          {player ? player.displayName || player.name : tr("Gözlənilir…")}
        </p>
        <p className={`truncate ${FONT} text-xs text-muted`}>
          {player ? (me ? tr("Sən") : player.username ? `@${player.username}` : tr("Rəqib")) : tr("Boş yer")}
        </p>
      </div>
    </div>
  );
}

function VersusBar({ players, myId, live }) {
  const extra = players.slice(2);
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-line/10 bg-surface px-4 py-3 sm:px-5">
      {live ? <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-accent via-yellow to-accent" /> : null}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <PlayerSide player={players[0]} index={0} me={players[0]?.id === myId} />
        <span className={`grid h-10 w-10 place-items-center rounded-full border border-line/15 bg-line/5 ${FONT} text-sm font-black text-muted`}>
          VS
        </span>
        <PlayerSide player={players[1]} index={1} align="right" me={players[1]?.id === myId} />
      </div>
      {extra.length ? (
        <p className={`mt-2 border-t border-line/8 pt-2 ${FONT} text-xs text-muted`}>
          + {extra.map((p) => p.displayName || p.name).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function CodeTiles({ value, size = "big" }) {
  const chars = String(value ?? "").padEnd(6, " ").slice(0, 6).split("");
  return (
    <div className={`grid grid-cols-6 ${size === "big" ? "gap-2 sm:gap-3" : "gap-1.5"}`}>
      {chars.map((c, i) => (
        <span
          key={i}
          className={`grid place-items-center rounded-[10px] border ${
            c.trim() ? "border-accent/50 bg-accent/10 text-ink" : "border-line/15 bg-line/4 text-faint"
          } ${DIGITS} font-bold ${size === "big" ? "h-15 text-[30px] sm:h-18 sm:text-[38px]" : "h-12 text-2xl"}`}
        >
          {c.trim() || "·"}
        </span>
      ))}
    </div>
  );
}

function JoinBox({ onJoin }) {
  const [code, setCode] = useState("");
  const inputRef = useRef(null);
  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) onJoin(code);
      }}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-yellow/15 text-yellow">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <p className={`${FONT} text-lg font-extrabold uppercase text-ink`}>{tr("Koda qoşul")}</p>
          <p className={`${FONT} text-sm text-muted`}>{tr("Dostunun göndərdiyi 6 rəqəmi yaz")}</p>
        </div>
      </div>
      {/* Görünən 6 xana — əslində bir input, üstünə basanda klaviatura açılır */}
      <label className="relative mt-5 block cursor-text" onClick={() => inputRef.current?.focus()}>
        <CodeTiles value={code} size="small" />
        <input
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          aria-label={tr("6 rəqəmli otaq ID")}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
      </label>
      <button type="submit" disabled={code.length !== 6} className={`${BTN_LINE} mt-4 w-full`}>
        {tr("Qoşul")}
      </button>
    </form>
  );
}

function WaitingRoom({ code }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?otaq=${code}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* brauzer icazə vermədi */
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: "FutGrid", text: tr("FutGrid-də mənə qoşul! Otaq kodu: {code}", { code }), url: link });
    } catch {
      /* paylaşım ləğv olundu */
    }
  };
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-accent/25 bg-navy p-5 text-white sm:p-7">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.025)_0_80px,transparent_80px_160px)]"
      />
      <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className={`inline-flex items-center gap-2 ${FONT} text-xs font-bold uppercase tracking-[0.18em] text-yellow`}>
            <span className="fg-blink h-2 w-2 rounded-full bg-yellow" />
            {tr("Rəqib gözlənilir…")}
          </p>
          <h3 className={`mt-2 ${FONT} text-2xl font-extrabold uppercase sm:text-3xl`}>{tr("Otaq hazırdır")}</h3>
          <p className={`mt-1.5 max-w-md ${FONT} text-sm text-navy-soft sm:text-[15px]`}>
            {tr("Kodu dostuna göndər. O, “Koda qoşul” hissəsinə yazan kimi oyun başlayacaq.")}
          </p>
        </div>
        <div className="flex gap-2.5 md:flex-col">
          <button type="button" onClick={() => void copy()} className={`${BTN} flex-1 bg-yellow text-on-yellow hover:brightness-110 md:w-56 md:flex-none`}>
            {copied ? <Check className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
            {copied ? tr("Kopyalandı") : tr("Kodu kopyala")}
          </button>
          {typeof navigator !== "undefined" && navigator.share ? (
            <button type="button" onClick={() => void share()} className={`${BTN} flex-1 border border-white/25 text-white hover:border-white/60 md:w-56 md:flex-none`}>
              <Share2 className="h-4.5 w-4.5" />
              {tr("Paylaş")}
            </button>
          ) : null}
        </div>
      </div>
      <div className="relative mt-6">
        <p className={`mb-2 ${FONT} text-xs font-bold uppercase tracking-[0.18em] text-navy-soft`}>{tr("Otaq kodu")}</p>
        <div className="max-w-xl [&_span]:border-white/15 [&_span]:bg-white/6 [&_span]:text-white">
          <CodeTiles value={code} />
        </div>
      </div>
    </div>
  );
}

export default function DuelLobby({ duel, children, showChildrenWhileWaiting = false }) {
  if (duel.loading) return <Loader text={tr("Yüklənir...")} />;

  if (!duel.connected && !duel.room) {
    return (
      <div className="space-y-3">
        <Notice title={tr("Onlayn oyuna qoşulmaq alınmadı")} text={duel.error || tr("Server işlədiyini yoxlayın.")} />
        <button type="button" onClick={duel.reconnect} className={BTN_MAIN}>
          <RotateCcw className="h-4.5 w-4.5" />
          {tr("Yenidən cəhd et")}
        </button>
      </div>
    );
  }

  const players = duel.room?.players ?? [];
  const waiting = duel.room?.status === "waiting";
  const playing = duel.room?.status === "playing";
  const finished = duel.room?.status === "finished";
  const won = duel.result?.winnerId === duel.myId;
  const draw = finished && !duel.result?.winnerId;

  return (
    <div className="space-y-4">
      {!duel.room ? (
        <div className="overflow-hidden rounded-[18px] border border-line/10 bg-surface">
          <div className="flex items-center gap-3 border-b border-line/8 px-5 py-4 sm:px-7">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
              <Swords className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className={`${FONT} text-xs font-bold uppercase tracking-[0.18em] text-accent`}>{tr("Dostla oyna")}</p>
              <p className={`${FONT} text-xl font-extrabold uppercase text-ink`}>{tr("Onlayn duel")}</p>
            </div>
            <span className={`ml-auto hidden items-center gap-1.5 ${FONT} text-xs text-muted sm:inline-flex`}>
              <Wifi className={`h-4 w-4 ${duel.connected ? "text-good-hi" : "text-faint"}`} />
              {duel.connected ? tr("Serverə qoşuldu") : tr("Serverə qoşulur...")}
            </span>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="flex flex-col border-b border-line/8 p-5 sm:p-7 md:border-b-0 md:border-r">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent">
                  <Plus className="h-5 w-5" />
                </span>
                <div>
                  <p className={`${FONT} text-lg font-extrabold uppercase text-ink`}>{tr("Otaq yarat")}</p>
                  <p className={`${FONT} text-sm text-muted`}>{tr("Kod alacaqsan, dostuna göndərəcəksən")}</p>
                </div>
              </div>
              <ol className={`mt-5 space-y-2 p-0 md:mb-6 ${FONT} text-sm text-muted`}>
                {[tr("Otaq yarat"), tr("6 rəqəmli kodu dostuna göndər"), tr("Dostun qoşulan kimi oyun başlayır")].map((t, i) => (
                  <li key={t} className="flex list-none items-center gap-2.5">
                    <span className={`grid h-6 w-6 place-items-center rounded-full bg-line/8 ${DIGITS} text-xs font-bold text-ink`}>{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                disabled={!duel.connected}
                onClick={() => void duel.createRoom()}
                className={`${BTN_MAIN} mt-5 w-full md:mt-auto`}
              >
                <Plus className="h-4.5 w-4.5" strokeWidth={2.4} />
                {tr("Otaq yarat")}
              </button>
            </div>
            <div className="p-5 sm:p-7">
              <JoinBox onJoin={(code) => void duel.joinRoom(code)} />
            </div>
          </div>
        </div>
      ) : null}

      {duel.room ? <VersusBar players={players} myId={duel.myId} live={playing} /> : null}

      {waiting ? <WaitingRoom code={duel.room.code} /> : null}

      {finished ? (
        <div
          className={`flex flex-col items-center gap-3 rounded-[18px] border p-5 text-center sm:p-6 ${
            won ? "border-good/40 bg-good/10" : draw ? "border-line/15 bg-surface" : "border-bad/35 bg-bad/8"
          }`}
        >
          <Trophy className={`h-8 w-8 ${won ? "text-yellow" : "text-muted"}`} />
          <p className={`${FONT} text-2xl font-extrabold uppercase ${won ? "text-good-hi" : draw ? "text-ink" : "text-bad-hi"}`}>
            {won ? tr("Qazandın!") : draw ? tr("Heç-heçə") : tr("Uduzdun")}
          </p>
          <button type="button" onClick={duel.rematch} className={BTN_MAIN}>
            <RotateCcw className="h-4.5 w-4.5" />
            {tr("Yenidən oyna")}
          </button>
        </div>
      ) : null}

      {duel.error ? <p className={`${FONT} text-sm font-bold text-bad-hi`}>{duel.error}</p> : null}
      {duel.room && (!waiting || showChildrenWhileWaiting) ? children : null}
    </div>
  );
}
