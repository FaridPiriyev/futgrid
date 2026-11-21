import { useEffect, useState } from "react";
import { loadData } from "../../../lib/data";
import { Lightbulb, Settings2 } from "lucide-react";
import { Field, Segmented, SETTINGS_CARD, Toggle } from "../common/controls";
import { FONT } from "../common/ui";
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
  // Mobildə parametrlər paneli lövhəni ekrandan aşağı itələyirdi: indi qısa sətir kimi görünür, toxunanda açılır.
  const [panelOpen, setPanelOpen] = useState(false);

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
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          className="mb-4 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-edge bg-surface px-4 py-2.5 text-left lg:hidden"
        >
          <span className={`min-w-0 truncate ${FONT} text-sm font-bold uppercase tracking-[0.08em] text-ink`}>
            {MODES.find((m) => m.value === settings.mode)?.label} ·{" "}
            {LEVELS.find((l) => l.value === settings.difficulty)?.label}
            <span className="text-muted">
              {" "}· {settings.hints ? tr("İpuçları açıq") : tr("İpuçları bağlı")}
            </span>
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.12em] text-accent`}>
            <Settings2 className="h-4 w-4" />
            {panelOpen ? tr("Bağla") : tr("Parametrlər")}
          </span>
        </button>
        <div className={`mb-6 gap-5 lg:grid lg:grid-cols-[1fr_1.3fr_0.9fr] lg:items-end ${panelOpen ? "grid" : "hidden"} ${SETTINGS_CARD} md:p-6`}>
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
