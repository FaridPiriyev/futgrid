import { Play, Trophy } from "lucide-react";
import { loadBest } from "../../../lib/games/higherLower";
import {
  Field,
  Segmented,
  SETTINGS_CARD,
  SettingsHeader,
} from "../common/controls";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import { OPTIONS } from "./settings";

import { tr } from "../../../i18n";
export default function HLSettings({ settings, onChange, onStart }) {
  const best = loadBest(settings.difficulty);

  return (
    <section className={`mx-auto max-w-3xl ${SETTINGS_CARD}`}>
      <SettingsHeader
        title={tr("Tək oyunçu")}
        accent={tr("parametrlər")}
        sub={tr("Solda bazar dəyəri açıq olan oyunçu, sağda gizli olan. Sağdakının dəyəri daha çoxdur, yoxsa daha az? Hər düzgün cavab seriyanı artırır, ilk səhvdə oyun bitir.")}
      />
      {best > 0 && (
        <span
          className={`mt-4 inline-flex items-center gap-1.5 rounded-full bg-yellow/25 px-3 py-1 ${FONT} text-sm font-bold text-gold-hi`}
        >
          <Trophy className="h-4 w-4" />
          {tr("Rekord:")}{" "} {best}
        </span>
      )}

      <div className="mt-6">
        <Field label={tr("Çətinlik")}>
          <Segmented
            label={tr("Çətinlik")}
            options={OPTIONS.difficulty}
            value={settings.difficulty}
            onChange={(difficulty) => onChange({ ...settings, difficulty })}
          />
        </Field>
      </div>

      <div className="mt-7 flex flex-wrap gap-3 border-t border-edge pt-5">
        <button type="button" onClick={onStart} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          <Play className="h-4 w-4" />
          {tr("Oyuna başla")}
        </button>
      </div>
    </section>
  );
}
