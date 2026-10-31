import { useEffect, useState } from "react";
import { loadData } from "../../../lib/data";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import ModeSelect from "../common/ModeSelect";
import AuctionGame from "./AuctionGame";
import { AUCTION_KEYFRAMES } from "./AuctionParts";
import AuctionSettings from "./AuctionSettings";
import { loadSettings, saveSettings } from "./settings";

import { tr } from "../../../i18n";
export default function Auksion() {
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
        onPick={(key) => {
          setMode(key);
          setScreen("settings");
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
