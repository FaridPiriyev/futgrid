import { useEffect, useState } from "react";
import { loadData } from "../../../lib/data";
import { Lightbulb } from "lucide-react";
import { Field, Segmented, SETTINGS_CARD, Toggle } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import WordleGame, { WORDLE_KEYFRAMES } from "./WordleGame";

import { tr } from "../../../i18n";
const KEY = "futgrid:wordle:settings";

const MODES = [
  { value: "daily", get label() {
    return tr("Günün oyunçusu");
  }, get sub() {
    return tr("hamı üçün eyni");
  } },
  { value: "endless", get label() {
    return tr("Sonsuz");
  }, get sub() {
    return tr("istədiyin qədər");
  } },
];

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

function load() {
  try {
    return { mode: "daily", difficulty: "normal", hints: true, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { mode: "daily", difficulty: "normal", hints: true };
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
  if (error) body = <Notice title={tr("Data yüklənmədi")} text={error} />;
  else if (!data) body = <Loader text={tr("Oyunçular yüklənir...")} />;
  else
    body = (
      <>
        <div className={`mb-6 grid gap-5 lg:grid-cols-[1fr_1.3fr_0.9fr] lg:items-end ${SETTINGS_CARD} md:p-6`}>
          <Field label={tr("Rejim")}>
            <Segmented label={tr("Rejim")} options={MODES} value={settings.mode} onChange={change("mode")} />
          </Field>
          <Field label={tr("Çətinlik")}>
            <Segmented label={tr("Çətinlik")} options={LEVELS} value={settings.difficulty} onChange={change("difficulty")} />
          </Field>
          <Toggle
            Icon={Lightbulb}
            checked={settings.hints}
            onChange={change("hints")}
            label={tr("İpuçları")}
            sub={tr("mövqe, ölkə, klub")}
          />
        </div>
        <WordleGame
          key={`${settings.mode}-${settings.difficulty}`}
          data={data}
          mode={settings.mode}
          difficulty={settings.difficulty}
          showHints={settings.hints}
        />
      </>
    );

  return (
    <GameLayout
      eyebrow={tr("Söz oyunu")}
      title={tr("Futbol Wordle")}
      description={tr("Futbolçunun soyadını 6 cəhddə tap. Yaşıl hərf yerindədir, sarı hərf sözdə var amma başqa yerdədir, boz hərf isə yoxdur.")}
      compact={Boolean(data)}
    >
      <style>{WORDLE_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
