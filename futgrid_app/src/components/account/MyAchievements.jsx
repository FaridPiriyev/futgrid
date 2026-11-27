import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { api } from "../../lib/api";
import AchievementGrid from "../social/AchievementGrid";
import { tr } from "../../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";

/** Own achievements on the account page. Shows a clear message instead of disappearing on errors. */
export default function MyAchievements() {
  const [state, setState] = useState({ items: null, error: null });
  const load = useCallback(() => {
    setState({ items: null, error: null });
    return api
      .get("/me/achievements")
      .then((data) => setState({ items: data.entries ?? [], error: null }))
      .catch((error) => setState({ items: null, error: error?.status ?? "network" }));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-[14px] border border-line/10 bg-line/3 p-4 md:p-5">
      {state.items ? (
        <AchievementGrid items={state.items} />
      ) : state.error ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`${FONT} text-sm text-muted`}>
            <span className="font-bold uppercase text-ink">{tr("Nişanlar")}</span> ·{" "}
            {tr("serverdən yüklənmədi ({code})", { code: state.error })}
          </p>
          <button type="button" onClick={() => void load()} className={`inline-flex items-center gap-1.5 ${FONT} text-xs font-bold uppercase text-accent`}>
            <RotateCcw className="h-3.5 w-3.5" />
            {tr("Yenidən cəhd et")}
          </button>
        </div>
      ) : (
        <div className="h-16 animate-pulse rounded-xl bg-line/8" />
      )}
    </section>
  );
}
