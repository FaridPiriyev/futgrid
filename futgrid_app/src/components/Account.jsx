import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  AtSign,
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Mail,
  Trash2,
  Trophy,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { API_URL, api } from "../lib/api";
import { initialsOf, useAuth } from "../lib/auth";
import { tr } from "../i18n";
import { gameName } from "../lib/games/names";
import GameHistory from "./account/GameHistory";
import heroPhoto from "../assets/slider2.webp";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";

const inputClass = `h-12 w-full rounded-[10px] border border-line/15 bg-line/4 px-3.5 ${BODY} text-[15px] text-ink outline-none transition-[border-color,background-color,box-shadow] placeholder:text-faint focus:border-accent focus:bg-line/6 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--fg-accent)_22%,transparent)]`;
const primaryClass = `inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-accent-lo px-5 ${FONT} text-[15px] font-bold uppercase tracking-[0.08em] text-white transition-[background-color,translate] duration-200 hover:-translate-y-0.5 hover:bg-accent disabled:translate-y-0 disabled:opacity-50`;
const secondaryClass = `inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-line/20 px-4 ${FONT} text-sm font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent`;
const linkClass = `${FONT} text-sm font-bold text-accent transition-colors hover:text-accent-hi`;

function Field({ label, icon: Icon, children, aside }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-3">
        <span className={`${FONT} text-xs font-bold uppercase tracking-[0.14em] text-muted`}>{label}</span>
        {aside}
      </span>
      <span className="relative block">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-faint" />
        ) : null}
        {children}
      </span>
    </label>
  );
}

function TextInput({ icon, ...props }) {
  return <input className={`${inputClass} ${icon ? "pl-11" : ""}`} {...props} />;
}

function PasswordInput({ withIcon = true, className = "", ...props }) {
  const [show, setShow] = useState(false);
  return (
    <span className={`relative block ${className}`}>
      {withIcon ? (
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-faint" />
      ) : null}
      <input
        className={`${inputClass} pr-12 ${withIcon ? "pl-11" : ""}`}
        type={show ? "text" : "password"}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? tr("Şifrəni gizlət") : tr("Şifrəni göstər")}
        aria-pressed={show}
        className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-line/8 hover:text-ink"
      >
        {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </span>
  );
}

