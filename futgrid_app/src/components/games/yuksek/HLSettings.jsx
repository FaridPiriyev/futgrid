import { Play, Trophy } from "lucide-react";
import { loadBest } from "../../../lib/games/higherLower";
import { Segmented } from "../common/controls";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { OPTIONS } from "./settings";

export default function HLSettings({ settings, onChange, onStart }) {
  const best = loadBest(settings.difficulty);

  return (
    <section className="mx-auto max-w-3xl border border-white/10 bg-[#0b0e14]/85 p-4 backdrop-blur-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2
          className={`${FONT} text-xl font-bold uppercase tracking-wide text-white md:text-2xl`}
        >
          Tək oyunçu<span className="text-neutral-500"> · parametrlər</span>
        </h2>
        {best > 0 && (
          <span
            className={`inline-flex items-center gap-1.5 bg-amber-400/10 px-2.5 py-1 ${FONT} text-sm font-bold text-amber-300`}
          >
            <Trophy className="h-4 w-4" />
            Rekord: {best}
          </span>
        )}
      </div>
      <p className={`mt-1 ${FONT} text-sm text-neutral-500`}>
        Solda bazar dəyəri açıq olan oyunçu, sağda gizli olan. Sağdakının dəyəri daha
        çoxdur, yoxsa daha az? Hər düzgün cavab seriyanı artırır, ilk səhvdə oyun bitir.
      </p>

      <div className="mt-5">
        <p
          className={`mb-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-neutral-400`}
        >
          Çətinlik
        </p>
        <Segmented
          label="Çətinlik"
          options={OPTIONS.difficulty}
          value={settings.difficulty}
          onChange={(difficulty) => onChange({ ...settings, difficulty })}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4">
        <button type="button" onClick={onStart} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          <Play className="h-4 w-4" />
          Oyuna başla
        </button>
      </div>
    </section>
  );
}
