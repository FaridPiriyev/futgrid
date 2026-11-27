import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2, Shield, Swords, Trophy, UserMinus, UserPlus } from "lucide-react";
import { fetchProfile } from "../../lib/useProfile";
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

function RatingRow({ gameId, rating, games }) {
  const diff = rating - 1000;
  const width = Math.min(100, Math.abs(diff) / 2);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2">
      <span className={`truncate ${FONT} text-sm font-bold text-ink`}>{gameName(gameId)}</span>
      <span className={`${DIGITS} text-base font-bold text-ink`}>
        {rating}
        <span className={`ml-1.5 ${FONT} text-xs font-bold ${diff > 0 ? "text-good-hi" : diff < 0 ? "text-bad-hi" : "text-faint"}`}>
          {diff > 0 ? "+" : ""}
          {diff}
        </span>
      </span>
      <span className="col-span-2 flex h-1.5 overflow-hidden rounded-full bg-line/8">
        <span className="w-1/2 flex justify-end">
          {diff < 0 ? <span className="h-full rounded-l-full bg-bad/70" style={{ width: `${width}%` }} /> : null}
        </span>
        <span className="w-px bg-line/30" />
        <span className="w-1/2">
          {diff > 0 ? <span className="block h-full rounded-r-full bg-good" style={{ width: `${width}%` }} /> : null}
        </span>
      </span>
      <span className={`col-span-2 -mt-0.5 ${FONT} text-[11px] text-faint`}>{tr("{n} oyun", { n: games })}</span>
    </li>
  );
}

/** Public player profile: header, rating tiles, recent form, per-game ratings and friend button. */
export default function ProfileCard({ username }) {
  const [state, setState] = useState({ username: null, profile: null, error: false });

  useEffect(() => {
    let alive = true;
    fetchProfile(username, { fresh: true })
      .then((data) => alive && setState({ username, profile: data, error: false }))
      .catch(() => alive && setState({ username, profile: null, error: true }));
    return () => {
      alive = false;
    };
  }, [username]);

  const current = state.username === username ? state : { profile: null, error: false };
  const profile = current.profile;
  const setProfile = (update) => setState((prev) => ({ ...prev, profile: update(prev.profile) }));

  if (current.error)
    return <p className={`py-10 text-center ${FONT} text-sm text-muted`}>{tr("Oyunçu tapılmadı.")}</p>;
  if (!profile)
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );

  const since = new Date(profile.memberSince).toLocaleDateString(getLang(), { year: "numeric", month: "long" });
  const letter = (profile.displayName || profile.username || "?").slice(0, 1).toUpperCase();
  const overall = profile.duel?.rating ?? 1000;
  const ratings = [...profile.ratings].sort((a, b) => b.rating - a.rating);

  return (
    <div>
      {/* Header band */}
      <div className="relative -mx-5 -mt-5 overflow-hidden bg-navy px-5 pb-12 pt-6 text-white sm:-mx-6 sm:-mt-6 sm:px-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.035)_0_60px,transparent_60px_120px)]"
        />
        {profile.team?.logoUrl ? (
          <img src={profile.team.logoUrl} alt="" aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 object-contain opacity-15" />
        ) : null}
        <span
          className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${FONT} text-[11px] font-bold uppercase tracking-[0.14em] ${
            profile.online ? "bg-good/20 text-good-hi" : "bg-white/10 text-navy-soft"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${profile.online ? "bg-good" : "bg-white/40"}`} />
          {profile.online ? tr("Onlayn") : tr("Oflayn")}
        </span>
      </div>

      <div className="relative -mt-10 flex items-end gap-4">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-surface" />
        ) : (
          <span className={`grid h-24 w-24 shrink-0 place-items-center rounded-full bg-accent-lo ring-4 ring-surface ${FONT} text-4xl font-black text-white`}>
            {letter}
          </span>
        )}
        <div className="min-w-0 pb-1">
          <p className={`truncate ${FONT} text-2xl font-black uppercase leading-tight text-ink`}>{profile.displayName}</p>
          <p className={`truncate ${FONT} text-sm text-muted`}>@{profile.username}</p>
        </div>
      </div>

      <p className={`mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 ${FONT} text-xs text-muted`}>
        {profile.team ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-ink">
            {profile.team.logoUrl ? <img src={profile.team.logoUrl} alt="" className="h-4 w-4 object-contain" /> : <Shield className="h-3.5 w-3.5" />}
            {profile.team.name}
          </span>
        ) : null}
        <span>{tr("Üzv: {date}", { date: since })}</span>
        <span>{tr("{n} dost", { n: profile.friendCount })}</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={tr("Ümumi reytinq")} value={overall} tone="text-accent" />
        <Stat label={tr("Ən yüksək")} value={profile.duel?.peak ?? overall} tone="text-gold-hi" />
        <Stat label={tr("Oyun")} value={profile.duel?.games ?? profile.totals.games} />
        <Stat
          label={tr("Qələbə %")}
          value={profile.duel?.games ? Math.round((profile.duel.wins / profile.duel.games) * 100) : profile.totals.winRate}
        />
      </div>

      {profile.duel ? (
        <p className={`mt-2 text-center ${FONT} text-xs text-muted`}>
          {tr("{w} qələbə · {l} məğlubiyyət · {d} heç-heçə · pik {p}", {
            w: profile.duel.wins,
            l: profile.duel.losses,
            d: profile.duel.draws,
            p: profile.duel.peak,
          })}
        </p>
      ) : null}

      {profile.recent.length ? (
        <div className="mt-4 flex items-center gap-2">
          <span className={`${FONT} text-[11px] font-bold uppercase tracking-[0.14em] text-faint`}>{tr("Son duellər")}</span>
          <span className="flex gap-1.5">
            {profile.recent.map((match, i) => (
              <span
                key={i}
                title={gameName(match.gameId)}
                className={`grid h-7 w-7 place-items-center rounded-lg ${FONT} text-xs font-black ${RESULT_TONE[match.result]}`}
              >
                {RESULT_LETTER[match.result]()}
              </span>
            ))}
          </span>
        </div>
      ) : null}

      {ratings.length ? (
        <div className="mt-4 rounded-[14px] border border-line/10 bg-line/3 px-3.5 py-2">
          <p className={`inline-flex items-center gap-2 pt-1 ${FONT} text-xs font-bold uppercase tracking-[0.14em] text-muted`}>
            <Swords className="h-3.5 w-3.5 text-accent" />
            {tr("Oyunlar üzrə reytinq")}
          </p>
          <ul className="divide-y divide-line/8">
            {ratings.slice(0, 8).map((row) => (
              <RatingRow key={row.gameId} {...row} />
            ))}
          </ul>
        </div>
      ) : null}

      {profile.favoriteGame ? (
        <p className={`mt-3 inline-flex items-center gap-1.5 ${FONT} text-xs text-muted`}>
          <Trophy className="h-3.5 w-3.5 text-gold" />
          {tr("Sevimli oyun: {game}", { game: gameName(profile.favoriteGame) })}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 [&>*]:flex-1">
        <FriendButton
          profile={profile}
          onChange={(friendStatus) => setProfile((p) => ({ ...p, friendStatus }))}
        />
      </div>
    </div>
  );
}
