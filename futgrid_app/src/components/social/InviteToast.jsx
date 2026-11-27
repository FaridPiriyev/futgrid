import { Swords, X } from "lucide-react";
import { gameName } from "../../lib/games/names";
import { tr } from "../../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";

/** Bottom-right toast for incoming friend game invites. */
export default function InviteToast({ invites, onAccept, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[84px] z-[70] md:bottom-5 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5">
      {invites.map((invite) => {
        const name = invite.from?.displayName || invite.from?.name || invite.from?.username || "?";
        return (
          <div
            key={invite.code}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[16px] border border-accent/40 bg-surface p-3.5 shadow-2xl sm:w-96"
          >
            {invite.from?.avatarUrl ? (
              <img src={invite.from.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                <Swords className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className={`truncate ${FONT} text-sm font-extrabold uppercase text-ink`}>
                {tr("{name} səni çağırır", { name })}
              </p>
              <p className={`truncate ${FONT} text-xs text-muted`}>{gameName(invite.game)}</p>
            </div>
            <button
              type="button"
              onClick={() => onAccept(invite)}
              className={`h-9 shrink-0 rounded-[10px] bg-accent-lo px-3 ${FONT} text-xs font-bold uppercase tracking-wider text-white hover:bg-accent`}
            >
              {tr("Qoşul")}
            </button>
            <button type="button" onClick={() => onDismiss(invite.code)} aria-label={tr("Bağla")} className="shrink-0 text-faint hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
