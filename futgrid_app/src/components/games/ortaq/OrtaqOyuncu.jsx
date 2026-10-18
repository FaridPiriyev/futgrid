import { useEffect, useMemo, useState } from "react";
import { datasetFor, loadData } from "../../../lib/data";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import ModeSelect from "../common/ModeSelect";
import OrtaqSettings from "./OrtaqSettings";
import OrtaqSolo from "./OrtaqSolo";
import OrtaqVersus from "./OrtaqVersus";
import { CARD_KEYFRAMES } from "./PokerCard";
import { loadSettings, saveSettings } from "./settings";

const TITLE = "Ortaq oyunçu";

export default function OrtaqOyuncu() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState("modes");
  const [mode, setMode] = useState(null);
  const [settings, setSettings] = useState(loadSettings);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  const gameData = useMemo(
    () => (data ? datasetFor(data, settings.era) : null),
    [data, settings.era],
  );

  const changeSettings = (next) => {
    setSettings(next);
    saveSettings(next);
  };

  const start = () => {
    setGameKey((k) => k + 1);
    setScreen("game");
  };

  let body;
  if (error) body = <Notice title="Data yüklənmədi" text={error} />;
  else if (!data) body = <Loader text="Oyunçular yüklənir..." />;
  else if (screen === "modes")
    body = (
      <ModeSelect
        onPick={(key) => {
          setMode(key);
          setScreen("settings");
        }}
        texts={{
          same: "Klubunu gizli seç, kartlar birlikdə açılsın",
          solo: "Sistemin verdiyi cütün ortaq oyunçusunu tap",
        }}
      />
    );
  else if (screen === "settings")
    body = (
      <OrtaqSettings
        mode={mode}
        settings={settings}
        onChange={changeSettings}
        onStart={start}
        onBack={() => setScreen("modes")}
      />
    );
  else if (mode === "solo")
    body = (
      <OrtaqSolo
        key={gameKey}
        data={gameData}
        settings={settings}
        onSettings={() => setScreen("settings")}
      />
    );
  else
    body = (
      <OrtaqVersus
        key={gameKey}
        data={gameData}
        settings={settings}
        onSettings={() => setScreen("settings")}
      />
    );

  return (
    <GameLayout
      eyebrow="Futbol bilik oyunu"
      title={TITLE}
      description="İki klubda və ya klub və ölkədə ortaq olan oyunçunu tap."
      compact={Boolean(data) && screen !== "modes"}
    >
      <style>{CARD_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
