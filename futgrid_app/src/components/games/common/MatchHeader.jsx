import { Shield, UserRound, WifiOff } from "lucide-react";
import { useSocial } from "../../../lib/social";
import { useProfile } from "../../../lib/useProfile";
import { gameName } from "../../../lib/games/names";
import { nameOf } from "./DuelKit";
import TierBadge from "../../social/TierBadge";
import { FONT } from "./ui";
import { tr } from "../../../i18n";

const DIGITS = "font-['Tektur',sans-serif]";

const TONES = {
  me: {
    ring: "ring-accent",
    fill: "bg-accent-lo text-white",
    text: "text-accent",
    glow: "from-accent/25",
    border: "border-accent/35",
  },
  them: {
    ring: "ring-yellow",
    fill: "bg-yellow text-on-yellow",
    text: "text-yellow",
    glow: "from-yellow/25",
    border: "border-yellow/40",
  },
};

function BigAvatar({ player, profile, tone }) {
  const src = profile?.avatarUrl ?? player?.avatarUrl;
  const letter = nameOf(player)[0]?.toUpperCase() ?? "?";
  return (
    <span className="relative shrink-0">
      {src ? (
        <img
          src={src}
          alt=""
          className={`h-14 w-14 rounded-full object-cover ring-3 ${tone.ring} ring-offset-2 ring-offset-surface sm:h-20 sm:w-20`}
        />
      ) : (
        <span
          className={`grid h-14 w-14 place-items-center rounded-full ring-3 ${tone.ring} ring-offset-2 ring-offset-surface ${tone.fill} ${FONT} text-2xl font-black sm:h-20 sm:w-20 sm:text-3xl`}
        >
          {player?.guest ? <UserRound className="h-7 w-7 sm:h-9 sm:w-9" /> : letter}
        </span>
      )}
      {player && !player.connected ? (
        <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-bad text-white ring-2 ring-surface">
          <WifiOff className="h-3.5 w-3.5" />
        </span>
      ) : profile?.online || player?.connected ? (
        <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-good ring-3 ring-surface" />
      ) : null}
    </span>
  );
}

function Side({ player, game, align, mine, ratingVersion }) {
  const { openProfile } = useSocial();
  const registered = player && !player.guest && player.username;
  const profile = useProfile(registered ? player.username : null, ratingVersion);
  const tone = mine ? TONES.me : TONES.them;
  const gameRating = profile?.ratings?.find((row) => row.gameId === game)?.rating;
  const overall = profile?.duel?.rating;
  const right = align === "right";
  const open = registered ? () => openProfile(player.username) : null;

  return (
    <div
      role={open ? "button" : undefined}
      tabIndex={open ? 0 : undefined}
      onClick={open ?? undefined}
      onKeyDown={open ? (e) => e.key === "Enter" && open() : undefined}
      title={open ? tr("Profilə bax") : undefined}
      className={`group relative flex min-w-0 items-center gap-3 sm:gap-4 ${right ? "flex-row-reverse text-right" : ""} ${
        open ? "cursor-pointer" : ""
      }`}
    >
      <BigAvatar player={player} profile={profile} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className={`${FONT} text-[11px] font-bold uppercase tracking-[0.18em] ${tone.text}`}>
          {mine ? tr("Sən") : tr("Rəqib")}
        </p>
        <p
          className={`truncate ${FONT} text-lg font-black uppercase leading-tight text-ink transition-colors sm:text-2xl ${
            open ? "group-hover:text-accent" : ""
          }`}
        >
          {nameOf(player)}
        </p>
        {registered ? (
          <p className={`truncate ${FONT} text-xs text-muted sm:text-sm`}>@{player.username}</p>
        ) : (
          <p className={`${FONT} text-xs text-muted sm:text-sm`}>{tr("Qonaq oyunçu")}</p>
        )}
        {registered ? (
          <div className={`mt-1.5 flex flex-wrap items-center gap-1.5 ${right ? "justify-end" : ""}`}>
            <span
              title={gameName(game)}
              className={`inline-flex items-center gap-1 rounded-md bg-line/8 px-2 py-0.5 ${FONT} text-[11px] font-bold uppercase tracking-wide text-muted`}
            >
              {gameName(game)}
              <span className={`${DIGITS} text-[13px] text-ink`}>{gameRating ?? 1000}</span>
            </span>
            <TierBadge rating={overall ?? 1000} />
            {overall ? (
              <span className={`hidden items-center gap-1 rounded-md bg-line/8 px-2 py-0.5 ${FONT} text-[11px] font-bold uppercase tracking-wide text-muted sm:inline-flex`}>
                {tr("Ümumi")}
                <span className={`${DIGITS} text-[13px] text-ink`}>{overall}</span>
              </span>
            ) : null}
            {profile?.team ? (
              <span className={`hidden items-center gap-1 ${FONT} text-[11px] text-muted md:inline-flex`}>
                {profile.team.logoUrl ? (
                  <img src={profile.team.logoUrl} alt="" className="h-3.5 w-3.5 object-contain" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                {profile.team.name}
              </span>
            ) : null}
          </div>
        ) : null}
        {open && !mine ? (
          <span className={`mt-1 inline-block ${FONT} text-[11px] font-bold uppercase tracking-[0.14em] text-accent underline-offset-4 group-hover:underline`}>
            {tr("Profilə bax")} →
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Big "you vs opponent" header for online and friend duels: avatars, names, @username,
 * this game's rating and the overall rating. Tapping a registered player opens their profile.
 */
export default function MatchHeader({ duel }) {
  const room = duel.room;
  if (!room) return null;
  const players = room.players ?? [];
  const me = players.find((p) => p.id === duel.myId) ?? null;
  const others = players.filter((p) => p.id !== duel.myId);
  if (!others.length) return null;
  const ratingVersion = duel.rating?.mine?.after ?? 0;

  return (
    <section
      className={`relative overflow-hidden rounded-[20px] border border-line/10 bg-surface px-3 py-3.5 sm:px-6 sm:py-5`}
    >
      <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-linear-to-r ${TONES.me.glow} to-transparent opacity-60`} />
      <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-linear-to-l ${TONES.them.glow} to-transparent opacity-60`} />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <Side player={me} game={room.game} mine ratingVersion={ratingVersion} />
        <div className="flex flex-col items-center gap-1">
          <span
            className={`grid h-10 w-10 place-items-center rounded-full border border-line/15 bg-page ${FONT} text-sm font-black text-muted sm:h-12 sm:w-12 sm:text-base`}
          >
            VS
          </span>
          {room.random ? (
            <span className={`${FONT} text-[10px] font-bold uppercase tracking-[0.14em] text-faint`}>{tr("Onlayn")}</span>
          ) : (
            <span className={`${FONT} text-[10px] font-bold uppercase tracking-[0.14em] text-faint`}>{tr("Dostla")}</span>
          )}
        </div>
        <Side player={others[0]} game={room.game} align="right" ratingVersion={ratingVersion} />
      </div>
      {others.length > 1 ? (
        <div className="relative mt-3 grid gap-3 border-t border-line/8 pt-3 sm:grid-cols-2">
          {others.slice(1).map((player) => (
            <Side key={player.id} player={player} game={room.game} ratingVersion={ratingVersion} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
