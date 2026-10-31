import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { loadData } from "../../../lib/data";
import { Field, Segmented, SETTINGS_CARD, SettingsHeader } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import { BTN_PRIMARY, SWEEP_WHITE } from "../common/ui";
import FiveClubsGame, { FIVE_KEYFRAMES } from "./FiveClubsGame";

import { tr } from "../../../i18n";
const KEY = "futgrid:besklub:settings";

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
  { value: 60, get label() {
    return tr("1 dəq");
  } },
  { value: 120, get label() {
    return tr("2 dəq");
  } },
  { value: 180, get label() {
    return tr("3 dəq");
  } },
];

function load() {
  try {
    return { difficulty: "easy", seconds: 120, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { difficulty: "easy", seconds: 120 };
  }
}

export default function BesKlub() {
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
          sub={tr("Ekrana 5 klub gəlir. Əvvəl futbolçunun oynadığı klubları seç (ən azı 2), sonra adını yaz. Seçdiyin klubların hamısında oynayıbsa, seçdiyin klub sayı qədər xal alırsan: 2 klub = 2 xal, 3 klub = 3 xal.")}
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
      <FiveClubsGame
        key={game}
        data={data}
        difficulty={settings.difficulty}
        seconds={settings.seconds}
      />
    );

  return (
    <GameLayout
      eyebrow={tr("Sürət oyunu")}
      title={tr("5 klub")}
      description={tr("Ortaq klubları seç, onları birləşdirən futbolçunu yaz. Nə qədər çox klubu birləşdirsən, o qədər çox xal.")}
      compact={Boolean(data) && game > 0}
    >
      <style>{FIVE_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
