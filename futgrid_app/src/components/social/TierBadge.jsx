import { Gem, Medal } from "lucide-react";
import { tierOf } from "../../lib/tiers";

const FONT = "font-['Roboto_Condensed',sans-serif]";

/** Coloured rating-tier pill (Bürünc → Almaz). */
export default function TierBadge({ rating, size = "sm", className = "" }) {
  const tier = tierOf(rating);
  const Icon = tier.key === "diamond" || tier.key === "platinum" ? Gem : Medal;
  const sizes = size === "lg" ? "gap-1.5 px-2.5 py-1 text-xs" : "gap-1 px-2 py-0.5 text-[10px]";
  return (
    <span
      title={tier.label()}
      className={`inline-flex shrink-0 items-center rounded-full ring-1 ${tier.tone} ${sizes} ${FONT} font-extrabold uppercase tracking-[0.1em] ${className}`}
    >
      <Icon className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden="true" />
      {tier.label()}
    </span>
  );
}
