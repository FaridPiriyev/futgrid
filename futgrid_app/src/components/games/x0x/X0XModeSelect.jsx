import { Monitor, User, Users, Wifi } from "lucide-react";
import { FONT } from "../common/ui";

import { tr } from "../../../i18n";
const MODES = [
  { key: "friend", Icon: Users, get title() {
    return tr("Dostla");
  }, get text() {
    return tr("Dostunu onlayn oyuna dəvət et");
  }, soon: true },
  { key: "online", Icon: Wifi, get title() {
    return tr("Onlayn rəqib");
  }, get text() {
    return tr("Başqa futbol azarkeşi ilə yarış");
  }, soon: true },
  { key: "same", Icon: Monitor, get title() {
    return tr("Eyni ekran");
  }, get text() {
    return tr("Dostunla eyni cihazda oyna");
  } },
  { key: "solo", Icon: User, get title() {
    return tr("Tək oyunçu");
  }, get text() {
    return tr("Günün cədvəlini doldur");
  } },
];

export default function X0XModeSelect({ onPick }) {
  return (
    <div>
      <h2 className={`${FONT} text-sm font-bold uppercase tracking-wide text-soft md:text-lg`}>{tr("Rejim seç")}</h2>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 md:mt-4 lg:grid-cols-4">
        {[...MODES].sort((a, b) => Number(Boolean(a.soon)) - Number(Boolean(b.soon))).map(({ key, Icon, title, text, soon }) => (
          <button
            key={key}
            type="button"
            disabled={soon}
            onClick={() => onPick(key)}
            className="group relative flex items-center gap-3.5 rounded-xl border border-line/10 bg-surface/85 px-4 py-3.5 text-left transition-all duration-300 sm:flex-col sm:gap-3 sm:rounded-none sm:px-5 sm:py-8 sm:text-center sm:order-none enabled:hover:-translate-y-1 enabled:hover:border-accent enabled:hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {soon && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 bg-line/10 px-2 py-0.5 sm:top-3 sm:translate-y-0 ${FONT} text-[10px] font-bold uppercase tracking-wider text-soft`}>
                {tr("Tezliklə")}
              </span>
            )}
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent/10 sm:h-auto sm:w-auto sm:bg-transparent">
              <Icon className="h-6 w-6 text-accent-hi transition-transform duration-300 group-enabled:group-hover:scale-110 sm:h-9 sm:w-9" strokeWidth={1.6} />
            </span>
            <span className="min-w-0 sm:contents">
              <span className={`block ${FONT} text-base font-bold uppercase tracking-wide text-ink sm:text-xl`}>{title}</span>
              <span className={`block ${FONT} text-xs font-light text-muted sm:text-sm`}>{text}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
