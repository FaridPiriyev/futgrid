import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ClipboardPaste, DoorOpen, KeyRound, Loader2, Plus, RotateCcw, Share2, Shuffle, Swords, Wifi, X } from "lucide-react";
import { DUEL_KEYFRAMES, DuelFinished, nameOf } from "./DuelKit";
import { Loader, Notice } from "./GameStatus";
import { FONT } from "./ui";
import { tr } from "../../../i18n";
import { useSocial } from "../../../lib/social";
import { gameName } from "../../../lib/games/names";
import FriendsPanel from "../../social/FriendsPanel";
import MatchHeader from "./MatchHeader";

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
  const { openProfile } = useSocial();
  const profile = player && !player.guest && player.username ? () => openProfile(player.username) : null;
  return (
    <div
      role={profile ? "button" : undefined}
      tabIndex={profile ? 0 : undefined}
      onClick={profile ?? undefined}
      onKeyDown={profile ? (e) => (e.key === "Enter" ? profile() : null) : undefined}
      title={profile ? tr("Profilə bax") : undefined}
      className={`flex min-w-0 items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""} ${profile ? "cursor-pointer rounded-xl hover:opacity-85" : ""}`}
    >
      <Avatar player={player} index={index} />
      <div className="min-w-0">
        <p className={`truncate ${FONT} text-base font-extrabold uppercase ${player ? "text-ink" : "text-faint"}`}>
          {player ? nameOf(player) : tr("Gözlənilir…")}
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

/** Pulls a room code out of anything pasted: "645674", "645 674", a whole invite message or a ?otaq= link. */
const codeFrom = (text) => {
  const value = String(text ?? "");
  const fromLink = value.match(/otaq=(\d{6})/);
  if (fromLink) return fromLink[1];
  const six = value.match(/\d{3}\s?\d{3}/);
  if (six) return six[0].replace(/\s/g, "");
  return value.replace(/\D/g, "").slice(0, 6);
};

function JoinBox({ onJoin }) {
  const [code, setCode] = useState("");
  const [canPaste] = useState(() => typeof navigator !== "undefined" && Boolean(navigator.clipboard?.readText));
  const inputRef = useRef(null);
  const accept = (text) => {
    const next = codeFrom(text);
    setCode(next);
    if (next.length === 6) onJoin(next);
  };
  const pasteFromClipboard = async () => {
    try {
      accept(await navigator.clipboard.readText());
    } catch {
      inputRef.current?.focus();
    }
  };
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
          <p className={`${FONT} text-sm text-muted`}>{tr("Dostunun göndərdiyi 6 rəqəmi yaz və ya yapışdır")}</p>
        </div>
      </div>
      <label className="relative mt-5 block cursor-text" onClick={() => inputRef.current?.focus()}>
        <CodeTiles value={code} size="small" />
        <input
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(codeFrom(event.target.value))}
          onPaste={(event) => {
            event.preventDefault();
            accept(event.clipboardData.getData("text"));
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={tr("6 rəqəmli otaq ID")}
          className="absolute inset-0 h-full w-full cursor-text opacity-0"
        />
      </label>
      <div className="mt-4 flex gap-2">
        {canPaste ? (
          <button type="button" onClick={() => void pasteFromClipboard()} className={`${BTN_LINE} flex-1`}>
            <ClipboardPaste className="h-4.5 w-4.5" />
            {tr("Yapışdır")}
          </button>
        ) : null}
        <button type="submit" disabled={code.length !== 6} className={`${BTN_LINE} flex-1`}>
          {tr("Qoşul")}
        </button>
      </div>
    </form>
  );
}

function useElapsed(since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [since]);
  const seconds = since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
  return { seconds, label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` };
}

function RandomMatch({ duel }) {
  const searching = duel.searching;
  const { label: elapsed, seconds: waited } = useElapsed(searching?.since);
  if (searching) {
    return (
      <div className="relative overflow-hidden rounded-[18px] border border-accent/30 bg-accent/8 p-5 text-center animate-[duelIn_0.35s_ease-out] sm:p-7">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent">
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" />
        </span>
        <p className={`mt-4 ${FONT} text-2xl font-extrabold uppercase text-ink`}>{tr("Rəqib axtarılır…")}</p>
        <p className={`mt-1 ${DIGITS} text-3xl font-bold text-accent`} aria-live="off">
          {elapsed}
        </p>
        <p className={`mt-2 ${FONT} text-sm text-muted`}>
          {searching.searching > 1
            ? tr("Növbədə {n} oyunçu var", { n: searching.searching })
            : tr("Reytinqi sənə yaxın oyunçu axtarırıq. Gözləmə uzandıqca axtarış genişlənir.")}
        </p>
        {waited > 45 ? (
          <p className={`mx-auto mt-3 max-w-sm rounded-[10px] bg-yellow/12 px-3 py-2 ${FONT} text-sm text-ink`}>
            {tr("Hazırda onlayn oyunçu azdır. Axtarışı ləğv edib otaq yarada və kodu dostuna göndərə bilərsən.")}
          </p>
        ) : null}
        <button type="button" onClick={() => void duel.cancelMatch()} className={`${BTN_LINE} mt-5`}>
          <X className="h-4.5 w-4.5" />
          {tr("Ləğv et")}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-4 rounded-[18px] border border-accent/25 bg-gradient-to-br from-accent/12 to-transparent p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
        <Shuffle className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`${FONT} text-xs font-bold uppercase tracking-[0.18em] text-accent`}>{tr("Təsadüfi rəqib")}</p>
        <p className={`${FONT} text-xl font-extrabold uppercase text-ink`}>{tr("Onlayn rəqiblə oyna")}</p>
        <p className={`mt-0.5 ${FONT} text-sm text-muted`}>
          {tr("Sistem səni hazırda onlayn olan, reytinqi yaxın oyunçu ilə eşləşdirir. Standart qaydalarla oynanılır.")}
        </p>
      </div>
      <button
        type="button"
        disabled={!duel.connected}
        onClick={() => void duel.findMatch()}
        className={`${BTN_MAIN} w-full shrink-0 sm:w-auto`}
      >
        <Swords className="h-4.5 w-4.5" />
        {tr("Rəqib tap")}
      </button>
    </div>
  );
}

export function SettingsSummary({ items, dark = false }) {
  if (!items?.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map(({ label, value }) => (
        <li
          key={label}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${FONT} text-xs ${
            dark ? "border-white/15 bg-white/6 text-white" : "border-line/12 bg-line/5 text-ink"
          }`}
        >
          <span className={dark ? "text-navy-soft" : "text-muted"}>{label}:</span>
          <span className="font-bold">{value}</span>
        </li>
      ))}
    </ul>
  );
}

