import { useEffect, useState } from "react";
import { loadData } from "../../../lib/data";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import ModeSelect from "../common/ModeSelect";
import AuctionGame from "./AuctionGame";
import { AUCTION_KEYFRAMES } from "./AuctionParts";
import AuctionSettings from "./AuctionSettings";
import AuctionDuel from "./AuctionDuel";
import { hasDuelEntry } from "../../../lib/games/useDuelRoom";
import { loadSettings, saveSettings } from "./settings";

import { tr } from "../../../i18n";
export default function Auksion() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [invited] = useState(() => hasDuelEntry("auction"));
  const [screen, setScreen] = useState(invited ? "game" : "modes");
  const [mode, setMode] = useState(invited ? "friend" : null);
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
  if (error) body = <Notice title={tr("Data yüklənmədi")} text={error} />;
  else if (!data) body = <Loader text={tr("Oyunçular yüklənir...")} />;
  else if (screen === "modes")
    body = (
      <ModeSelect
        friends
        onPick={(key) => {
          setMode(key);
          setScreen(key === "friend" ? "game" : "settings");
        }}
        texts={{
          same: tr("Dostunla eyni ekranda hərraca gir"),
          solo: tr("Bota qarşı komanda yığ"),
        }}
      />
    );
  else if (screen === "settings")
    body = (
      <AuctionSettings
        mode={mode}
        settings={settings}
        onChange={changeSettings}
        onStart={() => {
          setGameKey((k) => k + 1);
          setScreen("game");
        }}
        onBack={() => setScreen("modes")}
      />
    );
  else if (mode === "friend")
    body = (
      <AuctionDuel
        key={gameKey}
        data={data}
        settings={settings}
        onSettingsChange={changeSettings}
        onSettings={() => setScreen("modes")}
      />
    );
  else
    body = (
      <AuctionGame
        key={gameKey}
        data={data}
        mode={mode}
        settings={settings}
        onSettings={() => setScreen("settings")}
      />
    );

  return (
    <GameLayout
      eyebrow={tr("Hərrac oyunu")}
      title={tr("Açıq Artırma")}
      description={tr("20 ₼ büdcə ilə hərraca gir, 5 oyunçuluq komanda yığ. Ən güclü heyəti quran qalib olur.")}
      compact={Boolean(data) && screen !== "modes"}
    >
      <style>{AUCTION_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
