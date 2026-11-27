import { tr } from "../i18n";

/**
 * Rating tiers for the overall rating (everyone starts at 1000 = Bronze).
 * The overall rating adds up changes from every game, so the steps are fairly wide.
 */
export const TIERS = [
  { key: "bronze", min: 0, label: () => tr("Bürünc"), tone: "bg-orange-400/15 text-orange-700 ring-orange-400/50 dark:text-orange-300" },
  { key: "silver", min: 1100, label: () => tr("Gümüş"), tone: "bg-slate-300/25 text-slate-700 ring-slate-400/60 dark:text-slate-200" },
  { key: "gold", min: 1250, label: () => tr("Qızıl"), tone: "bg-yellow/25 text-gold-hi ring-yellow/70" },
  { key: "platinum", min: 1500, label: () => tr("Platin"), tone: "bg-cyan-400/15 text-cyan-700 ring-cyan-400/60 dark:text-cyan-300" },
  { key: "diamond", min: 1800, label: () => tr("Almaz"), tone: "bg-violet-500/15 text-violet-700 ring-violet-400/60 dark:text-violet-300" },
];

export function tierOf(rating) {
  const value = Number(rating) || 1000;
  let tier = TIERS[0];
  for (const t of TIERS) if (value >= t.min) tier = t;
  return tier;
}

/** Points to the next tier, or null at the top. */
export function nextTier(rating) {
  const value = Number(rating) || 1000;
  const next = TIERS.find((t) => t.min > value);
  return next ? { tier: next, missing: next.min - value } : null;
}
