import { ArrowLeft, Minus, Play, Plus } from "lucide-react";
import { Segmented } from "../common/controls";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  FONT,
  SWEEP_BLUE,
  SWEEP_WHITE,
} from "../common/ui";
import { OPTIONS, SIDES } from "./settings";

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

function NameInput({ side, value, onChange, placeholder }) {
  return (
    <label
      className={`flex items-center border bg-white/5 transition-colors duration-200 focus-within:bg-white/10 ${SIDES[side].border}`}
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
        className={`h-11 min-w-0 flex-1 bg-transparent px-3 ${FONT} text-base text-white placeholder-neutral-500 outline-none`}
      />
    </label>
  );
}

function TargetPicker({ value, onChange }) {
  const unlimited = value === "unlimited";
  const n = unlimited ? 5 : value;
  const set = (v) => onChange(Math.max(1, Math.min(99, Math.round(v) || 1)));
  const chip = (active) =>
    `h-11 min-w-11 px-3 ${FONT} text-sm font-bold uppercase tracking-wide transition-colors duration-200 ${
      active
        ? "bg-blue-500 text-white"
        : "bg-white/5 text-neutral-300 hover:bg-white/10"
    }`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className={`flex items-center border ${unlimited ? "border-white/10 opacity-50" : "border-blue-500"}`}
      >
        <button
          type="button"
          aria-label="Azalt"
          onClick={() => set(n - 1)}
          disabled={unlimited || n <= 1}
          className="flex h-11 w-11 items-center justify-center text-neutral-300 hover:bg-white/10 disabled:opacity-30"
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
          className={`h-11 w-14 bg-transparent text-center ${FONT} text-xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
        />
        <button
          type="button"
          aria-label="Artır"
          onClick={() => set(n + 1)}
          disabled={unlimited || n >= 99}
          className="flex h-11 w-11 items-center justify-center text-neutral-300 hover:bg-white/10 disabled:opacity-30"
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
        Limitsiz
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
    <section className="mx-auto max-w-5xl border border-white/10 bg-[#0b0e14]/85 p-4 backdrop-blur-sm md:p-6">
      <h2
        className={`${FONT} text-xl font-bold uppercase tracking-wide text-white md:text-2xl`}
      >
        {versus ? "Eyni ekran" : "Tək oyunçu"}
        <span className="text-neutral-500"> · parametrlər</span>
      </h2>
      <p className={`${FONT} text-sm text-neutral-500`}>
        {versus
          ? "Hər oyunçu gizli olaraq klub və ya ölkə seçir. Kartlar birlikdə açılır, ortaq oyunçunu birinci tapan +1 xal alır, səhv deyən −1."
          : "Sistem bir klub və bir klub və ya ölkə verir. Hər ikisində oynamış oyunçunu tap."}
      </p>

      <div className="mt-4 grid gap-x-8 gap-y-4 lg:grid-cols-2">
        {versus && (
          <Field label="Oyunçuların adları">
            <div className="grid gap-2 sm:grid-cols-2">
              <NameInput
                side="A"
                value={settings.names?.A ?? ""}
                onChange={setName("A")}
                placeholder="Oyunçu 1"
              />
              <NameInput
                side="B"
                value={settings.names?.B ?? ""}
                onChange={setName("B")}
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
        {versus ? (
          <Field label="Neçə xala qədər">
            <TargetPicker value={settings.target} onChange={set("target")} />
          </Field>
        ) : (
          <>
            <Field label="Çətinlik">
              <Segmented
                label="Çətinlik"
                options={OPTIONS.difficulty}
                value={settings.difficulty}
                onChange={set("difficulty")}
              />
            </Field>
            <Field label="Sual sayı">
              <Segmented
                label="Sual sayı"
                options={OPTIONS.rounds}
                value={settings.rounds}
                onChange={set("rounds")}
              />
            </Field>
          </>
        )}
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