function WaitingRoom({ code, game, onLeave, summary }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?otaq=${code}` : "";
  const message = tr("{game}-də səni gözləyirəm ⚽ Otaq kodu: {code}", { game: gameName(game), code });
  // One button: the phone's share sheet (WhatsApp, Telegram, …) where available, otherwise copy.
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "FutGrid", text: message, url: link });
        return;
      }
      await navigator.clipboard.writeText(`${message}\n${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // share sheet closed
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
        <div className="flex flex-wrap gap-2.5 md:flex-col md:flex-nowrap">
          <button type="button" onClick={() => void share()} className={`${BTN} min-w-36 flex-1 whitespace-nowrap bg-yellow text-on-yellow hover:brightness-110 md:w-56 md:flex-none`}>
            {copied ? <Check className="h-4.5 w-4.5" /> : <Share2 className="h-4.5 w-4.5" />}
            {copied ? tr("Kopyalandı") : tr("Kodu paylaş")}
          </button>
          <button type="button" onClick={onLeave} className={`${BTN} basis-full whitespace-nowrap text-navy-soft hover:text-white md:w-56 md:basis-auto`}>
            <DoorOpen className="h-4.5 w-4.5" />
            {tr("Otağı bağla")}
          </button>
        </div>
      </div>
      <div className="relative mt-6">
        <p className={`mb-2 ${FONT} text-xs font-bold uppercase tracking-[0.18em] text-navy-soft`}>{tr("Otaq kodu")}</p>
        <div className="max-w-xl [&_span]:border-white/15 [&_span]:bg-white/6 [&_span]:text-white">
          <CodeTiles value={code} />
        </div>
      </div>
      {summary?.length ? (
        <div className="relative mt-5">
          <p className={`mb-2 ${FONT} text-xs font-bold uppercase tracking-[0.18em] text-navy-soft`}>{tr("Oyunun parametrləri")}</p>
          <SettingsSummary items={summary} dark />
        </div>
      ) : null}
    </div>
  );
}

