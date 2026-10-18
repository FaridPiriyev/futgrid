import { Link } from "react-router-dom";
import GameLayout from "./GameLayout";
import { BTN_PRIMARY, FONT, SWEEP_WHITE } from "./ui";

export default function ComingSoon({ title }) {
  return (
    <GameLayout eyebrow="Tezliklə" title={title}>
      <div className="mx-auto max-w-xl border border-white/10 bg-[#0b0e14]/85 p-8 text-center">
        <p className={`${FONT} text-lg font-light text-neutral-400`}>
          Bu oyun hazırlanır. Hələlik Futbol X0X-da gücünü sına.
        </p>
        <Link to="/oyunlar/futbol-x0x" className={`${BTN_PRIMARY} mt-6`}>
          <span aria-hidden="true" className={SWEEP_WHITE} />
          Futbol X0X oyna
        </Link>
      </div>
    </GameLayout>
  );
}
