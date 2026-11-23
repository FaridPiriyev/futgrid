import { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { loadData } from "../../../lib/data";
import { Field, Segmented, SETTINGS_CARD, SettingsHeader } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import { SIDES } from "../ortaq/settings";
import ModeSelect from "../common/ModeSelect";
import BotLettersGame from "./BotLettersGame";
import TwoLettersGame, { TWO_KEYFRAMES } from "./TwoLettersGame";
import TwoLettersDuel from "./TwoLettersDuel";
import { LEVELS, ROUNDS, SOLO_TIMES, TARGETS, TIMES } from "./options";
import { hasDuelEntry } from "../../../lib/games/useDuelRoom";

import { tr } from "../../../i18n";
const KEY = "futgrid:ikiherf:settings";
const DEFAULTS = { names: { A: "", B: "" }, seconds: 15, target: 5, difficulty: "normal", soloSeconds: 45, rounds: 5 };

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
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center ${SIDES[side].solid} ${FONT} text-lg font-bold`}>
        {side === "A" ? 1 : 2}
      </span>
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

export default function IkiHerf() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(load);
  const [invited] = useState(() => hasDuelEntry("twoLetters"));
  const [game, setGame] = useState(invited ? 1 : 0);
  const [mode, setMode] = useState(invited ? "friend" : null);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const save = (next) => {
    setSettings(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };
  const set = (key) => (value) => save({ ...settings, [key]: value });
  const setName = (side) => (value) => save({ ...settings, names: { ...settings.names, [side]: value } });
  const names = {
    A: settings.names.A.trim() || tr("Oyunçu 1"),
    B: settings.names.B.trim() || tr("Oyunçu 2"),
  };

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
            same: tr("İki nəfər, növbə ilə futbolçu tapın"),
            solo: tr("Bir hərfi bot verir, futbolçuları sən tapırsan"),
          }}
        />
      </div>
    );
  else if (!game && mode === "solo")
    body = (
      <section className={`mx-auto max-w-3xl ${SETTINGS_CARD}`}>
        <SettingsHeader
          title={tr("Botla")}
          accent={tr("parametrlər")}
          sub={tr("Hər raundda bir hərfi sən seçirsən, digərini bot təsadüfi verir. Vaxt bitənə qədər adında hər iki hərf olan bacardığın qədər futbolçu yaz.")}
          step={tr("Tək oyunçu")}
        />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Field label={tr("Adın")}>
            <NameInput side="A" value={settings.names.A} onChange={setName("A")} />
          </Field>
          <Field label={tr("Çətinlik")}>
            <Segmented label={tr("Çətinlik")} options={LEVELS} value={settings.difficulty} onChange={set("difficulty")} />
          </Field>
          <Field label={tr("Raund vaxtı")}>
            <Segmented label={tr("Raund vaxtı")} options={SOLO_TIMES} value={settings.soloSeconds} onChange={set("soloSeconds")} />
          </Field>
          <Field label={tr("Raund sayı")}>
            <Segmented label={tr("Raund sayı")} options={ROUNDS} value={settings.rounds} onChange={set("rounds")} />
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
  else if (!game)
    body = (
      <section className={`mx-auto max-w-3xl ${SETTINGS_CARD}`}>
        <SettingsHeader
          title={tr("Eyni ekran")}
          accent={tr("parametrlər")}
          sub={tr("Hər oyunçu bir hərf seçir. Sonra növbə ilə adında hər iki hərf olan futbolçu yazırsınız. Vaxtında tapa bilməyən raundu uduzur.")}
          step={tr("2 oyunçu")}
        />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Field label={tr("Oyunçular")}>
            <div className="space-y-2">
              <NameInput side="A" value={settings.names.A} onChange={setName("A")} />
              <NameInput side="B" value={settings.names.B} onChange={setName("B")} />
            </div>
          </Field>
          <Field label={tr("Çətinlik")}>
            <Segmented label={tr("Çətinlik")} options={LEVELS} value={settings.difficulty} onChange={set("difficulty")} />
          </Field>
          <Field label={tr("Növbə vaxtı")}>
            <Segmented label={tr("Növbə vaxtı")} options={TIMES} value={settings.seconds} onChange={set("seconds")} />
          </Field>
          <Field label={tr("Qələbə xalı")}>
            <Segmented label={tr("Qələbə xalı")} options={TARGETS} value={settings.target} onChange={set("target")} />
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
        {mode !== "friend" ? (
          <div className="mx-auto mb-4 flex max-w-4xl justify-end">
            <button type="button" onClick={() => setGame(0)} className={BTN_GHOST}>
              <span aria-hidden="true" className={SWEEP_BLUE} />
              <ArrowLeft className="h-4 w-4" />
              {tr("Parametrlər")}
            </button>
          </div>
        ) : null}
        {mode === "friend" ? (
          <TwoLettersDuel key={game} data={data} settings={settings} onSettingsChange={save} onSettings={() => setMode(null)} />
        ) : mode === "solo" ? (
          <BotLettersGame key={game} data={data} settings={settings} name={names.A} />
        ) : (
          <TwoLettersGame key={game} data={data} settings={settings} names={names} />
        )}
      </>
    );

  return (
    <GameLayout
      eyebrow={tr("Duel oyunu")}
      title={tr("İki hərf")}
      description={tr("İki oyunçu, iki hərf. Adında hər iki hərf olan futbolçunu növbə ilə tap, vaxtı bitən uduzur.")}
      compact={Boolean(data) && game > 0}
    >
      <style>{TWO_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
