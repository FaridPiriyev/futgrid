import { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { loadData } from "../../../lib/data";
import { Field, Segmented, SETTINGS_CARD, SettingsHeader } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import { BTN_GHOST, BTN_PRIMARY, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import PyramidGame, { PYRAMID_KEYFRAMES } from "./PyramidGame";

import { tr } from "../../../i18n";
const KEY = "futgrid:piramida:settings";
const DEFAULTS = { difficulty: "easy", seconds: 30 };

const LEVELS = [
  { value: "easy", get label() {
    return tr("Asan");
  }, get sub() {
    return tr("ən məşhur klublar");
  } },
  { value: "normal", get label() {
    return tr("Normal");
  }, get sub() {
    return tr("tanınmış klublar");
  } },
  { value: "hard", get label() {
    return tr("Çətin");
  }, get sub() {
    return tr("bütün klublar");
  } },
];

const TIMES = [
  { value: 30, get label() {
    return tr("30 san.");
  }, get sub() {
    return tr("hər səviyyəyə");
  } },
  { value: 45, get label() {
    return tr("45 san.");
  }, get sub() {
    return tr("hər səviyyəyə");
  } },
  { value: 60, get label() {
    return tr("60 san.");
  }, get sub() {
    return tr("hər səviyyəyə");
  } },
];

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export default function Piramida() {
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
          sub={tr("Piramida aşağıdan yuxarı qurulur: 5, 4, 3, 2, 1 futbolçu. Hər səviyyədə iki şərt var, məsələn Liverpool × İngiltərə. Vaxt bitməmiş hər iki şərtə uyğun futbolçuları yaz, səviyyəni tamamla və yuxarı qalx.")}
        />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Field label={tr("Çətinlik")}>
            <Segmented label={tr("Çətinlik")} options={LEVELS} value={settings.difficulty} onChange={change("difficulty")} />
          </Field>
          <Field label={tr("Vaxt")}>
            <Segmented label={tr("Vaxt")} options={TIMES} value={settings.seconds} onChange={change("seconds")} />
          </Field>
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
        <PyramidGame key={game} data={data} difficulty={settings.difficulty} seconds={settings.seconds} />
      </>
    );

  return (
    <GameLayout
      eyebrow={tr("Sürət oyunu")}
      title={tr("Piramida")}
      description={tr("5-4-3-2-1: hər səviyyədə iki şərtə uyğun futbolçuları vaxt bitməmiş yaz və zirvəyə qalx.")}
      compact={Boolean(data) && game > 0}
    >
      <style>{PYRAMID_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
