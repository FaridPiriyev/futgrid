import { ArrowLeft, Minus, Play, Plus } from "lucide-react";
import {
  Field,
  Segmented,
  SETTINGS_CARD,
  SettingsHeader,
} from "../common/controls";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  FONT,
  SWEEP_BLUE,
  SWEEP_WHITE,
} from "../common/ui";
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

function TargetPicker({ value, onChange }) {
  const unlimited = value === "unlimited";
  const n = unlimited ? 5 : value;
  const set = (v) => onChange(Math.max(1, Math.min(99, Math.round(v) || 1)));
  const chip = (active) =>
    `h-11 min-w-11 rounded-xl border-2 px-3.5 ${FONT} text-sm font-extrabold uppercase tracking-wide transition-colors duration-200 ${
      active
        ? "border-accent bg-accent text-white"
        : "border-edge bg-surface text-ink hover:border-accent/40"
    }`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`flex items-center overflow-hidden rounded-xl border-2 bg-surface ${unlimited ? "border-edge opacity-50" : "border-accent"}`}
      >
        <button
          type="button"
          aria-label={tr("Azalt")}
          onClick={() => set(n - 1)}
          disabled={unlimited || n <= 1}
          className="flex h-11 w-11 items-center justify-center text-soft hover:bg-line/10 disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          min={1}
          max={99}
          value={unlimited ? "" : n}
          placeholder="∞"
          disabled={unlimited}
          onChange={(e) => set(Number(e.target.value))}
          className={`h-11 w-14 bg-transparent text-center ${FONT} text-xl font-bold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
        />
        <button
          type="button"
          aria-label={tr("Artır")}
          onClick={() => set(n + 1)}
          disabled={unlimited || n >= 99}
          className="flex h-11 w-11 items-center justify-center text-soft hover:bg-line/10 disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {OPTIONS.targetPresets.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={chip(value === p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(unlimited ? 5 : "unlimited")}
        className={chip(unlimited)}
      >
        {tr("Limitsiz")}
      </button>
    </div>
  );
}

export default function OrtaqSettings({
  mode,
  settings,
  onChange,
  onStart,
  onBack,
}) {
  const set = (key) => (value) => onChange({ ...settings, [key]: value });
  const setName = (side) => (value) =>
    onChange({ ...settings, names: { ...settings.names, [side]: value } });
  const versus = mode === "same";

  return (
    <section className={`mx-auto max-w-5xl ${SETTINGS_CARD}`}>
      <SettingsHeader
        title={versus ? tr("Eyni ekran") : tr("Tək oyunçu")}
        accent={tr("parametrlər")}
        sub={
          versus
            ? tr("Hər oyunçu gizli olaraq klub və ya ölkə seçir. Kartlar birlikdə açılır, ortaq oyunçunu birinci tapan +1 xal alır, səhv deyən −1.")
            : tr("Sistem bir klub və bir klub və ya ölkə verir. Hər ikisində oynamış oyunçunu tap.")
        }
      />

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
        <Field label={tr("Oyunçular")}>
          <Segmented
            label={tr("Oyunçular")}
            options={OPTIONS.era}
            value={settings.era}
            onChange={set("era")}
          />
        </Field>
        {versus ? (
          <Field label={tr("Neçə xala qədər")}>
            <TargetPicker value={settings.target} onChange={set("target")} />
          </Field>
        ) : (
          <>
            <Field label={tr("Çətinlik")}>
              <Segmented
                label={tr("Çətinlik")}
                options={OPTIONS.difficulty}
                value={settings.difficulty}
                onChange={set("difficulty")}
              />
            </Field>
            <Field label={tr("Sual sayı")}>
              <Segmented
                label={tr("Sual sayı")}
                options={OPTIONS.rounds}
                value={settings.rounds}
                onChange={set("rounds")}
              />
            </Field>
          </>
        )}
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
