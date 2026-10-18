import { ArrowLeft, ListChecks, Play } from "lucide-react";
import { CATEGORY_TYPES } from "../../../lib/games/x0xCategories";
import { Checkbox, Segmented, Toggle } from "../common/controls";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  FONT,
  SWEEP_BLUE,
  SWEEP_WHITE,
} from "../common/ui";
import { MARKS } from "./marks";
import { OPTIONS } from "./settings";

function Field({ label, children }) {
  return (
    <div>
      <p
        className={`mb-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-neutral-400`}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function NameInput({ mark, value, onChange, placeholder }) {
  return (
    <label
      className={`flex items-center border bg-white/5 transition-colors duration-200 focus-within:bg-white/10 ${MARKS[mark].border}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center ${MARKS[mark].bg} ${FONT} text-2xl font-bold ${MARKS[mark].text}`}
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
        className={`h-11 min-w-0 flex-1 bg-transparent px-3 ${FONT} text-base text-white placeholder-neutral-500 outline-none`}
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
    <div>
      <p
        className={`mb-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-neutral-400`}
      >
        Kateqoriyalar
      </p>
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
        {CATEGORY_TYPES.map((c) => (
          <Checkbox
            key={c.key}
            label={c.label}
            checked={
              c.locked || (settings.categories[c.key] && available[c.key])
            }
            disabled={c.locked || !available[c.key]}
            onChange={setCat(c.key)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <section className="mx-auto max-w-5xl border border-white/10 bg-[#0b0e14]/85 p-4 backdrop-blur-sm md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            className={`${FONT} text-xl font-bold uppercase tracking-wide text-white md:text-2xl`}
          >
            {versus ? "Eyni ekran" : "Tək oyunçu"}
            <span className="text-neutral-500"> · parametrlər</span>
          </h2>
          <p className={`${FONT} text-sm text-neutral-500`}>
            {versus ? "İki oyunçu, bir cihaz" : "9 cəhdlə cədvəli doldur"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-x-8 gap-y-4 lg:grid-cols-2">
        <div className="space-y-4">
          {versus && (
            <Field label="Oyunçuların adları">
              <div className="grid gap-2 sm:grid-cols-2">
                <NameInput
                  mark="X"
                  value={settings.names?.X ?? ""}
                  onChange={setName("X")}
                  placeholder="Oyunçu 1"
                />
                <NameInput
                  mark="O"
                  value={settings.names?.O ?? ""}
                  onChange={setName("O")}
                  placeholder="Oyunçu 2"
                />
              </div>
            </Field>
          )}
          <Field label="Oyunçular">
            <Segmented
              label="Oyunçular"
              options={OPTIONS.era}
              value={settings.era}
              onChange={set("era")}
            />
          </Field>
          <Field label="Çətinlik">
            <Segmented
              label="Çətinlik"
              options={OPTIONS.difficulty}
              value={settings.difficulty}
              onChange={set("difficulty")}
            />
          </Field>
          <Toggle
            Icon={ListChecks}
            checked={settings.multipleChoice}
            onChange={set("multipleChoice")}
            label="Çoxseçimli"
            sub="Cavabı 4 variantdan seç"
          />
        </div>

        <div className="space-y-4">
          {versus && (
            <>
              <Field label="Oğurlama">
                <Segmented
                  label="Oğurlama"
                  options={OPTIONS.steals}
                  value={settings.steals}
                  onChange={set("steals")}
                />
              </Field>
              <Field label="Seriya">
                <Segmented
                  label="Seriya"
                  options={OPTIONS.bestOf}
                  value={settings.bestOf}
                  onChange={set("bestOf")}
                />
              </Field>
              <Field label="Növbə vaxtı">
                <Segmented
                  label="Növbə vaxtı"
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

      <div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4">
        <button type="button" onClick={onStart} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          <Play className="h-4 w-4" />
          Oyuna başla
        </button>
        <button type="button" onClick={onBack} className={BTN_GHOST}>
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <ArrowLeft className="h-4 w-4" />
          Rejimlər
        </button>
      </div>
    </section>
  );
}
