import { ArrowLeft, Play } from "lucide-react";
import { Segmented } from "../common/controls";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { OPTIONS, SIDES } from "./settings";

function Field({ label, children }) {
  return (
    <div>
      <p
        className={`mb-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-muted`}
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
      className={`flex items-center border bg-line/5 transition-colors duration-200 focus-within:bg-line/10 ${SIDES[side].border}`}
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
    <section className="mx-auto max-w-5xl border border-line/10 bg-surface/85 p-4 backdrop-blur-sm md:p-6">
      <h2
        className={`${FONT} text-xl font-bold uppercase tracking-wide text-ink md:text-2xl`}
      >
        {versus ? "Eyni ekran" : "Bota qarşı"}
        <span className="text-faint"> · parametrlər</span>
      </h2>

      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {RULES.map((r) => (
          <li key={r} className={`flex gap-2 ${FONT} text-sm text-muted`}>
            <span className="mt-2 h-1 w-1 shrink-0 bg-accent" />
            {r}
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-x-8 gap-y-4 lg:grid-cols-2">
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
        {!versus && (
          <Field label="Botun səviyyəsi">
            <Segmented
              label="Botun səviyyəsi"
              options={OPTIONS.bot}
              value={settings.bot}
              onChange={set("bot")}
            />
          </Field>
        )}
        <Field label="Oyunçu hovuzu">
          <Segmented
            label="Oyunçu hovuzu"
            options={OPTIONS.pool}
            value={settings.pool}
            onChange={set("pool")}
          />
        </Field>
        <Field label="Təklif vaxtı">
          <Segmented
            label="Təklif vaxtı"
            options={OPTIONS.timer}
            value={settings.timer}
            onChange={set("timer")}
          />
        </Field>
        {versus && (
          <Field label="Klaviatura">
            <p className={`${FONT} text-sm leading-6 text-muted`}>
              <span className="text-accent-hi">Oyunçu 1:</span> 1 · 2 · 3 təklif, Q keç
              <br />
              <span className="text-gold-hi">Oyunçu 2:</span> 8 · 9 · 0 təklif, P keç
            </p>
          </Field>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-line/10 pt-4">
        <button type="button" onClick={onStart} className={BTN_PRIMARY}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          <Play className="h-4 w-4" />
          Hərraca başla
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
