import { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { loadData } from "../../../lib/data";
import { Field, Segmented, SETTINGS_CARD, SettingsHeader } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import ModeSelect from "../common/ModeSelect";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { SIDES } from "../ortaq/settings";
import { PIXEL_KEYFRAMES } from "./PixelBoard";
import PixelDuo from "./PixelDuo";
import PixelSolo from "./PixelSolo";

import { tr } from "../../../i18n";

const KEY = "futgrid:sekil:settings";
const DEFAULTS = { names: { A: "", B: "" }, grid: 16, difficulty: "normal", era: "all", speed: 3, rounds: 5, target: 3 };

const GRID_OPTIONS = [
  { value: 16, get label() { return tr("16 xana"); }, get sub() { return tr("4 × 4"); } },
  { value: 24, get label() { return tr("24 xana"); }, get sub() { return tr("4 × 6, daha uzun"); } },
];
const LEVELS = [
  { value: "easy", get label() { return tr("Asan"); }, get sub() { return tr("ən məşhurlar"); } },
  { value: "normal", get label() { return tr("Orta"); }, get sub() { return tr("tanınmışlar"); } },
  { value: "hard", get label() { return tr("Çətin"); }, get sub() { return tr("geniş seçim"); } },
];
const ERAS = [
  { value: "active", get label() { return tr("Aktiv"); }, get sub() { return tr("indiki futbolçular"); } },
  { value: "all", get label() { return tr("Bütün zamanlar"); }, get sub() { return tr("legendlər daxil"); } },
];
const SPEEDS = [2, 3, 4].map((n) => ({ value: n, get label() { return tr("{n} san", { n }); } }));
const ROUNDS = [5, 10].map((n) => ({ value: n, get label() { return tr("{n} futbolçu", { n }); } }));
const TARGETS = [3, 5].map((n) => ({ value: n, get label() { return tr("{n} xal", { n }); } }));

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

export default function KimdirBu() {
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
          onPick={setMode}
          texts={{
            same: tr("Şəkil açılır, ilk tanıyan düyməni basır"),
            solo: tr("Şəkil xana-xana açılır, tez tap, çox xal al"),
          }}
        />
      </div>
    );
  else if (!game)
    body = (
      <section className={`mx-auto max-w-3xl ${SETTINGS_CARD}`}>
        <SettingsHeader
          title={solo ? tr("Tək oyunçu") : tr("Eyni ekran")}
          accent={tr("parametrlər")}
          sub={
            solo
              ? tr("Futbolçunun şəkli xanalarla örtülüdür və hər bir neçə saniyədən bir xana açılır. Nə qədər tez tapsan, o qədər çox xal alırsan.")
              : tr("Şəkil hər ikiniz üçün eyni vaxtda açılır. Tanıyan düyməsini basır və adı yazır. Düz cavab xal gətirir, səhv cavab verən bu raundda bağlanır.")
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
          <Field label={tr("Xana sayı")}>
            <Segmented label={tr("Xana sayı")} options={GRID_OPTIONS} value={settings.grid} onChange={set("grid")} />
          </Field>
          <Field label={tr("Çətinlik")}>
            <Segmented label={tr("Çətinlik")} options={LEVELS} value={settings.difficulty} onChange={set("difficulty")} />
          </Field>
          <Field label={tr("Dövr")}>
            <Segmented label={tr("Dövr")} options={ERAS} value={settings.era} onChange={set("era")} />
          </Field>
          <Field label={tr("Açılma sürəti")} hint={tr("hər xana üçün")}>
            <Segmented label={tr("Açılma sürəti")} options={SPEEDS} value={settings.speed} onChange={set("speed")} />
          </Field>
          {solo ? (
            <Field label={tr("Raund sayı")}>
              <Segmented label={tr("Raund sayı")} options={ROUNDS} value={settings.rounds} onChange={set("rounds")} />
            </Field>
          ) : (
            <Field label={tr("Qələbə üçün")}>
              <Segmented label={tr("Qələbə üçün")} options={TARGETS} value={settings.target} onChange={set("target")} />
            </Field>
          )}
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
        <div className="mx-auto mb-4 flex max-w-5xl justify-end">
          <button type="button" onClick={() => setGame(0)} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <ArrowLeft className="h-4 w-4" />
            {tr("Parametrlər")}
          </button>
        </div>
        {solo ? <PixelSolo key={game} data={data} settings={settings} /> : <PixelDuo key={game} data={data} settings={settings} names={names} />}
      </>
    );

  return (
    <GameLayout
      eyebrow={tr("Şəkil oyunu")}
      title={tr("Kimdir bu?")}
      description={tr("Futbolçunun şəkli 16 və ya 24 xanaya bölünüb, hər dəfə bir xana açılır. Şəkildəki futbolçunu ilk tanıyan qalib olur.")}
      compact={Boolean(data) && game > 0}
    >
      <style>{PIXEL_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
