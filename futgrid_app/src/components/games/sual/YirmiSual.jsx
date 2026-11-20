import { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { loadData } from "../../../lib/data";
import { Field, Segmented, SETTINGS_CARD, SettingsHeader } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import ModeSelect from "../common/ModeSelect";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { SIDES } from "../ortaq/settings";
import SualDuo from "./SualDuo";
import { SUAL_KEYFRAMES } from "./SualParts";
import SualSolo from "./SualSolo";
import SualDuel from "./SualDuel";

import { tr } from "../../../i18n";

const KEY = "futgrid:sual:settings";
const DEFAULTS = { names: { A: "", B: "" }, difficulty: "normal", era: "all", maxQuestions: 20 };

const LEVELS = [
  { value: "easy", get label() { return tr("Asan"); }, get sub() { return tr("ən məşhurlar"); } },
  { value: "normal", get label() { return tr("Normal"); }, get sub() { return tr("tanınmışlar"); } },
  { value: "hard", get label() { return tr("Çətin"); }, get sub() { return tr("geniş seçim"); } },
];
const ERAS = [
  { value: "active", get label() { return tr("Aktiv"); }, get sub() { return tr("indiki futbolçular"); } },
  { value: "all", get label() { return tr("Bütün zamanlar"); }, get sub() { return tr("legendlər daxil"); } },
];
const LIMITS = [10, 15, 20].map((n) => ({ value: n, get label() { return tr("{n} sual", { n }); } }));

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { ...DEFAULTS, ...saved, names: { ...DEFAULTS.names, ...saved.names } };
  } catch {
    return DEFAULTS;
  }
}

function NameInput({ side, value, onChange }) {
  return (
    <label className={`flex items-center overflow-hidden rounded-xl border-2 bg-surface ${SIDES[side].border}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center ${SIDES[side].solid} ${FONT} text-lg font-bold`}>{side === "A" ? 1 : 2}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={side === "A" ? tr("Oyunçu 1") : tr("Oyunçu 2")}
        maxLength={16}
        autoComplete="off"
        spellCheck={false}
        className={`h-11 min-w-0 flex-1 bg-transparent px-3 ${FONT} text-base text-ink placeholder-faint outline-none`}
      />
    </label>
  );
}

export default function YirmiSual() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(load);
  const [mode, setMode] = useState(null);
  const [game, setGame] = useState(0);

  useEffect(() => {
    loadData().then(setData).catch((e) => setError(e.message));
  }, []);

  const save = (next) => {
    setSettings(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };
  const set = (key) => (value) => save({ ...settings, [key]: value });
  const setName = (side) => (value) => save({ ...settings, names: { ...settings.names, [side]: value } });
  const names = { A: settings.names.A.trim() || tr("Oyunçu 1"), B: settings.names.B.trim() || tr("Oyunçu 2") };

  const solo = mode === "solo";
  let body;
  if (error) body = <Notice title={tr("Data yüklənmədi")} text={error} />;
  else if (!data) body = <Loader text={tr("Oyunçular yüklənir...")} />;
  else if (!mode)
    body = (
      <div className="mx-auto max-w-5xl">
        <ModeSelect
          friends
          onPick={(key) => {
            setMode(key);
            if (key === "friend") setGame((g) => g + 1);
          }}
          texts={{
            same: tr("Hərə bir futbolçu tutur, daha az sualla tapan qalibdir"),
            solo: tr("Bot futbolçu tutur, sən suallarla tapırsan"),
          }}
        />
      </div>
    );
  else if (!game && mode !== "friend")
    body = (
      <section className={`mx-auto max-w-3xl ${SETTINGS_CARD}`}>
        <SettingsHeader
          title={solo ? tr("Tək oyunçu") : tr("Eyni ekran")}
          accent={tr("parametrlər")}
          sub={
            solo
              ? tr("Bot gizli bir futbolçu tutur. “Hücumçudur?”, “Premyer Liqada oynayıb?” kimi suallar ver, cavabı dərhal gəlsin. Futbolçunu ən az sualla tap.")
              : tr("Hər oyunçu rəqibi üçün gizli futbolçu seçir. Növbə ilə sual verirsiniz, cavabları sistem verir. Rəqibinin futbolçusunu daha az sualla tapan qalib gəlir.")
          }
          step={solo ? tr("Tək oyunçu") : tr("2 oyunçu")}
        />
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {!solo && (
            <Field label={tr("Oyunçular")}>
              <div className="space-y-2">
                <NameInput side="A" value={settings.names.A} onChange={setName("A")} />
                <NameInput side="B" value={settings.names.B} onChange={setName("B")} />
              </div>
            </Field>
          )}
          <Field label={tr("Çətinlik")} hint={solo ? null : tr("təsadüfi seçim üçün")}>
            <Segmented label={tr("Çətinlik")} options={LEVELS} value={settings.difficulty} onChange={set("difficulty")} />
          </Field>
          <Field label={tr("Dövr")}>
            <Segmented label={tr("Dövr")} options={ERAS} value={settings.era} onChange={set("era")} />
          </Field>
          <Field label={tr("Sual limiti")}>
            <Segmented label={tr("Sual limiti")} options={LIMITS} value={settings.maxQuestions} onChange={set("maxQuestions")} />
          </Field>
        </div>
        <div className="mt-7 flex flex-wrap gap-3 border-t border-edge pt-5">
          <button type="button" onClick={() => setGame((g) => g + 1)} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <Play className="h-4 w-4" />
            {tr("Oyuna başla")}
          </button>
          <button type="button" onClick={() => setMode(null)} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <ArrowLeft className="h-4 w-4" />
            {tr("Rejimlər")}
          </button>
        </div>
      </section>
    );
  else
    body = (
      <>
        <div className="mx-auto mb-4 flex max-w-6xl justify-end">
          <button type="button" onClick={() => setGame(0)} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <ArrowLeft className="h-4 w-4" />
            {tr("Parametrlər")}
          </button>
        </div>
        {mode === "friend" ? (
          <SualDuel key={game} data={data} onSettings={() => setMode(null)} />
        ) : solo ? <SualSolo key={game} data={data} settings={settings} /> : <SualDuo key={game} data={data} settings={settings} names={names} />}
      </>
    );

  return (
    <GameLayout
      eyebrow={tr("Sual-cavab")}
      title={tr("20 sual")}
      description={tr("Gizli futbolçunu bəli/xeyr sualları ilə tap: aktivdir? hücumçudur? Premyer Liqada oynayıb? Ən az sualla tapan qalib olur.")}
      compact={Boolean(data) && game > 0}
    >
      <style>{SUAL_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
