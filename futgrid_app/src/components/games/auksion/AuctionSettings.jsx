import { ArrowLeft, HelpCircle, Lock, Minus, Play, Plus, Shuffle } from "lucide-react";
import {
  FREE_FORMATION,
  POS_ORDER,
  isFree,
  TEAM_SIZE,
  formationSlots,
  formationTotal,
  pitchSpots,
  validFormation,
} from "../../../lib/games/auction";
import { POS_NAME, POS_SHORT, POS_STYLE } from "../../../lib/games/playerInfo";
import {
  Field,
  Segmented,
  SETTINGS_CARD,
  SettingsHeader,
} from "../common/controls";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { DEFAULT_SETTINGS, FORMATION_PRESETS, OPTIONS, SIDES } from "./settings";

import { ONLINE_STEP, ONLINE_TITLE, OnlineSetupActions } from "../common/OnlineSetup";
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

const code = (f) => POS_ORDER.map((pos) => f[pos] ?? 0).join("-");
const same = (a, b) => POS_ORDER.every((pos) => (a[pos] ?? 0) === (b[pos] ?? 0));

const lineupText = (f) =>
  POS_ORDER.filter((pos) => f[pos] > 0)
    .map((pos) => `${f[pos]} ${POS_NAME[pos].toLowerCase()}`)
    .join(", ");

const rules = (f, mystery) => [
  tr("Hər komandanın 20 ₼ büdcəsi var, hər komanda 5 oyunçu alır — 10 oyunçunun hamısı satılır."),
  isFree(f)
    ? tr("Sərbəst rejim: mövqe yoxdur, 10 təsadüfi oyunçu hərraca çıxır.")
    : tr("Heyət: {list}.", { list: lineupText(validFormation(f) ? f : DEFAULT_SETTINGS.formation) }),
  tr("Hər lotu növbə ilə bir oyunçu açır və ən azı 1 ₼ təklif etməlidir."),
  tr("Rəqib ya artırır, ya da keçir. Keçsə, oyunçu son təklif verənə gedir."),
  tr("Təklifi düymələrlə və ya məbləği yazaraq ver — məsələn, birbaşa 20 ₼."),
  mystery
    ? tr("Gizli oyunçu: ad yox, ipucu görünür. Kim olduğu satışdan sonra açılır.")
    : tr("Pulu bitən komandanın qalan oyunçuları 0 ₼-a gəlir."),
  tr("Sonda sistem hər oyunçuya reytinq verir, kimya bonusu əlavə olunur və güclü komanda qalib olur."),
];

function MiniPitch({ formation }) {
  const positions = formationSlots(formation);
  const spots = pitchSpots(positions);
  return (
    <div
      data-theme="dark"
      className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-line/10 bg-linear-to-b from-[#0d2a1c] to-[#0a1f16]"
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-line/12" />
      <span className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line/12" />
      <span className="absolute bottom-0 left-1/2 h-8 w-24 -translate-x-1/2 border border-b-0 border-line/12" />
      <span className="absolute left-1/2 top-0 h-8 w-24 -translate-x-1/2 border border-t-0 border-line/12" />
      {positions.map((pos, i) => (
        <span
          key={`${code(formation)}-${i}`}
          className={`absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white/80 ${POS_STYLE[pos]} bg-[#0b1430] ${FONT} text-[10px] font-black shadow-[0_6px_14px_-6px_#000] animate-[auLot_0.4s_cubic-bezier(.2,.8,.2,1)_both]`}
          style={{ left: `${spots[i][0]}%`, top: `${spots[i][1]}%`, animationDelay: `${i * 60}ms` }}
        >
          {POS_SHORT[pos]}
        </span>
      ))}
    </div>
  );
}

function FormationPicker({ value, onChange }) {
  const free = isFree(value);
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={free}
      onClick={() => onChange(free ? DEFAULT_SETTINGS.formation : FREE_FORMATION)}
      className={`mb-4 flex w-full items-center gap-3.5 rounded-xl border-2 px-3.5 py-3 text-left transition-colors duration-200 ${
        free ? "border-accent/60 bg-accent/8" : "border-edge bg-surface hover:border-accent/30"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${free ? "bg-accent text-white" : "bg-page-2 text-accent"}`}>
        <Shuffle className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block ${FONT} text-[15px] font-extrabold uppercase tracking-wide text-ink`}>
          {tr("Sərbəst rejim — mövqesiz")}
        </span>
        <span className={`block ${FONT} text-sm text-muted`}>
          {tr("10 təsadüfi oyunçu, istənilən mövqedən")}
        </span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${free ? "bg-accent" : "bg-edge"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ${free ? "left-5.5" : "left-0.5"}`} />
      </span>
    </button>
  );
  if (free)
    return (
      <div>
        {toggle}
        <div className={`flex items-start gap-3 rounded-xl border border-dashed border-edge bg-page/60 p-4 ${FONT} text-sm text-ink-soft`}>
          <Shuffle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p>
            {tr("Oyunçular mövqeyə görə bölünmür: hər lotda istənilən mövqedən təsadüfi futbolçu çıxır. Hər komanda 5 oyunçu yığır, sonda sistem reytinqləri hesablayıb qalibi elan edir.")}
          </p>
        </div>
      </div>
    );
  return (
    <div>
      {toggle}
      <FormationEditor value={value} onChange={onChange} />
    </div>
  );
}

