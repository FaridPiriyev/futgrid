import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2, Shield, Swords, Trophy, UserMinus, UserPlus } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useSocial } from "../../lib/social";
import { gameName } from "../../lib/games/names";
import { getLang, tr } from "../../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const DIGITS = "font-['Tektur',sans-serif]";
const BTN = `inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 ${FONT} text-sm font-bold uppercase tracking-[0.06em] transition-colors duration-200 disabled:opacity-50`;

const RESULT_TONE = {
  win: "bg-good/20 text-good-hi",
  loss: "bg-bad/15 text-bad-hi",
  draw: "bg-line/10 text-muted",
};
const RESULT_LETTER = { win: () => tr("Q"), loss: () => tr("M"), draw: () => tr("H") };

function Stat({ label, value, tone = "text-ink" }) {
  return (
    <div className="rounded-[12px] border border-line/10 bg-line/4 px-3 py-2.5 text-center">
      <p className={`${DIGITS} text-xl font-bold leading-tight ${tone}`}>{value}</p>
      <p className={`mt-0.5 ${FONT} text-[11px] font-bold uppercase tracking-[0.12em] text-muted`}>{label}</p>
    </div>
  );
}

function FriendButton({ profile, onChange }) {
  const { user } = useAuth();
  const { setFriend } = useSocial();
  const [busy, setBusy] = useState(false);
  if (!user) {
    return (
      <Link to="/hesab" className={`${BTN} border border-line/20 text-ink hover:border-accent hover:text-accent`}>
        <UserPlus className="h-4 w-4" />
        {tr("Dost olmaq üçün daxil ol")}
      </Link>
    );
  }
  if (profile.friendStatus === "self") return null;
  const run = async (action) => {
    setBusy(true);
    try {
      const res = await setFriend(profile.username, action);
      onChange(res.status);
    } finally {
      setBusy(false);
    }
  };
  const status = profile.friendStatus;
  if (status === "friends")
    return (
      <button type="button" disabled={busy} onClick={() => void run("remove")} className={`${BTN} group border border-good/40 text-good-hi hover:border-bad/50 hover:text-bad-hi`}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 group-hover:hidden" />}
        <UserMinus className="hidden h-4 w-4 group-hover:block" />
        <span className="group-hover:hidden">{tr("Dostsunuz")}</span>
        <span className="hidden group-hover:inline">{tr("Dostluqdan çıxar")}</span>
      </button>
    );
  if (status === "outgoing")
    return (
      <button type="button" disabled={busy} onClick={() => void run("remove")} className={`${BTN} border border-line/20 text-muted hover:text-ink`}>
        <Clock className="h-4 w-4" />
        {tr("İstək göndərildi · ləğv et")}
      </button>
    );
  return (
    <button type="button" disabled={busy} onClick={() => void run("add")} className={`${BTN} bg-accent-lo text-white hover:bg-accent`}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      {status === "incoming" ? tr("İstəyi qəbul et") : tr("Dost əlavə et")}
    </button>
  );
}

/** Public player profile: avatar, team, totals, duel Elo, recent duel form and friend button. */
export default function ProfileCard({ username }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setProfile(null);
    setError(false);
    api
      .get(`/players/${encodeURIComponent(username)}`)
      .then((data) => alive && setProfile(data))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [username]);

  if (error)
    return <p className={`py-10 text-center ${FONT} text-sm text-muted`}>{tr("Oyunçu tapılmadı.")}</p>;
  if (!profile)
    return (
      <div className="grid place-items-center py-14">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );

  const since = new Date(profile.memberSince).toLocaleDateString(getLang(), { year: "numeric", month: "long" });
  const letter = (profile.displayName || profile.username || "?").slice(0, 1).toUpperCase();

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="relative shrink-0">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-18 w-18 rounded-full object-cover ring-2 ring-line/15" />
          ) : (
            <span className={`grid h-18 w-18 place-items-center rounded-full bg-accent-lo ${FONT} text-3xl font-black text-white`}>
              {letter}
            </span>
          )}
          <span
            title={profile.online ? tr("Onlayn") : tr("Oflayn")}
            className={`absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full ring-3 ring-surface ${profile.online ? "bg-good" : "bg-line/30"}`}
          />
        </span>
        <div className="min-w-0">
          <p className={`truncate ${FONT} text-2xl font-black uppercase leading-tight text-ink`}>{profile.displayName}</p>
          <p className={`truncate ${FONT} text-sm text-muted`}>@{profile.username}</p>
          <p className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 ${FONT} text-xs text-muted`}>
            {profile.team ? (
              <span className="inline-flex items-center gap-1.5">
                {profile.team.logoUrl ? <img src={profile.team.logoUrl} alt="" className="h-4 w-4 object-contain" /> : <Shield className="h-3.5 w-3.5" />}
                {profile.team.name}
              </span>
            ) : null}
            <span>{tr("Üzv: {date}", { date: since })}</span>
            <span>{tr("{n} dost", { n: profile.friendCount })}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label={tr("Xal")} value={profile.totals.points} tone="text-gold-hi" />
        <Stat label={tr("Oyun")} value={profile.totals.games} />
        <Stat label={tr("Qələbə %")} value={`${profile.totals.winRate}`} />
      </div>

      {profile.duel ? (
        <div className="mt-3 rounded-[14px] border border-line/10 bg-line/3 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className={`inline-flex items-center gap-2 ${FONT} text-sm font-bold uppercase tracking-[0.1em] text-ink`}>
              <Swords className="h-4 w-4 text-accent" />
              {tr("Duel reytinqi")}
            </p>
            <p className={`${DIGITS} text-2xl font-bold text-ink`}>
              {profile.duel.rating}
              {profile.duel.provisional ? <span className={`ml-1 ${FONT} text-xs text-faint`}>?</span> : null}
            </p>
          </div>
          <p className={`mt-1 ${FONT} text-xs text-muted`}>
            {tr("{w} qələbə · {l} məğlubiyyət · {d} heç-heçə · pik {p}", {
              w: profile.duel.wins,
              l: profile.duel.losses,
              d: profile.duel.draws,
              p: profile.duel.peak,
            })}
          </p>
          {profile.recent.length ? (
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className={`${FONT} text-[11px] font-bold uppercase tracking-[0.12em] text-faint`}>{tr("Forma")}</span>
              {profile.recent.map((match, i) => (
                <span
                  key={i}
                  title={gameName(match.gameId)}
                  className={`grid h-6 w-6 place-items-center rounded-md ${FONT} text-xs font-black ${RESULT_TONE[match.result]}`}
                >
                  {RESULT_LETTER[match.result]()}
                </span>
              ))}
            </div>
          ) : null}
          {profile.ratings.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {profile.ratings.slice(0, 6).map((row) => (
                <li key={row.gameId} className={`rounded-full border border-line/12 px-2.5 py-1 ${FONT} text-xs text-muted`}>
                  {gameName(row.gameId)} <span className="font-bold text-ink">{row.rating}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {profile.favoriteGame ? (
        <p className={`mt-3 inline-flex items-center gap-1.5 ${FONT} text-xs text-muted`}>
          <Trophy className="h-3.5 w-3.5 text-gold" />
          {tr("Sevimli oyun: {game}", { game: gameName(profile.favoriteGame) })}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <FriendButton profile={profile} onChange={(friendStatus) => setProfile((p) => ({ ...p, friendStatus }))} />
      </div>
    </div>
  );
}
