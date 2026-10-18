import { Monitor, User, Users, Wifi } from "lucide-react";
import { FONT } from "../common/ui";

const MODES = [
  { key: "friend", Icon: Users, title: "Dostla", text: "Dostunu onlayn oyuna dəvət et", soon: true },
  { key: "online", Icon: Wifi, title: "Onlayn rəqib", text: "Başqa futbol azarkeşi ilə yarış", soon: true },
  { key: "same", Icon: Monitor, title: "Eyni ekran", text: "Dostunla eyni cihazda oyna" },
  { key: "solo", Icon: User, title: "Tək oyunçu", text: "Günün cədvəlini doldur" },
];

export default function X0XModeSelect({ onPick }) {
  return (
    <div>
      <h2 className={`${FONT} text-lg font-bold uppercase tracking-wide text-neutral-300`}>Rejim seç</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map(({ key, Icon, title, text, soon }) => (
          <button
            key={key}
            type="button"
            disabled={soon}
            onClick={() => onPick(key)}
            className="group relative flex flex-col items-center gap-3 border border-white/10 bg-[#0b0e14]/85 px-5 py-8 text-center transition-all duration-300 enabled:hover:-translate-y-1 enabled:hover:border-blue-500 enabled:hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {soon && (
              <span className={`absolute right-3 top-3 bg-white/10 px-2 py-0.5 ${FONT} text-[10px] font-bold uppercase tracking-wider text-neutral-300`}>
                Tezliklə
              </span>
            )}
            <Icon className="h-9 w-9 text-blue-400 transition-transform duration-300 group-enabled:group-hover:scale-110" strokeWidth={1.6} />
            <span className={`${FONT} text-xl font-bold uppercase tracking-wide text-white`}>{title}</span>
            <span className={`${FONT} text-sm font-light text-neutral-400`}>{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