function MysteryToggle({ value, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`flex w-full items-center gap-3.5 rounded-xl border-2 px-3.5 py-3 text-left transition-colors duration-200 ${
        value ? "border-gold/60 bg-gold/8" : "border-edge bg-surface hover:border-gold/30"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${value ? "bg-gold text-black" : "bg-page-2 text-gold"}`}>
        <HelpCircle className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block ${FONT} text-[15px] font-extrabold uppercase tracking-wide text-ink`}>
          {tr("Gizli oyunçu rejimi")}
        </span>
        <span className={`block ${FONT} text-sm text-muted`}>
          {tr("Ad görünmür, yalnız ipucu: “FC Barcelona ilə Çempionlar Liqası qazanıb”. Messi də çıxa bilər, Mascherano da.")}
        </span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-gold" : "bg-edge"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ${value ? "left-5.5" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function FormationEditor({ value, onChange }) {
  const f = { ...DEFAULT_SETTINGS.formation, ...value };
  const total = formationTotal(f);
  const set = (pos, d) => {
    const next = Math.max(0, Math.min(TEAM_SIZE, (f[pos] ?? 0) + d));
    if (d > 0 && total >= TEAM_SIZE) return;
    onChange({ ...f, [pos]: next });
  };
  const ok = total === TEAM_SIZE;

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {FORMATION_PRESETS.map((p) => {
            const active = same(p.f, f);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onChange(p.f)}
                className={`rounded-full border-2 px-3 py-1.5 ${FONT} text-xs font-extrabold uppercase tracking-wide transition-[border-color,background-color,translate] duration-200 ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-edge bg-surface text-ink hover:-translate-y-0.5 hover:border-accent/50"
                }`}
              >
                {p.label}
                <span className={`ml-1.5 font-bold ${active ? "text-white/75" : "text-muted"}`}>{code(p.f)}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 @container sm:grid-cols-4">
          {POS_ORDER.map((pos) => {
            const n = f[pos] ?? 0;
            const locked = n === 0;
            return (
              <div
                key={pos}
                className={`relative rounded-xl border-2 p-2.5 text-center transition-colors duration-200 ${
                  locked ? "border-dashed border-edge bg-page/60" : "border-edge bg-surface"
                }`}
              >
                <span className={`mx-auto grid h-6 w-11 place-items-center ${POS_STYLE[pos]} ${FONT} text-[10px] font-bold tracking-wider`}>
                  {POS_SHORT[pos]}
                </span>
                <p className={`mt-1 truncate ${FONT} text-[11px] uppercase tracking-wide text-muted`}>{POS_NAME[pos]}</p>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    aria-label={tr("Azalt")}
                    disabled={n === 0}
                    onClick={() => set(pos, -1)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-edge text-ink transition-colors hover:border-accent/50 disabled:opacity-30"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  {locked ? (
                    <span className={`inline-flex items-center gap-1 ${FONT} text-xs font-bold uppercase text-faint`}>
                      <Lock className="h-3.5 w-3.5" />
                      {tr("Bağlı")}
                    </span>
                  ) : (
                    <span key={n} className={`${FONT} text-2xl font-black text-ink animate-[auBump_0.3s_ease-out]`}>
                      {n}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={tr("Artır")}
                    disabled={total >= TEAM_SIZE}
                    onClick={() => set(pos, 1)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-edge text-ink transition-colors hover:border-accent/50 disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className={`${FONT} text-sm font-bold ${ok ? "text-good-hi" : "text-bad-hi"}`}>
          {tr("Heyət: {n}/{max} oyunçu", { n: total, max: TEAM_SIZE })}
          {!ok && <span className="ml-2 font-normal text-muted">{tr("Cəm 5 oyunçu olmalıdır.")}</span>}
        </p>
      </div>
      <div className="mx-auto w-full max-w-[150px]">
        <MiniPitch formation={ok ? f : DEFAULT_SETTINGS.formation} />
      </div>
    </div>
  );
}

export default function AuctionSettings({ mode, settings, onChange, onStart, onBack, connected = true }) {
  const set = (key) => (value) => onChange({ ...settings, [key]: value });
  const setName = (side) => (value) =>
    onChange({ ...settings, names: { ...settings.names, [side]: value } });
  const versus = mode === "same";
  const online = mode === "online";
  const formation = settings.formation ?? DEFAULT_SETTINGS.formation;
  const ready = validFormation(formation);

  return (
    <section className={`mx-auto max-w-5xl ${SETTINGS_CARD}`}>
      <SettingsHeader
        title={online ? ONLINE_TITLE() : versus ? tr("Eyni ekran") : tr("Bota qarşı")}
        accent={tr("parametrlər")}
        step={online ? ONLINE_STEP() : undefined}
        sub={online ? tr("Hərracın qaydalarını sən seçirsən — dostun qoşulanda eyni parametrlərlə başlayacaqsınız.") : undefined}
      />

      <ul className="mt-5 grid gap-2 rounded-xl bg-page p-4 sm:grid-cols-2">
        {rules(formation, settings.mystery).map((r, i) => (
          <li key={i} className={`flex gap-2.5 ${FONT} text-sm text-ink-soft`}>
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent ${FONT} text-[11px] font-black text-white`}
            >
              {i + 1}
            </span>
            {r}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Field label={tr("Oyun növü")}>
          <MysteryToggle value={Boolean(settings.mystery)} onChange={set("mystery")} />
        </Field>
      </div>

      <div className="mt-6">
        <Field label={tr("Heyət filteri")} hint={tr("mövqeni 0 et — bağlansın")}>
          <FormationPicker value={formation} onChange={set("formation")} />
        </Field>
      </div>

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
        {!versus && !online && (
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

      {online ? (
        <OnlineSetupActions onCreate={onStart} onBack={onBack} connected={connected} disabled={!ready} />
      ) : (
      <div className="mt-7 flex flex-wrap gap-3 border-t border-edge pt-5">
        <button type="button" onClick={onStart} disabled={!ready} className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:opacity-40`}>
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
      )}
    </section>
  );
}
