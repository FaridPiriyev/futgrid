import { useState } from "react";
import { FONT } from "../common/ui";

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function PlayerChip({ player, highlight = "" }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={`flex min-w-0 items-center gap-2 border border-white/10 bg-white/5 py-0.5 pl-0.5 pr-3 ${highlight}`}
    >
      {player.photo_url && !broken ? (
        <img
          src={player.photo_url}
          alt=""
          onError={() => setBroken(true)}
          className="h-7 w-7 shrink-0 object-cover object-top"
        />
      ) : (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center bg-white/10 ${FONT} text-[10px] font-bold text-neutral-300`}
        >
          {initials(player.name)}
        </span>
      )}
      <span
        className={`truncate ${FONT} text-sm font-bold uppercase tracking-wide text-white`}
      >
        {player.name}
      </span>
    </span>
  );
}

export function FoundPlayer({ player, title, side }) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`flex items-center gap-4 border-l-2 bg-emerald-500/10 p-2 ${side ? side.border : "border-l-emerald-400"}`}
    >
      {player.photo_url && !broken ? (
        <img
          src={player.photo_url}
          alt=""
          onError={() => setBroken(true)}
          className="h-14 w-14 shrink-0 object-cover object-top"
        />
      ) : (
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center bg-white/10 ${FONT} text-xl font-bold text-white`}
        >
          {initials(player.name)}
        </span>
      )}
      <div className="min-w-0">
        <p
          className={`${FONT} text-xs uppercase tracking-[0.15em] text-emerald-300`}
        >
          {title}
        </p>
        <p
          className={`truncate ${FONT} text-xl font-bold uppercase tracking-wide text-white`}
        >
          {player.name}
        </p>
      </div>
    </div>
  );
}

export default function AnswerList({ answers, exclude, limit = 8 }) {
  const list = answers.filter((p) => p.id !== exclude).slice(0, limit);
  if (!answers.length) return null;
  return (
    <div>
      <p
        className={`mb-2 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-neutral-400`}
      >
        Mümkün cavablar: {answers.length}
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {list.map((p) => (
          <PlayerChip key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}