function Notice({ tone = "good", children }) {
  if (!children) return null;
  return (
    <p
      className={`rounded-[10px] border px-3.5 py-2.5 ${BODY} text-sm ${
        tone === "bad" ? "border-bad/40 bg-bad/10 text-bad-hi" : "border-good/40 bg-good/10 text-good-hi"
      }`}
    >
      {children}
    </p>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function GoogleButton() {
  return (
    <>
      <a
        href={`${API_URL}/auth/google`}
        className={`flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-line/15 bg-white px-5 ${BODY} text-[15px] font-medium text-[#1f1f1f] shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-line/30 hover:shadow-[0_6px_16px_-8px_rgba(0,0,0,0.25)]`}
      >
        <GoogleLogo />
        {tr("Google ilə davam et")}
      </a>
      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line/12" />
        <span className={`${FONT} text-xs font-bold uppercase tracking-[0.16em] text-faint`}>{tr("və ya")}</span>
        <span className="h-px flex-1 bg-line/12" />
      </div>
    </>
  );
}

const OAUTH_ERRORS = {
  get cancelled() {
    return tr("Google ilə giriş ləğv edildi.");
  },
  get blocked() {
    return tr("Bu hesab bloklanıb.");
  },
  get deleted() {
    return tr("Bu hesab silinib.");
  },
  get unverified() {
    return tr("Google hesabının e-poçtu təsdiqlənməyib.");
  },
  get not_configured() {
    return tr("Google ilə giriş hələ aktiv deyil.");
  },
};

function LoginForm({ onDone }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [notice, setNotice] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      onDone?.();
    } catch (err) {
      setError(err.message || tr("Giriş alınmadı."));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (forgot) return;
    setError("");
    setNotice("");
    if (!email) return setError(tr("Əvvəlcə e-poçtu yaz."));
    setForgot(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setNotice(tr("Əgər bu e-poçt qeydiyyatdadırsa, link göndərildi."));
    } catch (err) {
      setError(err.message || tr("Sorğu alınmadı."));
    } finally {
      setForgot(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field label={tr("E-poçt")} icon={Mail}>
        <TextInput
          icon
          type="email"
          autoComplete="email"
          placeholder="ad@mail.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field
        label={tr("Şifrə")}
        aside={
          <button type="button" className={`${linkClass} text-xs`} onClick={() => void forgotPassword()}>
            {forgot ? tr("Göndərilir...") : tr("Şifrəni unutdum?")}
          </button>
        }
      >
        <PasswordInput
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      <Notice tone="bad">{error}</Notice>
      <Notice>{notice}</Notice>
      <button className={`${primaryClass} mt-1 w-full`} type="submit" disabled={busy}>
        {busy ? tr("Gözləyin...") : tr("Daxil ol")}
        {!busy && <ArrowRight className="h-4.5 w-4.5" strokeWidth={2.4} />}
      </button>
    </form>
  );
}

function RegisterForm({ onDone }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    locale: "az",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await register(form);
      setMessage(tr("Qeydiyyat tamamlandı. E-poçtunuzu təsdiqləyin."));
      onDone?.();
    } catch (err) {
      setError(err.message || tr("Qeydiyyat alınmadı."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field label={tr("E-poçt")} icon={Mail}>
        <TextInput
          icon
          type="email"
          autoComplete="email"
          placeholder="ad@mail.com"
          value={form.email}
          onChange={update("email")}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("İstifadəçi adı")} icon={AtSign}>
          <TextInput
            icon
            autoComplete="username"
            placeholder={tr("3-20 simvol")}
            value={form.username}
            onChange={update("username")}
            pattern="[A-Za-z0-9_]{3,20}"
            title={tr("3-20 simvol: hərf, rəqəm və _")}
            required
          />
        </Field>
        <Field label={tr("Görünən ad")} icon={UserRound}>
          <TextInput
            icon
            autoComplete="nickname"
            placeholder={tr("İstəyə bağlı")}
            value={form.displayName}
            onChange={update("displayName")}
          />
        </Field>
      </div>
      <Field label={tr("Şifrə")}>
        <PasswordInput
          autoComplete="new-password"
          placeholder={tr("Ən azı 8 simvol")}
          value={form.password}
          onChange={update("password")}
          minLength={8}
          required
        />
      </Field>
      <Notice tone="bad">{error}</Notice>
      <Notice>{message}</Notice>
      <button className={`${primaryClass} mt-1 w-full`} type="submit" disabled={busy}>
        {busy ? tr("Gözləyin...") : tr("Qeydiyyatdan keç")}
        {!busy && <ArrowRight className="h-4.5 w-4.5" strokeWidth={2.4} />}
      </button>
      <p className={`${BODY} text-xs leading-relaxed text-faint`}>
        {tr("Qeydiyyatdan keçməklə")}{" "}
        <Link to="/istifade-sertleri" className="text-muted underline underline-offset-2 hover:text-ink">
          {tr("İstifadə şərtlərini")}
        </Link>{" "}
        {tr("və")}{" "}
        <Link to="/mexfilik-siyaseti" className="text-muted underline underline-offset-2 hover:text-ink">
          {tr("Məxfilik siyasətini")}
        </Link>{" "}
        {tr("qəbul edirsən.")}
      </p>
    </form>
  );
}

function ResetForm() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = params.get("reset");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setMessage(tr("Şifrə yeniləndi. İndi daxil ola bilərsiniz."));
    } catch (err) {
      setError(err.message || tr("Şifrə yenilənmədi."));
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field label={tr("Yeni şifrə")}>
        <PasswordInput
          autoComplete="new-password"
          placeholder={tr("Ən azı 8 simvol")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </Field>
      <Notice tone="bad">{error}</Notice>
      <Notice>{message}</Notice>
      <button className={`${primaryClass} w-full`} type="submit">
        {tr("Şifrəni yenilə")}
      </button>
    </form>
  );
}

function Profile({ user }) {
  const { logout, refresh } = useAuth();
  const stats = user.stats ?? [];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [username, setUsername] = useState(user.username ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);

  const saveUsername = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    try {
      await api.patch("/me/username", { username });
      await refresh();
      setProfileMessage(tr("İstifadəçi adı yeniləndi."));
    } catch (error) {
      setProfileError(error.message || tr("İstifadəçi adı yenilənmədi."));
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    try {
      await api.post("/me/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setProfileMessage(tr("Şifrə yeniləndi."));
    } catch (error) {
      setProfileError(error.message || tr("Şifrə yenilənmədi."));
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      await api.upload("/me/avatar", form);
      await refresh();
      setProfileMessage(tr("Profil şəkli yeniləndi."));
    } catch (error) {
      setProfileError(error.message || tr("Şəkil yüklənmədi."));
    } finally {
      setAvatarBusy(false);
      event.target.value = "";
    }
  };

  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await api.delete("/me");
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-accent/50" />
        ) : (
          <span className={`grid h-16 w-16 place-items-center rounded-full bg-accent-lo ${FONT} text-xl font-bold text-white ring-2 ring-accent/50`}>
            {initialsOf(user)}
          </span>
        )}
        <div>
          <h1 className={`${FONT} text-2xl font-bold uppercase text-ink md:text-3xl`}>
            {user.displayName || user.username}
          </h1>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="text-xs text-faint">@{user.username}</p>
        </div>
      </div>

      <section className="rounded-[14px] border border-line/10 bg-line/3 p-4 md:p-5">
        <h2 className="font-['Roboto_Condensed',sans-serif] text-lg font-bold uppercase text-ink">
          {tr("Profil")}
        </h2>
        <label className={`${secondaryClass} mt-3 cursor-pointer`}>
          <Upload className="h-4 w-4" />
          {avatarBusy ? tr("Yüklənir...") : tr("Profil şəklini dəyiş")}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAvatar} disabled={avatarBusy} />
        </label>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={saveUsername}>
          <input className={`${inputClass} flex-1`} value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" required />
          <button className={secondaryClass} type="submit">{tr("İstifadəçi adını dəyiş")}</button>
        </form>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={savePassword}>
          <PasswordInput className="flex-1" withIcon={false} autoComplete="current-password" placeholder={tr("Cari şifrə")} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          <PasswordInput className="flex-1" withIcon={false} autoComplete="new-password" placeholder={tr("Yeni şifrə")} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
          <button className={secondaryClass} type="submit">{tr("Şifrəni dəyiş")}</button>
        </form>
        {profileError ? <p className="mt-2 text-sm text-bad-hi">{profileError}</p> : null}
        {profileMessage ? <p className="mt-2 text-sm text-good-hi">{profileMessage}</p> : null}
      </section>

      <section className="rounded-[14px] border border-line/10 bg-line/3 p-4 md:p-5">
        <h2 className="font-['Roboto_Condensed',sans-serif] text-lg font-bold uppercase text-ink">
          {tr("Statistika")}
        </h2>
        {stats.length ? (
          <ul className="mt-3 divide-y divide-line/10">
            {stats.map((row) => (
              <li key={row.gameId} className="flex items-center justify-between py-2 text-sm">
                <span className="font-semibold text-ink">{gameName(row.gameId)}</span>
                <span className="text-muted">
                  {tr("Rekord")}: {row.bestScore} · {tr("Oyun")}: {row.played} · {tr("Xal")}:{" "}
                  {row.totalPoints}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{tr("Hələ oyun nəticəsi yoxdur.")}</p>
        )}
      </section>

      <GameHistory />

      <div className="flex flex-wrap gap-2">
        {user.role === "admin" ? (
          <Link className={secondaryClass} to="/admin">
            {tr("Admin panel")}
          </Link>
        ) : null}
        <button className={secondaryClass} type="button" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          {tr("Çıxış")}
        </button>
        <button
          className={`${secondaryClass} ${confirmDelete ? "border-bad text-bad-hi" : ""}`}
          type="button"
          onClick={() => void remove()}
        >
          <Trash2 className="h-4 w-4" />
          {confirmDelete ? tr("Silməni təsdiqlə") : tr("Hesabı sil")}
        </button>
      </div>
      <p className="text-xs text-faint">
        {tr("Hesab silinəndə reytinqdə \"Deleted user\" kimi qalır.")}
      </p>
    </div>
  );
}

export default function Account() {
  const { user, loading, refresh } = useAuth();
  const [mode, setMode] = useState("login");
  const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState("");

  const token = params.get("verify");
  const oauth = params.get("oauth");
  const oauthReason = params.get("reason");
  const reset = params.get("reset");
  const showReset = Boolean(reset);
  const showTabs = useMemo(() => !user && !showReset, [user, showReset]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .post("/auth/verify-email", { token })
      .then(() => active && setNotice(tr("E-poçt təsdiqləndi. İndi daxil ola bilərsiniz.")))
      .catch((error) => active && setNotice(error.message));
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!oauth) return;
    if (oauth === "ok") void refresh();
    else setNotice(OAUTH_ERRORS[oauthReason] ?? tr("Google ilə giriş alınmadı. Yenidən cəhd et."));
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("oauth");
        next.delete("reason");
        return next;
      },
      { replace: true },
    );
  }, [oauth, oauthReason, refresh, setParams]);

  const perks = [
    { Icon: Trophy, text: tr("Hər oyunda xal topla, reytinqə düş") },
    { Icon: BarChart3, text: tr("Rekordlarını və statistikanı izlə") },
    { Icon: Users, text: tr("Dostlarınla onlayn duel oyna") },
  ];

  return (
    <main className="relative w-full overflow-hidden bg-page px-4 pb-20 pt-8 md:px-6 md:pt-16 lg:pt-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--fg-accent)_16%,transparent),transparent)]"
      />
      <div className="relative mx-auto grid w-full max-w-275 overflow-hidden rounded-[22px] border border-line/10 bg-surface shadow-[0_40px_80px_-50px_var(--fg-shadow)] lg:grid-cols-[1fr_1.05fr]">
        <aside className="relative isolate overflow-hidden bg-navy text-white">
          <img
            src={heroPhoto}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgba(8,14,40,.55)_0%,rgba(8,14,40,.92)_70%),repeating-linear-gradient(90deg,rgba(255,255,255,.03)_0_80px,transparent_80px_160px)]"
          />
          <div className="flex h-full flex-col p-6 sm:p-8 lg:p-11">
            <p className={`inline-flex items-center gap-2 ${FONT} text-xs font-bold uppercase tracking-[0.18em] text-yellow`}>
              <span className="h-px w-6 bg-yellow" />
              {tr("FutGrid hesabı")}
            </p>
            <h2 className={`mt-3 ${FONT} text-[30px] font-extrabold uppercase leading-[0.95] sm:text-[40px] lg:text-[48px]`}>
              {tr("Xal topla,")}
              <br />
              <span className="text-yellow">{tr("reytinqə qalx")}</span>
            </h2>
            <ul className="mt-6 hidden flex-col gap-3.5 p-0 sm:flex lg:mt-9">
              {perks.map(({ Icon, text }) => (
                <li key={text} className="flex list-none items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/8">
                    <Icon className="h-4.5 w-4.5 text-yellow" />
                  </span>
                  <span className={`${BODY} text-[15px] text-[#dbe4ff]`}>{text}</span>
                </li>
              ))}
            </ul>
            <p className={`mt-6 ${BODY} text-sm text-[#b8c4e6] lg:mt-auto lg:pt-10`}>
              {tr("Qonaq kimi oynamaq üçün hesab lazım deyil.")}{" "}
              <Link to="/oyunlar" className="font-semibold text-white underline-offset-2 hover:underline">
                {tr("Oyunlara bax")} →
              </Link>
            </p>
          </div>
        </aside>

        <section className="p-6 sm:p-8 lg:p-11">
          {notice ? (
            <div className="mb-5">
              <Notice>{notice}</Notice>
            </div>
          ) : null}

          {loading ? (
            <p className={`${BODY} text-sm text-muted`}>{tr("Yüklənir...")}</p>
          ) : showReset ? (
            <>
              <h1 className={`${FONT} text-3xl font-extrabold uppercase text-ink`}>{tr("Yeni şifrə")}</h1>
              <p className={`mb-6 mt-1.5 ${BODY} text-sm text-muted`}>{tr("Hesabın üçün yeni şifrə təyin et.")}</p>
              <ResetForm />
            </>
          ) : user ? (
            <Profile user={user} />
          ) : (
            <>
              {showTabs ? (
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-line/10 bg-line/4 p-1" role="tablist">
                  {[
                    ["login", tr("Daxil ol")],
                    ["register", tr("Qeydiyyat")],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={mode === key}
                      onClick={() => setMode(key)}
                      className={`h-10 rounded-lg ${FONT} text-sm font-bold uppercase tracking-[0.08em] transition-colors ${
                        mode === key ? "bg-accent-lo text-white shadow-[0_8px_20px_-10px_var(--fg-accent)]" : "text-muted hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
              <h1 className={`mt-7 ${FONT} text-3xl font-extrabold uppercase text-ink md:text-[34px]`}>
                {mode === "register" ? tr("Hesab yarat") : tr("Xoş gəldin!")}
              </h1>
              <p className={`mb-6 mt-1.5 ${BODY} text-sm text-muted`}>
                {mode === "register"
                  ? tr("Bir dəqiqəlik iş — sonra hər oyun xal gətirir.")
                  : tr("Hesabına daxil ol və qaldığın yerdən davam et.")}
              </p>
              <GoogleButton />
              {mode === "register" ? (
                <RegisterForm onDone={() => void refresh()} />
              ) : (
                <LoginForm onDone={() => void refresh()} />
              )}
              <p className={`mt-6 border-t border-line/8 pt-5 text-center ${BODY} text-sm text-muted`}>
                {mode === "register" ? tr("Artıq hesabın var?") : tr("Hesabın yoxdur?")}{" "}
                <button
                  type="button"
                  className={linkClass}
                  onClick={() => setMode(mode === "register" ? "login" : "register")}
                >
                  {mode === "register" ? tr("Daxil ol") : tr("Qeydiyyatdan keç")}
                </button>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
