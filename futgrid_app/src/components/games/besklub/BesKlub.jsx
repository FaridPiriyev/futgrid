import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { loadData } from "../../../lib/data";
import { Segmented } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "../common/ui";
import FiveClubsGame, { FIVE_KEYFRAMES } from "./FiveClubsGame";

const KEY = "futgrid:besklub:settings";

const LEVELS = [
  { value: "easy", label: "Asan", sub: "top klublar" },
  { value: "normal", label: "Normal", sub: "ilk 60 klub" },
  { value: "hard", label: "Çətin", sub: "ilk 140 klub" },
];

const TIMES = [
  { value: 60, label: "1 dəq" },
  { value: 120, label: "2 dəq" },
  { value: 180, label: "3 dəq" },
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
  if (error) body = <Notice title="Data yüklənmədi" text={error} />;
  else if (!data) body = <Loader text="Oyunçular yüklənir..." />;
  else if (!game)
    body = (
      <section className="mx-auto max-w-3xl border border-line/10 bg-surface/85 p-4 md:p-6">
        <h2 className={`${FONT} text-xl font-bold uppercase tracking-wide text-ink md:text-2xl`}>
          Tək oyunçu<span className="text-faint"> · parametrlər</span>
        </h2>
        <p className={`mt-1 ${FONT} text-sm text-faint`}>
          Ekrana 5 klub gəlir. Vaxt bitənə qədər bu klublardan ən azı ikisində oynamış futbolçuları yaz.
          2 klub = 2 xal, 3 klub = 3 xal və s.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <p className={`mb-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-muted`}>Çətinlik</p>
            <Segmented label="Çətinlik" options={LEVELS} value={settings.difficulty} onChange={change("difficulty")} />
          </div>
          <div>
            <p className={`mb-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-muted`}>Vaxt</p>
            <Segmented label="Vaxt" options={TIMES} value={settings.seconds} onChange={change("seconds")} />
          </div>
        </div>
        <div className="mt-5 border-t border-line/10 pt-4">
          <button type="button" onClick={() => setGame(1)} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <Play className="h-4 w-4" />
            Oyuna başla
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
      eyebrow="Sürət oyunu"
      title="5 klub"
      description="Beş klubu birləşdirən futbolçuları tap. Nə qədər çox klubu birləşdirsən, o qədər çox xal."
      compact={Boolean(data) && game > 0}
    >
      <style>{FIVE_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
