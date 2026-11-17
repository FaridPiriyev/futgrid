import { useState } from "react";
import { FONT } from "../common/ui";

import { tr } from "../../../i18n";
const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

// Oyunçu çipi: adı uzun olanda kəsilir, üstünə gələndə (və ya toxunanda)
// böyüdülmüş şəkil və tam ad olan kart animasiya ilə açılır.
export function PlayerChip({ player, highlight = "" }) {
  const [broken, setBroken] = useState(false);
  const hasPhoto = player.photo_url && !broken;
  return (
    <span
      tabIndex={0}
      aria-label={player.name}
      className={`group relative flex min-w-0 cursor-default items-center gap-2 border border-line/10 bg-line/5 py-0.5 pl-0.5 pr-3 outline-none transition-[border-color,background-color,transform] duration-200 hover:z-30 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent/10 focus-visible:z-30 focus-visible:border-accent/60 ${highlight}`}
    >
      {hasPhoto ? (
        <img
          src={player.photo_url}
          alt=""
          onError={() => setBroken(true)}
          className="h-7 w-7 shrink-0 object-cover object-top transition-transform duration-200 group-hover:scale-110"
        />
      ) : (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center bg-line/10 ${FONT} text-[10px] font-bold text-soft`}
        >
          {initials(player.name)}
        </span>
      )}
      <span
        className={`truncate ${FONT} text-sm font-bold uppercase tracking-wide text-ink`}
      >
        {player.name}
      </span>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-3 w-44 origin-bottom -translate-x-1/2 translate-y-2 scale-75 opacity-0 transition-all duration-300 ease-[cubic-bezier(.2,.9,.3,1.25)] group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100"
      >
        <span
          data-theme="dark"
          className="relative block overflow-hidden border border-accent/50 bg-[linear-gradient(160deg,#141c2e,#0a0d14)] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.9),0_0_24px_-6px_var(--fg-accent)]"
        >
          <span className="relative block h-40 w-full overflow-hidden bg-[radial-gradient(circle_at_50%_30%,color-mix(in_srgb,var(--fg-accent)_35%,transparent),transparent_70%)]">
            {hasPhoto ? (
              <img
                src={player.photo_url}
                alt=""
                className="h-full w-full scale-110 object-cover object-top transition-transform duration-500 ease-out group-hover:scale-100"
              />
            ) : (
              <span
                className={`flex h-full w-full items-center justify-center ${FONT} text-5xl font-bold text-ink/60`}
              >
                {initials(player.name)}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#0a0d14] to-transparent" />
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[linear-gradient(90deg,var(--fg-accent),var(--fg-yellow))]" />
          </span>
          <span
            className={`block px-3 pb-3 pt-2 text-center ${FONT} text-base font-bold uppercase leading-tight tracking-wide text-ink`}
          >
            {player.name}
          </span>
        </span>
        <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1.5 rotate-45 border-b border-r border-accent/50 bg-[#0a0d14]" />
      </span>
    </span>
  );
}

export function FoundPlayer({ player, title, side }) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`flex items-center gap-4 border-l-2 bg-good-lo/10 p-2 ${side ? side.border : "border-l-good"}`}
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
          className={`flex h-14 w-14 shrink-0 items-center justify-center bg-line/10 ${FONT} text-xl font-bold text-ink`}
        >
          {initials(player.name)}
        </span>
      )}
      <div className="min-w-0">
        <p
          className={`${FONT} text-xs uppercase tracking-[0.15em] text-good-hi`}
        >
          {title}
        </p>
        <p
          className={`truncate ${FONT} text-xl font-bold uppercase tracking-wide text-ink`}
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
        className={`mb-2 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-muted`}
      >
        {tr("Mümkün cavablar:")}{" "} {answers.length}
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {list.map((p) => (
          <PlayerChip key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}
