import { useEffect, useState } from "react";
import { loadData } from "../../../lib/data";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import HLGame, { HL_KEYFRAMES } from "./HLGame";
import HLSettings from "./HLSettings";
import HLLine from "./HLLine";
import HLDuel from "./HLDuel";
import ModeSelect from "../common/ModeSelect";
import { hasDuelEntry } from "../../../lib/games/useDuelRoom";
import { loadSettings, saveSettings } from "./settings";

import { tr } from "../../../i18n";
export default function YuksekAsagi() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [invited] = useState(() => hasDuelEntry("higherLower"));
  const [mode, setMode] = useState(invited ? "friend" : null);
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
  if (error) body = <Notice title={tr("Data yüklənmədi")} text={error} />;
  else if (!data) body = <Loader text={tr("Oyunçular yüklənir...")} />;
  else if (!mode)
    body = (
      <div className="mx-auto max-w-5xl">
        <ModeSelect
          friends
          hide={["same"]}
          onPick={setMode}
          texts={{
            friend: tr("Eyni cütlüklər, kim daha çox tapacaq?"),
            solo: tr("Seriyanı uzat, rekordunu qır"),
          }}
        />
      </div>
    );
  else if (mode === "friend")
    body = <HLDuel data={data} onSettings={() => setMode(null)} />;
  else if (screen === "settings")
    body = (
      <HLSettings
        settings={settings}
        onChange={changeSettings}
        onBack={() => setMode(null)}
        onStart={() => {
          setGameKey((k) => k + 1);
          setScreen("game");
        }}
      />
    );
  else if (settings.mode === "line")
    body = (
      <HLLine
        key={gameKey}
        data={data}
        settings={settings}
        onSettings={() => setScreen("settings")}
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
      eyebrow={tr("Seriya oyunu")}
      title={tr("Yüksək yoxsa Aşağı?")}
      description={tr("İki futbolçudan hansının bazar dəyəri daha yüksəkdir? Düzgün tap, seriyanı uzat və rekordunu qır.")}
      compact={Boolean(data) && (mode === "friend" || (mode && screen !== "settings"))}
    >
      <style>{HL_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
