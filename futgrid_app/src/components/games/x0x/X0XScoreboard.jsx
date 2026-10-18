import { Timer, Zap } from "lucide-react";
import { FONT } from "../common/ui";
import { MARKS } from "./marks";

export default function X0XScoreboard({
  names,
  turn,
  wins,
  steals,
  timeLeft,
  timer,
  roundOver,
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {["X", "O"].map((m) => {
        const active = !roundOver && turn === m;
        const pct =
          timer && active && timeLeft !== null ? (timeLeft / timer) * 100 : 0;
        return (
          <div
            key={m}
            className={`relative min-w-0 overflow-hidden border px-3 py-2.5 transition-all duration-300 ${
              active
                ? `${MARKS[m].border} ${MARKS[m].bg}`
                : "border-white/10 bg-white/5 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`${FONT} text-3xl font-bold ${MARKS[m].text}`}>
                  {m}
                </span>
                <div className="min-w-0">
                  <span
                    className={`block truncate ${FONT} text-sm font-bold uppercase tracking-wide text-white`}
                  >
                    {names[m]}
                  </span>
                  {active && !timer && (
                    <span
                      className={`block ${FONT} text-[11px] uppercase tracking-[0.15em] text-neutral-400`}
                    >
                      Növbə
                    </span>
                  )}
                  <span
                    className={`flex items-center gap-3 ${FONT} text-xs text-neutral-500`}
                  >
                    {steals !== null && (
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {steals[m] === Infinity ? "∞" : steals[m]}
                      </span>
                    )}
                    {active && timeLeft !== null && (
                      <span
                        className={`inline-flex items-center gap-1 ${timeLeft <= 5 ? "text-rose-400" : ""}`}
                      >
                        <Timer className="h-3 w-3" />
                        {timeLeft} san.
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <span
                className={`shrink-0 ${FONT} text-3xl font-bold text-white`}
              >
                {wins[m]}
              </span>
            </div>
            {timer > 0 && (
              <span className="absolute inset-x-0 bottom-0 h-1 bg-white/5">
                <span
                  className={`block h-full transition-[width] duration-200 ease-linear ${timeLeft <= 5 ? "bg-rose-500" : MARKS[m].bar}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
