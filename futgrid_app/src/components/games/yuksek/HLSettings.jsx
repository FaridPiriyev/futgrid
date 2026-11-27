import { ArrowLeft, Play, Trophy } from "lucide-react";
import { loadBest } from "../../../lib/games/higherLower";
import {
  Field,
  Segmented,
  SETTINGS_CARD,
  SettingsHeader,
} from "../common/controls";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { OPTIONS } from "./settings";

import { tr } from "../../../i18n";
export default function HLSettings({ settings, onChange, onStart, onBack }) {
  const line = settings.mode === "line";
  const best = loadBest(line ? `${settings.difficulty}:line` : settings.difficulty);

  return (
    <section className={`mx-auto max-w-3xl ${SETTINGS_CARD}`}>
      <SettingsHeader
        title={tr("Tək oyunçu")}
        accent={tr("parametrlər")}
        sub={
          line
            ? tr("Bir oyunçu və bir məbləğ görürsən: onun bazar dəyəri bu məbləğdən çoxdur, azdır, yoxsa tam bərabərdir? Hər düzgün cavab seriyanı artırır, ilk səhvdə oyun bitir.")
            : tr("Solda bazar dəyəri açıq olan oyunçu, sağda gizli olan. Sağdakının dəyəri daha çoxdur, yoxsa daha az? Hər düzgün cavab seriyanı artırır, ilk səhvdə oyun bitir.")
        }
      />
      {best > 0 && (
        <span
          className={`mt-4 inline-flex items-center gap-1.5 rounded-full bg-yellow/25 px-3 py-1 ${FONT} text-sm font-bold text-gold-hi`}
        >
          <Trophy className="h-4 w-4" />
          {tr("Rekord:")}{" "} {best}
        </span>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Field label={tr("Rejim")}>
          <Segmented
            label={tr("Rejim")}
            options={OPTIONS.mode}
            value={settings.mode ?? "compare"}
            onChange={(mode) => onChange({ ...settings, mode })}
          />
        </Field>
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
        {onBack ? (
          <button type="button" onClick={onBack} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <ArrowLeft className="h-4 w-4" />
            {tr("Rejimlər")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
