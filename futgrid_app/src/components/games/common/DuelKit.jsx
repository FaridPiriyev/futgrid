import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Crown, DoorOpen, Flag as FlagIcon, Handshake, RotateCcw, Swords, Trophy, WifiOff, X } from "lucide-react";
import { FONT } from "./ui";
import { tr } from "../../../i18n";

export const DUEL_KEYFRAMES = `
@keyframes duelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes duelPop { 0% { transform: scale(.85); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
@keyframes duelPulse { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--duel-c) 45%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--duel-c) 0%, transparent); } }
@keyframes duelShake { 0%,100% { transform: none; } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
`;

const DIGITS = "font-['Tektur',sans-serif]";
export const DUEL_BTN = `inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 ${FONT} text-sm font-bold uppercase tracking-[0.06em] transition-[background-color,border-color,color,transform,opacity] duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40`;
export const DUEL_BTN_MAIN = `${DUEL_BTN} bg-accent-lo text-white enabled:hover:bg-accent`;
export const DUEL_BTN_LINE = `${DUEL_BTN} border border-line/20 text-ink enabled:hover:border-accent enabled:hover:text-accent`;

export const TONE = {
  me: { text: "text-accent", bg: "bg-accent-lo", soft: "bg-accent/12", border: "border-accent/60", c: "var(--fg-accent)" },
  them: { text: "text-yellow", bg: "bg-yellow", soft: "bg-yellow/15", border: "border-yellow/70", c: "var(--fg-yellow)" },
};
export const toneOf = (duel, seat) => (seat === duel.myId ? TONE.me : TONE.them);
export const nameOf = (player) => {
  if (!player) return tr("Rəqib");
  if (player.guest && /^Qonaq [0-9A-F]{4}$/.test(player.name ?? "")) return `${tr("Qonaq")} ${player.name.slice(6)}`;
  return player.displayName || player.name || tr("Rəqib");
};

export function useDuelClock(duel, active = true, ms = 200) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return duel.serverNow();
}

