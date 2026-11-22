import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { loadData } from "../../../lib/data";
import { Field, Segmented, SETTINGS_CARD, SettingsHeader } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import { BTN_PRIMARY, SWEEP_WHITE } from "../common/ui";
import UltimateGame, { ULTIMATE_KEYFRAMES } from "./UltimateGame";
import { tr } from "../../../i18n";

const KEY = "futgrid:ultimate:settings";
const DEFAULTS = { formation: "4-3-3", difficulty: "normal" };

const FORMATION_OPTS = ["4-3-3", "4-4-2", "3-5-2"].map((v) => ({ value: v, label: v }));
const LEVELS = [
  { value: "easy", get label() { return tr("Asan"); }, get sub() { return tr("dünya nəhəngləri"); } },
  { value: "normal", get label() { return tr("Normal"); }, get sub() { return tr("tanınmış klublar"); } },
  { value: "hard", get label() { return tr("Çətin"); }, get sub() { return tr("bütün klublar"); } },
];
function load() {
  try {
    const { formation, difficulty } = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      formation: ["4-3-3", "4-4-2", "3-5-2"].includes(formation) ? formation : DEFAULTS.formation,
      difficulty: ["easy", "normal", "hard"].includes(difficulty) ? difficulty : DEFAULTS.difficulty,
    };
  } catch {
    return DEFAULTS;
  }
}

export default function Ultimate() {
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
  if (error) body = <Notice title={tr("Data yüklənmədi")} text={error} />;
  else if (!data) body = <Loader text={tr("Oyunçular yüklənir...")} />;
  else if (!game)
    body = (
      <section className={`mx-auto max-w-3xl ${SETTINGS_CARD}`}>
        <SettingsHeader
          title={tr("Ultimate 11")}
          accent={tr("parametrlər")}
          sub={tr("11 raund. Hər raundda KOMANDA və DÖVR barabanı fırlanır, o komandada o illərdə oynamış futbolçulardan birini heyətinə götürürsən. Reytinqlər gizlidir — yalnız sonda açılır. Əfsanəvi komandalar da düşür: 2005 Milan, 2002 Braziliya, 2009 Barselona...")}
        />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Field label={tr("Sxem")}>
            <Segmented label={tr("Sxem")} options={FORMATION_OPTS} value={settings.formation} onChange={change("formation")} />
          </Field>
          <Field label={tr("Çətinlik")}>
            <Segmented label={tr("Çətinlik")} options={LEVELS} value={settings.difficulty} onChange={change("difficulty")} />
          </Field>
        </div>
        <div className="mt-7 border-t border-edge pt-5">
          <button type="button" onClick={() => setGame((g) => g + 1)} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <Play className="h-4 w-4" />
            {tr("Oyuna başla")}
          </button>
        </div>
      </section>
    );
  else
    body = (
      <UltimateGame
        key={game}
        data={data}
        formation={settings.formation}
        difficulty={settings.difficulty}
        onAgain={() => setGame((g) => g + 1)}
        onSettings={() => setGame(0)}
      />
    );

  return (
    <GameLayout
      eyebrow={tr("Komanda qur")}
      title={tr("Ultimate 11")}
      description={tr("Klub və dövr barabanlarını fırlat, hər raundda bir futbolçu seç və ən güclü 11-i qur.")}
      compact={Boolean(data) && game > 0}
    >
      <style>{ULTIMATE_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
