import { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { loadData } from "../../../lib/data";
import { SIZES, roundName } from "../../../lib/games/goat";
import { Field, Segmented, SETTINGS_CARD, SettingsHeader } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader } from "../common/GameStatus";
import { BTN_GHOST, BTN_PRIMARY, FONT, SWEEP_BLUE, SWEEP_WHITE } from "../common/ui";
import GoatGame, { GOAT_KEYFRAMES } from "./GoatGame";

import { tr } from "../../../i18n";
const KEY = "futgrid:goat:size";

const SIZE_OPTIONS = SIZES.map((n) => ({
  value: n,
  get label() {
    return tr("{n} oyunçu", { n });
  },
  get sub() {
    return tr("{n} seçim", { n: n - 1 });
  },
}));

function readSize() {
  try {
    const n = Number(localStorage.getItem(KEY));
    return SIZES.includes(n) ? n : 128;
  } catch {
    return 128;
  }
}

export default function TarixinEnYaxsisi() {
  const [data, setData] = useState(undefined);
  const [size, setSize] = useState(readSize);
  const [game, setGame] = useState(0);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const change = (value) => {
    setSize(value);
    try {
      localStorage.setItem(KEY, String(value));
    } catch {}
  };

  const steps = [];
  for (let n = size; n >= 2; n /= 2) steps.push(roundName(n));

  let body;
  if (data === undefined) body = <Loader text={tr("Oyunçular yüklənir...")} />;
  else if (!game)
    body = (
      <section className={`mx-auto max-w-3xl ${SETTINGS_CARD}`}>
        <SettingsHeader
          title={tr("Turnir")}
          accent={tr("parametrlər")}
          sub={tr("Hər dəfə iki əfsanə qarşılaşır, daha yaxşı hesab etdiyini seç. Qalib növbəti tura keçir, sonda tarixin ən yaxşısı qalır.")}
        />
        <div className="mt-6 space-y-6">
          <Field label={tr("Oyunçu sayı")}>
            <Segmented label={tr("Oyunçu sayı")} options={SIZE_OPTIONS} value={size} onChange={change} />
          </Field>
          <div className="flex flex-wrap items-center gap-1.5">
            {steps.map((s, i) => (
              <span key={s} className="flex items-center gap-1.5">
                {i > 0 && <span className="h-px w-3 bg-edge" />}
                <span
                  className={`rounded-full px-3 py-1 ${FONT} text-xs font-bold uppercase tracking-wide ${
                    i === steps.length - 1 ? "bg-yellow text-on-yellow" : "bg-page-2 text-muted"
                  }`}
                >
                  {s}
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="mt-7 border-t border-edge pt-5">
          <button type="button" onClick={() => setGame((g) => g + 1)} className={BTN_PRIMARY}>
            <span aria-hidden="true" className={SWEEP_WHITE} />
            <Play className="h-4 w-4" />
            {tr("Turniri başlat")}
          </button>
        </div>
      </section>
    );
  else
    body = (
      <>
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={() => setGame(0)} className={BTN_GHOST}>
            <span aria-hidden="true" className={SWEEP_BLUE} />
            <ArrowLeft className="h-4 w-4" />
            {tr("Parametrlər")}
          </button>
        </div>
        <GoatGame key={`${game}-${size}`} data={data} size={size} />
      </>
    );

  return (
    <GameLayout
      eyebrow={tr("Səsvermə oyunu")}
      title={tr("Tarixin ən yaxşısı")}
      description={tr("128 ikonik futbolçu, hər turda ikisindən biri. 64, 32, 16… sonda tək bir əfsanə qalır.")}
      compact={data !== undefined && game > 0}
    >
      <style>{GOAT_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
