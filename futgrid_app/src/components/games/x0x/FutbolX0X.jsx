import { useEffect, useMemo, useState } from "react";
import { datasetFor, loadData } from "../../../lib/data";
import { buildCategoryPool } from "../../../lib/games/x0xCategories";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import X0XMatch from "./X0XMatch";
import X0XModeSelect from "./X0XModeSelect";
import X0XSettings from "./X0XSettings";
import X0XSolo from "./X0XSolo";
import { loadSettings, saveSettings } from "./settings";

const TITLE = "Futbol X0X";

export default function FutbolX0X() {
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

  const gameData = useMemo(
    () => (data ? datasetFor(data, settings.era) : null),
    [data, settings.era],
  );

  const available = useMemo(() => {
    if (!gameData) return {};
    const pool = buildCategoryPool(gameData);
    return Object.fromEntries(
      Object.entries(pool).map(([k, v]) => [k, v.length > 0]),
    );
  }, [gameData]);

  const activeSettings = useMemo(
    () => ({
      ...settings,
      categories: Object.fromEntries(
        Object.entries(settings.categories).map(([k, v]) => [
          k,
          v && Boolean(available[k]),
        ]),
      ),
    }),
    [settings, available],
  );

  const changeSettings = (next) => {
    setSettings(next);
    saveSettings(next);
  };

  const pickMode = (key) => {
    setMode(key);
    setScreen("settings");
  };

  const start = () => {
    setGameKey((k) => k + 1);
    setScreen("game");
  };

  const toSettings = () => setScreen("settings");

  let body;
  if (error) body = <Notice title="Data yüklənmədi" text={error} />;
  else if (!data) body = <Loader text="Oyunçular yüklənir..." />;
  else if (screen === "modes") body = <X0XModeSelect onPick={pickMode} />;
  else if (screen === "settings")
    body = (
      <X0XSettings
        mode={mode}
        settings={settings}
        onChange={changeSettings}
        onStart={start}
        onBack={() => setScreen("modes")}
        available={available}
      />
    );
  else if (mode === "solo")
    body = (
      <X0XSolo
        key={gameKey}
        data={gameData}
        settings={activeSettings}
        onSettings={toSettings}
      />
    );
  else
    body = (
      <X0XMatch
        key={gameKey}
        data={gameData}
        settings={activeSettings}
        onSettings={toSettings}
      />
    );

  return (
    <GameLayout
      eyebrow="Futbol bilik oyunu"
      title={TITLE}
      description="Rejim seç, parametrləri qur və oyuna başla."
      compact={Boolean(data) && screen !== "modes"}
    >
      {body}
    </GameLayout>
  );
}
