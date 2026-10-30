import { useEffect, useState } from "react";
import { loadData } from "../../../lib/data";
import { Segmented } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import WordleGame, { WORDLE_KEYFRAMES } from "./WordleGame";

const KEY = "futgrid:wordle:settings";

const MODES = [
  { value: "daily", label: "Günün oyunçusu", sub: "hamı üçün eyni" },
  { value: "endless", label: "Sonsuz", sub: "istədiyin qədər" },
];

const LEVELS = [
  { value: "easy", label: "Asan", sub: "ən məşhur 150" },
  { value: "normal", label: "Normal", sub: "ilk 600" },
  { value: "hard", label: "Çətin", sub: "ilk 2500" },
];

function load() {
  try {
    return { mode: "daily", difficulty: "normal", ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { mode: "daily", difficulty: "normal" };
  }
}

export default function FutbolWordle() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(load);

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
  else
    body = (
      <>
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <Segmented label="Rejim" options={MODES} value={settings.mode} onChange={change("mode")} />
          <Segmented label="Çətinlik" options={LEVELS} value={settings.difficulty} onChange={change("difficulty")} />
        </div>
        <WordleGame
          key={`${settings.mode}-${settings.difficulty}`}
          data={data}
          mode={settings.mode}
          difficulty={settings.difficulty}
        />
      </>
    );

  return (
    <GameLayout
      eyebrow="Söz oyunu"
      title="Futbol Wordle"
      description="Futbolçunun soyadını 6 cəhddə tap. Yaşıl hərf yerindədir, sarı hərf sözdə var amma başqa yerdədir, boz hərf isə yoxdur."
      compact={Boolean(data)}
    >
      <style>{WORDLE_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
