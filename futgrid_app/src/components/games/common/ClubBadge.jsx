import { useState } from "react";
import { FONT } from "./ui";

export default function ClubBadge({ club, compact = false }) {
  const [broken, setBroken] = useState(false);
  const showLogo = club.logo_url && !broken;

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center text-center ${
        compact ? "gap-1 p-1 sm:gap-2 sm:p-2" : "gap-2 p-2"
      }`}
    >
      <div
        className={`flex items-center justify-center ${
          compact ? "h-8 w-8 sm:h-10 sm:w-10" : "h-12 w-12 md:h-16 md:w-16"
        }`}
      >
        {showLogo ? (
          <img
            src={club.logo_url}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="fg-logo h-full w-full object-contain"
          />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center bg-line/10 ${FONT} text-sm font-bold text-ink`}
          >
            {club.short_name}
          </span>
        )}
      </div>
      <span
        className={`line-clamp-2 ${FONT} font-bold uppercase leading-tight text-soft ${
          compact
            ? "text-[10px] [overflow-wrap:anywhere] sm:text-[11px] sm:tracking-wide md:text-xs"
            : "text-[11px] tracking-wide md:text-sm"
        }`}
      >
        {club.name}
      </span>
    </div>
  );
}
