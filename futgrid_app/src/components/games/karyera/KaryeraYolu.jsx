import { useEffect, useState } from "react";
import { loadData } from "../../../lib/data";
import { Segmented } from "../common/controls";
import GameLayout from "../common/GameLayout";
import { Loader, Notice } from "../common/GameStatus";
import CareerGame, { CAREER_KEYFRAMES } from "./CareerGame";

const KEY = "futgrid:karyera:difficulty";

const LEVELS = [
  { value: "easy", label: "Asan", sub: "ən məşhur 250" },
  { value: "normal", label: "Normal", sub: "ilk 1200" },
  { value: "hard", label: "Çətin", sub: "ilk 5000" },
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
  if (error) body = <Notice title="Data yüklənmədi" text={error} />;
  else if (!data) body = <Loader text="Oyunçular yüklənir..." />;
  else
    body = (
      <>
        <div className="mx-auto mb-6 max-w-2xl">
          <Segmented label="Çətinlik" options={LEVELS} value={difficulty} onChange={change} />
        </div>
        <CareerGame key={difficulty} data={data} difficulty={difficulty} />
      </>
    );

  return (
    <GameLayout
      eyebrow="Bilik oyunu"
      title="Karyera yolu"
      description="Klubların ardıcıllığına bax və bu yolu keçən futbolçunu tap. 10 raund, hər raundda 3 cəhd."
      compact={Boolean(data)}
    >
      <style>{CAREER_KEYFRAMES}</style>
      {body}
    </GameLayout>
  );
}