export function DuelAvatar({ player, tone, size = "h-11 w-11" }) {
  const name = nameOf(player);
  if (player?.avatarUrl)
    return <img src={player.avatarUrl} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-line/15`} />;
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full ${tone.bg} ${tone === TONE.them ? "text-on-yellow" : "text-white"} ${FONT} text-base font-extrabold`}>
      {name[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function PlayerCard({ duel, player, score, active, now, mark, align }) {
  const tone = toneOf(duel, player?.id);
  const me = player?.id === duel.myId;
  const offline = player && !player.connected;
  const left = offline && player.forfeitAt ? Math.max(0, Math.ceil((player.forfeitAt - now) / 1000)) : null;
  return (
    <div
      style={{ "--duel-c": tone.c }}
      className={`relative flex min-w-0 items-center gap-2.5 rounded-[14px] border px-2.5 py-2 transition-[border-color,background-color] duration-300 sm:gap-3 sm:px-3.5 sm:py-3 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      } ${active ? `${tone.border} ${tone.soft} animate-[duelPulse_1.6s_ease-in-out_infinite]` : "border-line/10 bg-surface"}`}
    >
      <div className={`relative shrink-0 ${score != null ? "hidden sm:block" : ""}`}>
        <DuelAvatar player={player} tone={tone} size="h-9 w-9 sm:h-11 sm:w-11" />
        {mark ? (
          <span className={`absolute -bottom-1 ${align === "right" ? "-left-1" : "-right-1"} grid h-5 w-5 place-items-center rounded-full bg-page ${FONT} text-[11px] font-black ${tone.text} ring-1 ring-line/15`}>
            {mark}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${FONT} text-sm font-extrabold uppercase text-ink sm:text-base`}>{nameOf(player)}</p>
        <p className={`truncate ${FONT} text-[11px] sm:text-xs ${offline ? "text-bad-hi" : active ? tone.text : "text-muted"}`}>
          {offline ? (
            <span className="inline-flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              {left != null ? tr("Bağlantı kəsildi · {n} san", { n: left }) : tr("Bağlantı kəsildi")}
            </span>
          ) : active ? (
            me ? tr("Sənin növbən") : tr("Növbə rəqibdə")
          ) : me ? (
            tr("Sən")
          ) : (
            tr("Rəqib")
          )}
        </p>
      </div>
      {score != null ? (
        <span key={score} className={`${DIGITS} text-2xl font-bold leading-none ${tone.text} animate-[duelPop_0.4s_ease-out] sm:text-3xl`}>
          {score}
        </span>
      ) : null}
    </div>
  );
}

export function TimerBar({ deadline, total, now, className = "" }) {
  if (!deadline || !total) return <div className={`h-1.5 ${className}`} />;
  const left = Math.max(0, deadline - now);
  const frac = Math.max(0, Math.min(1, left / total));
  const urgent = left <= 5000;
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-line/10 ${className}`}>
      <span
        className={`block h-full rounded-full transition-[width] duration-200 ease-linear ${urgent ? "bg-bad" : "bg-accent"}`}
        style={{ width: `${frac * 100}%` }}
      />
    </div>
  );
}

export function DuelScoreboard({ duel, scores, turn = null, deadline = null, total = null, label, sub, marks = {}, now }) {
  const me = duel.me;
  const them = duel.opponent;
  const left = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <PlayerCard duel={duel} player={me} score={scores?.[me?.id] ?? null} active={turn === me?.id} now={now} mark={marks[me?.id]} />
        <div className="min-w-12 text-center">
          {label ? <p className={`${FONT} text-[10px] font-bold uppercase tracking-[0.16em] text-muted sm:text-xs`}>{label}</p> : null}
          {left != null ? (
            <p className={`${DIGITS} text-xl font-bold leading-tight sm:text-2xl ${left <= 5 ? "text-bad-hi" : "text-ink"}`}>{left}</p>
          ) : (
            <p className={`${FONT} text-sm font-black text-faint`}>VS</p>
          )}
          {sub ? <p className={`${FONT} text-[10px] uppercase tracking-wider text-faint`}>{sub}</p> : null}
        </div>
        <PlayerCard duel={duel} player={them} score={scores?.[them?.id] ?? null} active={turn === them?.id} now={now} mark={marks[them?.id]} align="right" />
      </div>
      <TimerBar deadline={deadline} total={total} now={now} />
    </div>
  );
}

export const stepKeyOf = (state) => `${state?.round ?? state?.index ?? state?.lotNo ?? 0}-${state?.turn ?? ""}-${state?.lastEvent?.at ?? 0}`;

export function useStepFeedback(stepKey) {
  const [value, setValue] = useState({ key: null, text: "" });
  const set = useCallback((text) => setValue({ key: stepKey, text }), [stepKey]);
  return [value.key === stepKey ? value.text : "", set];
}

export function EventToast({ event, describe }) {
  const [shown, setShown] = useState(null);
  const lastAt = useRef(undefined);
  useEffect(() => {
    const at = event?.at ?? null;
    if (lastAt.current === undefined) {
      lastAt.current = at;
      return;
    }
    if (!at || at === lastAt.current) return;
    lastAt.current = at;
    const info = describe(event);
    if (!info) return;
    setShown({ ...info, key: event.at });
    const id = setTimeout(() => setShown(null), info.ms ?? 2600);
    return () => clearTimeout(id);
  }, [event, describe]);
  if (!shown) return <div className="h-0" />;
  const tone =
    shown.tone === "good"
      ? "border-good/40 bg-good/12 text-good-hi"
      : shown.tone === "bad"
        ? "border-bad/40 bg-bad/10 text-bad-hi animate-[duelShake_0.35s_ease-in-out]"
        : "border-line/15 bg-surface text-ink";
  const Icon = shown.tone === "good" ? Check : shown.tone === "bad" ? X : FlagIcon;
  return (
    <div key={shown.key} className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 ${FONT} text-sm font-bold animate-[duelIn_0.25s_ease-out] ${tone}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0">{shown.text}</span>
    </div>
  );
}

const REASON = {
  disconnect: (won) => (won ? tr("Rəqibin bağlantısı kəsildi və geri qayıtmadı.") : tr("Bağlantın kəsildi və vaxtında qayıtmadın.")),
  left: (won) => (won ? tr("Rəqib oyunu tərk etdi.") : tr("Oyunu tərk etdin.")),
  surrender: (won) => (won ? tr("Rəqib təslim oldu.") : tr("Təslim oldun.")),
};

const UNRATED = {
  guest: () => tr("Qonaqla oyun reytinqə təsir etmir."),
  too_short: () => tr("Oyun çox tez bitdi — reytinq dəyişmədi."),
  pair_limit: () => tr("Bu rəqiblə bu gün çox oynamısınız — reytinq dəyişmədi."),
  no_result: () => tr("Bu oyun reytinqə təsir etmədi."),
};

function EloLine({ duel }) {
  const rating = duel.rating;
  if (duel.me?.guest) {
    return (
      <p className={`mt-3 ${FONT} text-xs text-muted`}>
        {tr("Hesabla oynasan, hər duel Elo reytinqinə yazılır.")}
      </p>
    );
  }
  if (!rating) return null;
  if (!rating.rated || !rating.mine) {
    const text = UNRATED[rating.reason]?.() ?? UNRATED.no_result();
    return <p className={`mt-3 ${FONT} text-xs text-muted`}>{text}</p>;
  }
  const { after, delta } = rating.mine;
  const tone = delta > 0 ? "text-good-hi" : delta < 0 ? "text-bad-hi" : "text-muted";
  return (
    <p
      className={`mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-line/15 bg-line/5 px-3.5 py-1.5 ${FONT} text-sm font-bold animate-[duelIn_0.35s_ease-out]`}
    >
      <span className="uppercase tracking-wider text-muted">Elo</span>
      <span className="text-ink">{Math.round(after)}</span>
      <span className={tone}>
        ({delta > 0 ? "+" : ""}
        {delta})
      </span>
    </p>
  );
}

export function DuelFinished({ duel, detail }) {
  const room = duel.room;
  const quit = Boolean(REASON[room.endedReason]) && !room.winnerId && Boolean(room.loserId);
  const lostAlone = quit && room.loserId === duel.myId;
  const won = (Boolean(room.winnerId) && room.winnerId === duel.myId) || (quit && !lostAlone);
  const draw = !room.winnerId && !quit;
  const iAsked = room.rematch?.includes(duel.myId);
  const theyAsked = duel.opponent && room.rematch?.includes(duel.opponent.id);
  const reason =
    room.endedReason && REASON[room.endedReason] ? REASON[room.endedReason](room.loserId !== duel.myId) : null;
  const opponentGone = !duel.opponent || !duel.opponent.connected;
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border p-5 text-center animate-[duelIn_0.35s_ease-out] sm:p-6 ${
        won ? "border-good/40 bg-good/10" : draw ? "border-line/15 bg-surface" : "border-bad/35 bg-bad/8"
      }`}
    >
      <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${won ? "bg-yellow text-on-yellow" : draw ? "bg-line/10 text-ink" : "bg-bad/15 text-bad-hi"}`}>
        {won ? <Trophy className="h-7 w-7" /> : draw ? <Handshake className="h-7 w-7" /> : <Crown className="h-7 w-7" />}
      </span>
      <p className={`mt-3 ${FONT} text-3xl font-extrabold uppercase ${won ? "text-good-hi" : draw ? "text-ink" : "text-bad-hi"}`}>
        {won
          ? tr("Qazandın!")
          : draw
            ? tr("Heç-heçə")
            : lostAlone
              ? tr("Uduzdun")
              : tr("{name} qazandı", {
                  name: nameOf(room.players?.find((player) => player.id === room.winnerId) ?? duel.opponent),
                })}
      </p>
      <EloLine duel={duel} />
      {detail ? <div className={`mt-1 ${FONT} text-sm text-muted`}>{detail}</div> : null}
      {reason ? <p className={`mt-1 ${FONT} text-sm text-muted`}>{reason}</p> : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={() => void duel.rematch()} disabled={iAsked || opponentGone} className={DUEL_BTN_MAIN}>
          <RotateCcw className="h-4 w-4" />
          {iAsked ? tr("Rəqib gözlənilir…") : theyAsked ? tr("Revanşı qəbul et") : tr("Revanş")}
        </button>
        {room.random && duel.findNext ? (
          <button type="button" onClick={() => void duel.findNext()} className={DUEL_BTN_LINE}>
            <Swords className="h-4 w-4" />
            {tr("Yeni rəqib")}
          </button>
        ) : null}
        <button type="button" onClick={() => void duel.leaveRoom()} className={DUEL_BTN_LINE}>
          <DoorOpen className="h-4 w-4" />
          {tr("Otaqdan çıx")}
        </button>
      </div>
      {theyAsked && !iAsked ? (
        <p className={`mt-3 ${FONT} text-sm font-bold text-yellow`}>{tr("{name} revanş istəyir!", { name: nameOf(duel.opponent) })}</p>
      ) : null}
      {opponentGone ? <p className={`mt-3 ${FONT} text-xs text-faint`}>{tr("Rəqib otaqdan çıxıb.")}</p> : null}
    </div>
  );
}

export function DuelFooter({ duel, onSettings }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 pt-1 ${FONT} text-xs uppercase tracking-wider text-muted`}>
      <span>
        {tr("Otaq")} <span className={`${DIGITS} text-ink`}>{duel.room?.code}</span>
      </span>
      {duel.room?.status === "playing" ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(tr("Oyundan çıxsan, matçı uduzmuş sayılacaqsan. Əminsən?"))) void duel.surrender();
          }}
          className="hover:text-bad-hi"
        >
          {tr("Oyundan çıx")}
        </button>
      ) : null}
      {onSettings && duel.room?.status !== "playing" ? (
        <button
          type="button"
          onClick={async () => {
            await duel.leaveRoom();
            onSettings();
          }}
          className="hover:text-ink"
        >
          {tr("Rejimlər")}
        </button>
      ) : null}
    </div>
  );
}
