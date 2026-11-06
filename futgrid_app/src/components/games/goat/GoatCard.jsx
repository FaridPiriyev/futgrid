import { useState } from "react";
import { Check, Crown } from "lucide-react";
import { POS_SHORT } from "../../../lib/games/playerInfo";
import { countryFlag, countryName } from "../../../lib/games/x0xCategories";
import { FONT } from "../common/ui";

const SIDE = {
  left: {
    ring: "border-accent",
    glow: "shadow-[0_24px_60px_-28px_var(--fg-accent)]",
    hover: "enabled:hover:shadow-[0_24px_60px_-28px_var(--fg-accent)]",
    label: "left-0 bg-accent text-white",
    align: "left-3",
  },
  right: {
    ring: "border-yellow",
    glow: "shadow-[0_24px_60px_-28px_var(--fg-yellow)]",
    hover: "enabled:hover:shadow-[0_24px_60px_-28px_var(--fg-yellow)]",
    label: "right-0 bg-yellow text-on-yellow",
    align: "right-3",
  },
};

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function Portrait({ player, photo, data, compact = false, className = "" }) {
  const sources = Array.isArray(photo) ? photo : [photo].filter(Boolean);
  const [failed, setFailed] = useState({ key: "", n: 0 });
  const key = sources.join("|");
  const n = failed.key === key ? failed.n : 0;
  const src = sources[n];
  const show = Boolean(src);
  return (
    <span data-theme="dark" className={`fg-pitch absolute inset-0 overflow-hidden bg-navy ${className}`}>
      {show ? (
        <img
          key={src}
          src={src}
          alt=""
          onError={() => setFailed({ key, n: n + 1 })}
          className="absolute inset-0 h-full w-full object-cover object-[50%_18%]"
        />
      ) : compact ? (
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-lg leading-none">
          {countryFlag(player.code, data)}
        </span>
      ) : (
        <>
          <span aria-hidden="true" className="fg-halftone absolute inset-0 opacity-40" />
          <span
            aria-hidden="true"
            className={`absolute inset-0 grid place-items-center ${FONT} text-[clamp(4rem,14vw,10rem)] font-black italic leading-none text-transparent [-webkit-text-stroke:2px_rgba(255,255,255,0.35)]`}
          >
            {initialsOf(player.name)}
          </span>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-[22%] text-center text-5xl leading-none md:text-7xl">
            {countryFlag(player.code, data)}
          </span>
        </>
      )}
      {!compact && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 to-transparent" />}
    </span>
  );
}

export default function GoatCard({ player, photo, side, state, onPick, hotkey, data }) {
  const s = SIDE[side];
  const won = state === "won";
  const lost = state === "lost";
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={Boolean(state)}
      aria-label={player.name}
      className={`group relative block aspect-[3/4] w-full overflow-hidden rounded-2xl border-4 bg-navy text-left transition-[translate,scale,opacity,filter,box-shadow] duration-300 ease-out disabled:cursor-default sm:aspect-[4/5] lg:aspect-[5/4] ${s.ring} ${
        won ? `z-10 scale-[1.03] ${s.glow}` : lost ? "scale-95 opacity-35 grayscale" : `enabled:hover:-translate-y-1 ${s.hover}`
      }`}
    >
      <Portrait player={player} photo={photo} data={data} className="transition-[scale] duration-700 ease-out group-enabled:group-hover:scale-105" />

      <span className={`absolute top-3 ${s.align} flex items-center gap-1.5`}>
        <span className={`rounded-md bg-black/55 px-2 py-1 ${FONT} text-[11px] font-black uppercase tracking-wider text-white backdrop-blur-sm md:text-xs`}>
          {countryFlag(player.code, data)}<span className="ml-1 hidden sm:inline">{countryName(player.code, data)}</span>
        </span>
        <span className={`rounded-md bg-white/90 px-2 py-1 ${FONT} text-[11px] font-black uppercase text-navy md:text-xs`}>
          {POS_SHORT[player.pos] ?? player.pos}
        </span>
      </span>

      {hotkey && !state && (
        <span
          className={`absolute top-3 ${side === "left" ? "right-3" : "left-3"} hidden h-7 w-7 place-items-center rounded-md border border-white/30 bg-black/40 ${FONT} text-sm font-black text-white/80 lg:grid`}
        >
          {hotkey}
        </span>
      )}

      {won && (
        <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-good text-white shadow-2xl animate-[gtPop_0.35s_ease-out_both] md:h-20 md:w-20">
          <Check className="h-9 w-9 md:h-11 md:w-11" strokeWidth={3.5} />
        </span>
      )}

      <span className={`absolute bottom-3 max-w-[92%] md:bottom-5 ${s.label} -skew-x-12 px-3 py-1.5 shadow-lg md:px-5 md:py-2 ${side === "left" ? "origin-left" : "origin-right"}`}>
        <span className={`block skew-x-12 line-clamp-2 break-words ${FONT} text-sm font-black italic uppercase leading-tight tracking-wide sm:text-lg md:text-2xl`}>
          {player.name}
        </span>
      </span>
    </button>
  );
}

export function ChampionBadge() {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-full bg-yellow text-on-yellow shadow-lg">
      <Crown className="h-6 w-6" />
    </span>
  );
}