function SetupStage({ duel, setup }) {
  return (
    <div className="space-y-4">
      {setup({ create: (settings) => void duel.createRoom(settings), connected: duel.connected })}
      <div className="mx-auto grid max-w-5xl items-center gap-4 rounded-2xl border border-edge bg-surface p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:p-6">
        <div>
          <p className={`${FONT} text-xs font-bold uppercase tracking-[0.18em] text-yellow`}>{tr("Dostun otaq yaradıb?")}</p>
          <p className={`mt-1 ${FONT} text-sm text-muted`}>
            {tr("Onun göndərdiyi 6 rəqəmli kodu yaz — parametrləri otağı quran seçib, sən sadəcə qoşulursan.")}
          </p>
          <span className={`mt-3 inline-flex items-center gap-1.5 ${FONT} text-xs text-muted`}>
            <Wifi className={`h-4 w-4 ${duel.connected ? "text-good-hi" : "text-faint"}`} />
            {duel.connected ? tr("Serverə qoşuldu") : tr("Serverə qoşulur...")}
          </span>
        </div>
        <JoinBox onJoin={(code) => void duel.joinRoom(code)} />
      </div>
    </div>
  );
}

export default function DuelLobby({ duel, children, finishedDetail = null, onBack = null, setup = null, summary = null, waitingActions = null }) {
  if (duel.loading && !duel.room) return <Loader text={tr("Otağa qoşulur...")} />;

  if (!duel.connected && !duel.room) {
    return (
      <div className="space-y-3">
        <Notice title={tr("Onlayn oyuna qoşulmaq alınmadı")} text={duel.error || tr("Server işlədiyini yoxlayın.")} />
        <div className="text-center">
          <button type="button" onClick={duel.reconnect} className={BTN_MAIN}>
            <RotateCcw className="h-4.5 w-4.5" />
            {tr("Yenidən cəhd et")}
          </button>
        </div>
      </div>
    );
  }

  const players = duel.room?.players ?? [];
  const waiting = duel.room?.status === "waiting";
  const finished = duel.room?.status === "finished";

  return (
    <div className="space-y-4">
      <style>{DUEL_KEYFRAMES}</style>
      {!duel.room && onBack && !setup ? (
        <div className="flex justify-end">
          <button type="button" onClick={onBack} className={`inline-flex items-center gap-2 ${FONT} text-sm font-bold uppercase tracking-wider text-muted hover:text-ink`}>
            <ArrowLeft className="h-4 w-4" />
            {tr("Rejimlər")}
          </button>
        </div>
      ) : null}
      {!duel.room && duel.findMatch ? <RandomMatch duel={duel} /> : null}
      {!duel.room && duel.searching ? null : (
        <>
          {!duel.room && setup ? <SetupStage duel={duel} setup={setup} /> : null}
          {!duel.room && !setup ? (
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

        </>
      )}

      {duel.room && !duel.connected && !finished ? (
        <p
          role="status"
          className={`sticky top-20 z-30 flex items-center justify-center gap-2 rounded-[12px] border border-yellow/40 bg-yellow/15 px-3 py-2.5 ${FONT} text-sm font-bold text-ink backdrop-blur`}
        >
          <Loader2 className="h-4 w-4 animate-spin text-yellow" />
          {waiting
            ? tr("Bağlantı kəsildi — bərpa olunur…")
            : tr("Bağlantı kəsildi — bərpa olunur. 30 saniyə ərzində qayıtmasan, matç uduzulmuş sayılır.")}
        </p>
      ) : null}
      {waiting ? <VersusBar players={players} myId={duel.myId} live={false} /> : null}
      {waiting ? <WaitingRoom code={duel.room.code} game={duel.room.game} onLeave={() => void duel.leaveRoom()} summary={summary} /> : null}
      {waiting && duel.canInvite ? <FriendsPanel onInvite={duel.invite} compact /> : null}
      {waiting && waitingActions ? waitingActions : null}

      {duel.error ? (
        <p role="alert" className={`rounded-[10px] border border-bad/30 bg-bad/8 px-3 py-2 ${FONT} text-sm font-bold text-bad-hi`}>
          {duel.error}
        </p>
      ) : null}

      {duel.room && !waiting ? <MatchHeader duel={duel} /> : null}
      {finished ? <DuelFinished duel={duel} detail={finishedDetail} /> : null}
      {duel.room && !waiting ? children : null}
    </div>
  );
}
