import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Play } from "lucide-react";
import { loadData } from "../../../lib/data";
import { Field, Segmented, SETTINGS_CARD, SettingsHeader, Toggle } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import { BTN_GHOST, BTN_PRIMARY, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import ClubOrderGame, { ORDER_KEYFRAMES } from "./ClubOrderGame";

import { tr } from "../../../i18n";
const KEY = "futgrid:sirala:settings";
const DEFAULTS = { difficulty: "easy", lives: 3, showYears: true };

const LEVELS = [
  { value: "easy", get label() {
    return tr("Asan");
  }, get sub() {
    return tr("ən məşhurlar");
  } },
  { value: "normal", get label() {
    return tr("Normal");
  }, get sub() {
    return tr("tanınmışlar");
  } },
  { value: "hard", get label() {
    return tr("Çətin");
  }, get sub() {
    return tr("hamısı");
  } },
];

const LIVES = [
  { value: 3, get label() {
    return tr("3 səhv");
  }, get sub() {
    return tr("hər oyunçuya");
  } },
  { value: 5, get label() {
    return tr("5 səhv");
  }, get sub() {
    return tr("hər oyunçuya");
  } },
  { value: 0, get label() {
    return tr("Limitsiz");
  }, get sub() {
    return tr("səhv sayılır");
  } },
];

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export default function KlublariSirala() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(load);
  const [game, setGame] = useState(0);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const change = (key) => (value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  let body;
  if (error) body = <Notice title={tr("Data yüklənmədi")} text={error} />;
  else if (!data) body = <Loader text={tr("Oyunçular yüklənir...")} />;
  else if (!game)
    body = (
      <section className={`mx-auto max-w-3xl ${SETTINGS_CARD}`}>
        <SettingsHeader
          title={tr("Tək oyunçu")}
          accent={tr("parametrlər")}
          sub={tr("Ekrana futbolçu gəlir, qutular onun klublarının sayı qədərdir. Qutuya toxun və o sıradakı klubu yaz. 10 futbolçu, hər düzgün klub 1 xal.")}
        />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Field label={tr("Çətinlik")}>
            <Segmented label={tr("Çətinlik")} options={LEVELS} value={settings.difficulty} onChange={change("difficulty")} />
          </Field>
          <Field label={tr("Səhv haqqı")}>
            <Segmented label={tr("Səhv haqqı")} options={LIVES} value={settings.lives} onChange={change("lives")} />
          </Field>
          <div className="md:col-span-2">
            <Toggle
              Icon={CalendarDays}
              checked={settings.showYears}
              onChange={change("showYears")}
              label={tr("İllər görünsün")}
              sub={tr("Hər qutunun altında klubda oynadığı illər")}
            />
          </div>
        </div>
        <div className="mt-7 border-t border-edge pt-5">
          <button type="button" onClick={() => setGame(1)} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <Play className="h-4 w-4" />
            {tr("Oyuna başla")}
          </button>
        </div>
      </section>
    );
  else
    body = (
      <>
        <div className="mb-5 flex justify-end">
          <button type="button" onClick={() => setGame(0)} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <ArrowLeft className="h-4 w-4" />
            {tr("Parametrlər")}
          </button>
        </div>
        <ClubOrderGame
          key={game}
          data={data}
          difficulty={settings.difficulty}
          lives={settings.lives}
          showYears={settings.showYears}
        />
      </>
    );

  return (
    <GameLayout
      eyebrow={tr("Bilik oyunu")}
      title={tr("Klubları sırala")}
      description={tr("Futbolçunun keçdiyi klubları sırası ilə düz. Qutuya toxun, klubu yaz.")}
      compact={Boolean(data) && game > 0}
    >
      <style>{ORDER_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
