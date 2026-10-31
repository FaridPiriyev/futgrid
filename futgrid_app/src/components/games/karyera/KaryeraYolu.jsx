import { useEffect, useState } from "react";
import { loadData } from "../../../lib/data";
import { Field, Segmented, SETTINGS_CARD } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import CareerGame, { CAREER_KEYFRAMES } from "./CareerGame";

import { tr } from "../../../i18n";
const KEY = "futgrid:karyera:difficulty";

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

const read = () => {
  try {
    return localStorage.getItem(KEY) || "normal";
  } catch {
    return "normal";
  }
};

export default function KaryeraYolu() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [difficulty, setDifficulty] = useState(read);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const change = (value) => {
    setDifficulty(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {}
  };

  let body;
  if (error) body = <Notice title={tr("Data yüklənmədi")} text={error} />;
  else if (!data) body = <Loader text={tr("Oyunçular yüklənir...")} />;
  else
    body = (
      <>
        <div className={`mx-auto mb-6 max-w-2xl ${SETTINGS_CARD} md:p-6`}>
          <Field label={tr("Çətinlik")}>
            <Segmented label={tr("Çətinlik")} options={LEVELS} value={difficulty} onChange={change} />
          </Field>
        </div>
        <CareerGame key={difficulty} data={data} difficulty={difficulty} />
      </>
    );

  return (
    <GameLayout
      eyebrow={tr("Bilik oyunu")}
      title={tr("Karyera yolu")}
      description={tr("Klubların ardıcıllığına bax və bu yolu keçən futbolçunu tap. 10 raund, hər raundda 3 cəhd.")}
      compact={Boolean(data)}
    >
      <style>{CAREER_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
