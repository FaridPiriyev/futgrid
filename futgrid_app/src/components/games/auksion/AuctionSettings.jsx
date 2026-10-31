import { ArrowLeft, Play } from "lucide-react";
import {
  Field,
  Segmented,
  SETTINGS_CARD,
  SettingsHeader,
} from "../common/controls";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { OPTIONS, SIDES } from "./settings";

import { tr } from "../../../i18n";
function NameInput({ side, value, onChange, placeholder }) {
  return (
    <label
      className={`flex items-center overflow-hidden rounded-xl border-2 bg-surface transition-colors duration-200 focus-within:bg-page ${SIDES[side].border}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center ${SIDES[side].solid} ${FONT} text-lg font-bold`}
      >
        {side === "A" ? 1 : 2}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={16}
        autoComplete="off"
        spellCheck={false}
        className={`h-11 min-w-0 flex-1 bg-transparent px-3 ${FONT} text-base text-ink placeholder-faint outline-none`}
      />
    </label>
  );
}

const RULES = [
  "Hər komandanın 20 ₼ büdcəsi var.",
  "Heyət: 1 qapıçı, 1 müdafiəçi, 1 yarımmüdafiəçi, 2 hücumçu.",
  "Hər təklif ən azı 0.5 ₼ artırır, saat yenidən başlayır.",
  "Boş qalan hər yer üçün ən azı 0.5 ₼ saxlamalısan.",
  "Sonda reytinqlər və kimya bonusu toplanır, güclü komanda qalib olur.",
];

export default function AuctionSettings({ mode, settings, onChange, onStart, onBack }) {
  const set = (key) => (value) => onChange({ ...settings, [key]: value });
  const setName = (side) => (value) =>
    onChange({ ...settings, names: { ...settings.names, [side]: value } });
  const versus = mode === "same";

  return (
    <section className={`mx-auto max-w-5xl ${SETTINGS_CARD}`}>
      <SettingsHeader
        title={versus ? tr("Eyni ekran") : tr("Bota qarşı")}
        accent={tr("parametrlər")}
      />

      <ul className="mt-5 grid gap-2 rounded-xl bg-page p-4 sm:grid-cols-2">
        {RULES.map((r, i) => (
          <li key={r} className={`flex gap-2.5 ${FONT} text-sm text-ink-soft`}>
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent ${FONT} text-[11px] font-black text-white`}
            >
              {i + 1}
            </span>
            {tr(r)}
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        {versus && (
          <Field label={tr("Oyunçuların adları")}>
            <div className="grid gap-2 sm:grid-cols-2">
              <NameInput
                side="A"
                value={settings.names?.A ?? ""}
                onChange={setName("A")}
                placeholder={tr("Oyunçu 1")}
              />
              <NameInput
                side="B"
                value={settings.names?.B ?? ""}
                onChange={setName("B")}
                placeholder={tr("Oyunçu 2")}
              />
            </div>
          </Field>
        )}
        {!versus && (
          <Field label={tr("Botun səviyyəsi")}>
            <Segmented
              label={tr("Botun səviyyəsi")}
              options={OPTIONS.bot}
              value={settings.bot}
              onChange={set("bot")}
            />
          </Field>
        )}
        <Field label={tr("Oyunçu hovuzu")}>
          <Segmented
            label={tr("Oyunçu hovuzu")}
            options={OPTIONS.pool}
            value={settings.pool}
            onChange={set("pool")}
          />
        </Field>
        <Field label={tr("Təklif vaxtı")}>
          <Segmented
            label={tr("Təklif vaxtı")}
            options={OPTIONS.timer}
            value={settings.timer}
            onChange={set("timer")}
          />
        </Field>
        {versus && (
          <Field label={tr("Klaviatura")}>
            <p className={`${FONT} text-sm leading-6 text-muted`}>
              <span className="text-accent-hi">{tr("Oyunçu 1:")}</span> {tr("1 · 2 · 3 təklif, Q keç")}
              <br />
              <span className="text-gold-hi">{tr("Oyunçu 2:")}</span> {tr("8 · 9 · 0 təklif, P keç")}
            </p>
          </Field>
        )}
      </div>

      <div className="mt-7 flex flex-wrap gap-3 border-t border-edge pt-5">
        <button type="button" onClick={onStart} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          <Play className="h-4 w-4" />
          {tr("Hərraca başla")}
        </button>
        <button type="button" onClick={onBack} className={BTN_GHOST}>
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <ArrowLeft className="h-4 w-4" />
          {tr("Rejimlər")}
        </button>
      </div>
    </section>
  );
}
