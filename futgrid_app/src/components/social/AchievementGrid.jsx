import { Lock } from "lucide-react";
import { achievementInfo } from "../../lib/achievements";
import { tr } from "../../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";

/** Showcase of earned (coloured) and locked (grey, with progress) achievements. */
export default function AchievementGrid({ items = [], compact = false }) {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const earned = items.filter((a) => a.unlocked).length;
  return (
    <div>
      <p className={`flex items-center justify-between ${FONT} text-xs font-bold uppercase tracking-[0.14em] text-muted`}>
        <span>{tr("Nişanlar")}</span>
        <span className="text-ink">
          {earned}/{items.length}
        </span>
      </p>
      <ul className={`mt-2 grid gap-2 ${compact ? "grid-cols-5" : "grid-cols-4 sm:grid-cols-5"}`}>
        {sorted.map((item) => {
          const info = achievementInfo(item.key);
          const Icon = info.Icon;
          const pct = Math.round((item.progress / item.target) * 100);
          return (
            <li
              key={item.key}
              title={`${info.title()} — ${info.text()}${item.unlocked ? "" : ` (${item.progress}/${item.target})`}`}
              className="flex flex-col items-center gap-1 text-center"
            >
              <span
                className={`relative grid h-12 w-12 place-items-center rounded-2xl ${
                  item.unlocked ? `bg-linear-to-br ${info.tone} text-white shadow-lg` : "bg-line/8 text-faint"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
                {!item.unlocked ? (
                  <>
                    <Lock className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-surface p-0.5 text-faint" />
                    <span className="absolute inset-x-1.5 bottom-1 h-1 overflow-hidden rounded-full bg-line/15">
                      <span className="block h-full bg-accent/70" style={{ width: `${pct}%` }} />
                    </span>
                  </>
                ) : null}
              </span>
              {!compact ? (
                <span className={`line-clamp-2 ${FONT} text-[10px] font-bold uppercase leading-tight ${item.unlocked ? "text-ink" : "text-faint"}`}>
                  {info.title()}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
