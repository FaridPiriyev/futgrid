import { useState } from "react";
import { FONT } from "./ui";

export default function ClubBadge({ club, compact = false }) {
  const [broken, setBroken] = useState(false);
  const showLogo = club.logo_url && !broken;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center">
      <div
        className={`flex items-center justify-center ${
          compact ? "h-10 w-10" : "h-12 w-12 md:h-16 md:w-16"
        }`}
      >
        {showLogo ? (
          <img
            src={club.logo_url}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center bg-white/10 ${FONT} text-sm font-bold text-white`}
          >
            {club.short_name}
          </span>
        )}
      </div>
      <span
        className={`line-clamp-2 ${FONT} text-[11px] font-bold uppercase leading-tight tracking-wide text-neutral-300 md:text-sm`}
      >
        {club.name}
      </span>
    </div>
  );
}
