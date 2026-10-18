import { useState } from "react";
import { ClipboardList, Trophy } from "lucide-react";
import ClubBadge from "../common/ClubBadge";
import { FONT } from "../common/ui";

function Caption({ label, sub }) {
  return (
    <>
      <span
        className={`line-clamp-2 ${FONT} text-[11px] font-bold uppercase leading-tight tracking-wide text-neutral-200 md:text-sm`}
      >
        {label}
      </span>
      {sub && (
        <span
          className={`line-clamp-1 ${FONT} text-[10px] uppercase leading-tight text-neutral-500 md:text-xs`}
        >
          {sub}
        </span>
      )}
    </>
  );
}

function Picture({ src, className, fallback }) {
  const sources = [src].flat().filter(Boolean);
  const [index, setIndex] = useState(0);
  if (index >= sources.length) return fallback;
  return (
    <img
      key={sources[index]}
      src={sources[index]}
      alt=""
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
      className={className}
    />
  );
}

const ICON = "h-10 w-10 md:h-12 md:w-12";

function Visual({ cat }) {
  if (cat.type === "country") {
    return (
      <Picture
        src={cat.flagUrls}
        className="h-9 w-12 object-cover shadow-[0_2px_8px_rgba(0,0,0,0.6)] md:h-11 md:w-16"
        fallback={
          <span className="text-4xl leading-none md:text-5xl">{cat.flag}</span>
        }
      />
    );
  }
  if (cat.type === "trophy") {
    return (
      <>
        <Picture
          src={cat.image}
          className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          fallback={<Trophy className={`${ICON} text-amber-300`} />}
        />
        {cat.min > 1 && (
          <span
            className={`absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1 ${FONT} text-xs font-bold text-black`}
          >
            {cat.min}+
          </span>
        )}
      </>
    );
  }
  return (
    <Picture
      src={cat.photo}
      className="h-full w-full rounded-full object-cover"
      fallback={<ClipboardList className={`${ICON} text-violet-300`} />}
    />
  );
}

export default function CategoryHeader({ cat }) {
  if (cat.type === "club") return <ClubBadge club={cat.club} />;

  const sub =
    cat.type === "trophy"
      ? cat.min > 1
        ? `${cat.min} dəfə qalib`
        : "qalibi"
      : cat.sub;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2 text-center">
      <div className="relative flex h-12 w-12 items-center justify-center md:h-16 md:w-16">
        <Visual cat={cat} />
      </div>
      <Caption label={cat.label} sub={sub} />
    </div>
  );
}

export const catText = (cat) =>
  cat.type === "trophy"
    ? `${cat.label} ${cat.min > 1 ? `(${cat.min}+ dəfə)` : "qalibi"}`
    : cat.sub
      ? `${cat.label} (${cat.sub})`
      : cat.label;
