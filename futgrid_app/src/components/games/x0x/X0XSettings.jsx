import { ArrowLeft, ListChecks, Play } from "lucide-react";
import { CATEGORY_TYPES } from "../../../lib/games/x0xCategories";
import {
  Checkbox,
  Field,
  Segmented,
  SETTINGS_CARD,
  SettingsHeader,
  Toggle,
} from "../common/controls";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  FONT,
  SWEEP_BLUE,
  SWEEP_WHITE,
} from "../common/ui";
import { MARKS } from "./marks";
import { OPTIONS } from "./settings";

import { tr } from "../../../i18n";
function NameInput({ mark, value, onChange, placeholder }) {
  return (
    <label
      className={`flex items-center overflow-hidden rounded-xl border-2 bg-surface transition-colors duration-200 focus-within:bg-page ${MARKS[mark].border}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center ${MARKS[mark].bg} ${FONT} text-2xl font-black ${MARKS[mark].text}`}
      >
        {mark}
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

export default function X0XSettings({
  mode,
  settings,
  onChange,
  onStart,
  onBack,
  available,
}) {
  const set = (key) => (value) => onChange({ ...settings, [key]: value });
  const setCat = (key) => (value) =>
    onChange({
      ...settings,
      categories: { ...settings.categories, [key]: value },
    });
  const setName = (mark) => (value) =>
    onChange({ ...settings, names: { ...settings.names, [mark]: value } });
  const versus = mode === "same";

  const categories = (
    <Field label={tr("Kateqoriyalar")}>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TYPES.map((c) => (
          <Checkbox
            key={c.key}
            locked={c.locked}
            label={c.label}
            checked={
              c.locked || (settings.categories[c.key] && available[c.key])
            }
            disabled={c.locked || !available[c.key]}
            onChange={setCat(c.key)}
          />
        ))}
      </div>
    </Field>
  );

  return (
    <section className={`mx-auto max-w-5xl ${SETTINGS_CARD}`}>
      <SettingsHeader
        title={versus ? tr("Eyni ekran") : tr("Tək oyunçu")}
        accent={tr("parametrlər")}
        sub={versus ? tr("İki oyunçu, bir cihaz") : tr("9 cəhdlə cədvəli doldur")}
      />

      <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <div className="space-y-6">
          {versus && (
            <Field label={tr("Oyunçuların adları")}>
              <div className="grid gap-2 sm:grid-cols-2">
                <NameInput
                  mark="X"
                  value={settings.names?.X ?? ""}
                  onChange={setName("X")}
                  placeholder={tr("Oyunçu 1")}
                />
                <NameInput
                  mark="O"
                  value={settings.names?.O ?? ""}
                  onChange={setName("O")}
                  placeholder={tr("Oyunçu 2")}
                />
              </div>
            </Field>
          )}
          <Field label={tr("Çətinlik")}>
            <Segmented
              label={tr("Çətinlik")}
              options={OPTIONS.difficulty}
              value={settings.difficulty}
              onChange={set("difficulty")}
            />
          </Field>
          <Toggle
            Icon={ListChecks}
            checked={settings.multipleChoice}
            onChange={set("multipleChoice")}
            label={tr("Çoxseçimli")}
            sub={tr("Cavabı 4 variantdan seç")}
          />
        </div>

        <div className="space-y-6">
          {versus && (
            <>
              <Field label={tr("Oğurlama")}>
                <Segmented
                  label={tr("Oğurlama")}
                  options={OPTIONS.steals}
                  value={settings.steals}
                  onChange={set("steals")}
                />
              </Field>
              <Field label={tr("Növbə vaxtı")}>
                <Segmented
                  label={tr("Növbə vaxtı")}
                  options={OPTIONS.timer}
                  value={settings.timer}
                  onChange={set("timer")}
                />
              </Field>
            </>
          )}
          {categories}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-3 border-t border-edge pt-5">
        <button type="button" onClick={onStart} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          <Play className="h-4 w-4" />
          {tr("Oyuna başla")}
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
