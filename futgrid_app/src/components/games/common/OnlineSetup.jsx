import { ArrowLeft, Plus } from "lucide-react";
import { SETTINGS_CARD, SettingsHeader } from "./controls";
import { BTN_GHOST, BTN_PRIMARY, SWEEP_BLUE, SWEEP_WHITE } from "./ui";
import { tr } from "../../../i18n";

/** "Otaq yarat" + "Rejimlər" düymələri — bütün onlayn parametr ekranlarında eyni. */
export function OnlineSetupActions({ onCreate, onBack, connected = true, disabled = false }) {
  return (
    <div className="mt-7 flex flex-wrap gap-3 border-t border-edge pt-5">
      <button
        type="button"
        onClick={onCreate}
        disabled={!connected || disabled}
        className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <span aria-hidden="true" className={SWEEP_WHITE} />
        <Plus className="h-4 w-4" strokeWidth={2.6} />
        {tr("Otaq yarat")}
      </button>
      {onBack ? (
        <button type="button" onClick={onBack} className={BTN_GHOST}>
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <ArrowLeft className="h-4 w-4" />
          {tr("Rejimlər")}
        </button>
      ) : null}
    </div>
  );
}

export const ONLINE_TITLE = () => tr("Dostla onlayn");
export const ONLINE_STEP = () => tr("Parametrləri sən seçirsən");

/**
 * Onlayn oyunun parametr kartı: eyni ekran rejimindəki kartla eyni görünür,
 * sadəcə ad xanaları yoxdur və düymə "Otaq yarat"-dır.
 */
export default function OnlineSetup({ sub, children, onCreate, onBack, connected, disabled = false, width = "max-w-3xl" }) {
  return (
    <section className={`mx-auto ${width} ${SETTINGS_CARD}`}>
      <SettingsHeader title={ONLINE_TITLE()} accent={tr("parametrlər")} sub={sub} step={ONLINE_STEP()} />
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
      <OnlineSetupActions onCreate={onCreate} onBack={onBack} connected={connected} disabled={disabled} />
    </section>
  );
}
