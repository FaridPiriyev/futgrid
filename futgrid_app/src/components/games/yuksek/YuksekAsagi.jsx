import { useEffect, useState } from "react";
import { loadData } from "../../../lib/data";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import HLGame, { HL_KEYFRAMES } from "./HLGame";
import HLSettings from "./HLSettings";
import { loadSettings, saveSettings } from "./settings";

export default function YuksekAsagi() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState("settings");
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

  const changeSettings = (next) => {
    setSettings(next);
    saveSettings(next);
  };

  let body;
  if (error) body = <Notice title="Data yüklənmədi" text={error} />;
  else if (!data) body = <Loader text="Oyunçular yüklənir..." />;
  else if (screen === "settings")
    body = (
      <HLSettings
        settings={settings}
        onChange={changeSettings}
        onStart={() => {
          setGameKey((k) => k + 1);
          setScreen("game");
        }}
      />
    );
  else
    body = (
      <HLGame
        key={gameKey}
        data={data}
        settings={settings}
        onSettings={() => setScreen("settings")}
      />
    );

  return (
    <GameLayout
      eyebrow="Seriya oyunu"
      title="Yüksək yoxsa Aşağı?"
      description="İki futbolçudan hansının bazar dəyəri daha yüksəkdir? Düzgün tap, seriyanı uzat və rekordunu qır."
      compact={Boolean(data) && screen === "game"}
    >
      <style>{HL_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
