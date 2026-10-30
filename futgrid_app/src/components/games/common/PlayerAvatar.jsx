import { useState } from "react";
import { initials } from "../../../lib/games/playerInfo";
import { FONT } from "./ui";

export default function PlayerAvatar({
  player,
  className = "h-16 w-16",
  textClass = "text-xl",
}) {
  const [broken, setBroken] = useState(null);
  const src = player?.photo_url;
  const show = src && broken !== src;
  return (
    <span
      data-theme="dark"
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-line/10 bg-[radial-gradient(circle_at_50%_30%,#334155,#0b1220_70%)] ${className}`}
    >
      {show ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setBroken(src)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span className={`${FONT} font-bold text-ink/60 ${textClass}`}>
          {initials(player?.name)}
        </span>
      )}
    </span>
  );
}

export function Flag({ country, className = "h-3.5 w-5" }) {
  const [index, setIndex] = useState(0);
  if (!country) return null;
  const src = country.flags[index];
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
      className={`shrink-0 object-cover shadow-[0_1px_4px_rgba(0,0,0,0.5)] ${className}`}
    />
  );
}

export function ClubLogo({ club, className = "h-5 w-5" }) {
  const [broken, setBroken] = useState(false);
  if (!club?.logo || broken) return null;
  return (
    <img
      src={club.logo}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
