import { useState } from "react";
import { Check, Loader2, Search, Send, UserPlus, Users, X } from "lucide-react";
import { useSocial } from "../../lib/social";
import { tr } from "../../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const CARD = "rounded-[14px] border border-line/10 bg-line/3 p-4 md:p-5";

function Person({ person, children }) {
  const { openProfile } = useSocial();
  const letter = (person.displayName || person.username || "?").slice(0, 1).toUpperCase();
  return (
    <li className="flex items-center gap-3 py-2">
      <button type="button" onClick={() => openProfile(person.username)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="relative shrink-0">
          {person.avatarUrl ? (
            <img src={person.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className={`grid h-9 w-9 place-items-center rounded-full bg-line/10 ${FONT} text-sm font-bold text-muted`}>{letter}</span>
          )}
          {person.online !== undefined ? (
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface ${person.online ? "bg-good" : "bg-line/30"}`} />
          ) : null}
        </span>
        <span className="min-w-0">
          <span className={`block truncate ${FONT} text-sm font-extrabold uppercase text-ink hover:text-accent`}>{person.displayName}</span>
          <span className={`block truncate ${FONT} text-xs text-muted`}>
            @{person.username}
            {person.online ? ` · ${tr("onlayn")}` : ""}
          </span>
        </span>
      </button>
      {children}
    </li>
  );
}

/**
 * Friends list with requests and "add by username".
 * With `onInvite` it becomes an invite picker for a waiting duel room (online friends first).
 */
export default function FriendsPanel({ onInvite = null, compact = false }) {
  const { friends, setFriend } = useSocial();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState({});

  if (!friends) return null;

  const act = async (username, action) => {
    setBusy(username);
    setNote("");
    try {
      const res = await setFriend(username, action);
      return res;
    } catch (error) {
      setNote(error?.status === 404 ? tr("Bu istifadəçi adı tapılmadı.") : tr("Alınmadı, yenidən cəhd et."));
      return null;
    } finally {
      setBusy("");
    }
  };

  const add = async (event) => {
    event.preventDefault();
    const username = name.trim().replace(/^@/, "");
    if (!username) return;
    const res = await act(username, "add");
    if (res) {
      setName("");
      setNote(res.status === "friends" ? tr("Artıq dostsunuz!") : tr("İstək göndərildi."));
    }
  };

  const invite = async (username) => {
    setBusy(username);
    const res = await onInvite(username);
    setBusy("");
    setSent((s) => ({ ...s, [username]: !res?.error }));
    if (res?.error) setNote(tr("Dəvət göndərilmədi."));
  };

  if (onInvite) {
    if (!friends.friends.length) return null;
    return (
      <div className={CARD}>
        <p className={`inline-flex items-center gap-2 ${FONT} text-sm font-bold uppercase tracking-[0.12em] text-ink`}>
          <Users className="h-4 w-4 text-accent" />
          {tr("Dostunu çağır")}
        </p>
        <ul className="mt-2 divide-y divide-line/8">
          {friends.friends.slice(0, compact ? 5 : 20).map((friend) => (
            <Person key={friend.username} person={friend}>
              <button
                type="button"
                disabled={busy === friend.username || sent[friend.username]}
                onClick={() => void invite(friend.username)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 ${FONT} text-xs font-bold uppercase tracking-wider ${
                  sent[friend.username] ? "text-good-hi" : friend.online ? "bg-accent-lo text-white hover:bg-accent" : "border border-line/20 text-muted hover:text-ink"
                }`}
              >
                {busy === friend.username ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : sent[friend.username] ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {sent[friend.username] ? tr("Göndərildi") : tr("Çağır")}
              </button>
            </Person>
          ))}
        </ul>
        {note ? <p className={`mt-2 ${FONT} text-xs text-bad-hi`}>{note}</p> : null}
      </div>
    );
  }

  return (
    <section className={CARD}>
      <h3 className={`inline-flex items-center gap-2 ${FONT} text-base font-extrabold uppercase tracking-[0.08em] text-ink`}>
        <Users className="h-4.5 w-4.5 text-accent" />
        {tr("Dostlar")}
        <span className="text-muted">· {friends.friends.length}</span>
      </h3>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr("İstifadəçi adı ilə əlavə et")}
            maxLength={40}
            autoComplete="off"
            className={`h-10 w-full rounded-[10px] border border-line/15 bg-line/5 pl-9 pr-3 ${FONT} text-sm text-ink placeholder-faint outline-none focus:border-accent`}
          />
        </label>
        <button type="submit" disabled={!name.trim() || Boolean(busy)} className={`inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-accent-lo px-3.5 ${FONT} text-sm font-bold uppercase text-white hover:bg-accent disabled:opacity-50`}>
          <UserPlus className="h-4 w-4" />
          {tr("Əlavə et")}
        </button>
      </form>
      {note ? <p className={`mt-2 ${FONT} text-xs text-muted`}>{note}</p> : null}

      {friends.incoming.length ? (
        <>
          <p className={`mt-4 ${FONT} text-xs font-bold uppercase tracking-[0.14em] text-yellow`}>{tr("Dostluq istəkləri")}</p>
          <ul className="divide-y divide-line/8">
            {friends.incoming.map((person) => (
              <Person key={person.username} person={person}>
                <button type="button" disabled={busy === person.username} onClick={() => void act(person.username, "add")} aria-label={tr("Qəbul et")} className="grid h-9 w-9 place-items-center rounded-[10px] bg-good/15 text-good-hi hover:bg-good/25">
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" disabled={busy === person.username} onClick={() => void act(person.username, "remove")} aria-label={tr("Rədd et")} className="grid h-9 w-9 place-items-center rounded-[10px] bg-line/8 text-muted hover:text-bad-hi">
                  <X className="h-4 w-4" />
                </button>
              </Person>
            ))}
          </ul>
        </>
      ) : null}

      {friends.friends.length ? (
        <ul className="mt-3 divide-y divide-line/8">
          {friends.friends.map((person) => (
            <Person key={person.username} person={person} />
          ))}
        </ul>
      ) : (
        <p className={`mt-4 ${FONT} text-sm text-muted`}>
          {tr("Hələ dostun yoxdur. Reytinqdə və ya duelda oyunçunun adına toxun, profilindən əlavə et.")}
        </p>
      )}

      {friends.outgoing.length ? (
        <p className={`mt-3 ${FONT} text-xs text-faint`}>
          {tr("Gözləyən istəklər: {names}", { names: friends.outgoing.map((p) => `@${p.username}`).join(", ") })}
        </p>
      ) : null}
    </section>
  );
}
