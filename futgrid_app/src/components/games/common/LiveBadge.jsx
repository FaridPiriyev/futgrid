import { tr } from "../../../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";

/** Small "● 12 playing" pill for game cards. Renders nothing when nobody is playing. */
export default function LiveBadge({ count, className = "" }) {
  if (!count) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 ${FONT} text-[11px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-70 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
      </span>
      {tr("{n} oynayır", { n: count })}
    </span>
  );
}
