import { useState } from "react";
import { FONT } from "./ui";

export default function EntityBadge({ entity, size = "h-20 w-20 md:h-28 md:w-28", flagSize = "w-28 md:w-36" }) {
  const sources = entity.type === "club" ? [entity.image].filter(Boolean) : entity.images ?? [];
  const [index, setIndex] = useState(0);

  if (index < sources.length) {
    return (
      <img
        key={sources[index]}
        src={sources[index]}
        alt=""
        onError={() => setIndex((i) => i + 1)}
        className={
          entity.type === "country"
            ? `${flagSize} aspect-[4/3] object-cover shadow-[0_4px_16px_rgba(0,0,0,0.6)]`
            : `${size} object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]`
        }
      />
    );
  }
  if (entity.type === "country") return <span className="text-6xl leading-none md:text-7xl">{entity.flag}</span>;
  return <span className={`flex ${size} items-center justify-center bg-white/10 ${FONT} text-xl font-bold text-white`}>{entity.short}</span>;
}
