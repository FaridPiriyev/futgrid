import { useEffect, useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { GRIDS } from "../../../lib/games/pixel";
import { FONT } from "../common/ui";

import { tr } from "../../../i18n";

export const PIXEL_KEYFRAMES = `
@keyframes pxIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes pxShake { 0%,100% { transform: translateX(0); } 25%,75% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
@keyframes pxPop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
@keyframes pxBuzz { 0%,100% { box-shadow: 0 0 0 0 var(--px-glow); } 50% { box-shadow: 0 0 0 10px transparent; } }
`;

/**
 * Şəkil + xana örtüyü. order: açılma sırası, opened: neçə xana açılıb, all: hamısını aç.
 */
export default function PixelBoard({ player, size, order, opened, all = false, onReady, onBroken, className = "" }) {
  const { cols, rows } = GRIDS[size] ?? GRIDS[16];
  const [state, setState] = useState("loading");
  const open = useMemo(() => new Set(order.slice(0, all ? order.length : opened)), [order, opened, all]);

  useEffect(() => {
    setState("loading");
  }, [player?.id]);

  return (
    <div
      data-theme="dark"
      className={`relative aspect-square w-full overflow-hidden rounded-2xl bg-navy shadow-[0_30px_60px_-36px_var(--fg-shadow)] ring-1 ring-black/10 ${className}`}
    >
      {player && (
        <img
          key={player.id}
          src={player.photo_url}
          alt=""
          draggable={false}
          onLoad={() => {
            setState("ready");
            onReady?.();
          }}
          onError={() => {
            setState("broken");
            onBroken?.();
          }}
          className="absolute inset-0 h-full w-full select-none object-cover object-top"
        />
      )}
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}
      >
        {Array.from({ length: cols * rows }, (_, i) => {
          const shown = open.has(i) && state === "ready";
          return (
            <span
              key={i}
              className={`relative grid place-items-center border-[1.5px] border-[#08102a] bg-[linear-gradient(140deg,#1a2b63_0%,#0f1b45_55%,#0a1333_100%)] transition-[opacity,transform] duration-500 ease-out ${
                shown ? "scale-90 opacity-0" : "scale-100 opacity-100"
              }`}
            >
              <span aria-hidden="true" className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle,white_1px,transparent_1.5px)] [background-size:10px_10px]" />
              <span className={`relative ${FONT} text-sm font-black text-white/15 md:text-base`}>{i + 1}</span>
            </span>
          );
        })}
      </div>
      {state === "loading" && player && (
        <span className="absolute inset-x-0 bottom-3 text-center">
          <span className={`rounded-full bg-black/40 px-3 py-1 ${FONT} text-xs font-bold uppercase tracking-wider text-white/80`}>
            {tr("Şəkil yüklənir...")}
          </span>
        </span>
      )}
      {state === "broken" && (
        <span className="absolute inset-0 grid place-items-center bg-navy/80">
          <ImageOff className="h-10 w-10 text-white/50" />
        </span>
      )}
    </div>
  );
}

export function TileMeter({ size, opened }) {
  return (
    <div className="flex flex-wrap gap-1" aria-label={tr("{n}/{max} xana açıldı", { n: opened, max: size })}>
      {Array.from({ length: size }, (_, i) => (
        <span key={i} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i < opened ? "bg-gold" : "bg-line/15"}`} />
      ))}
    </div>
  );
}
