import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LogOut, Trash2, UserRound } from "lucide-react";
import { api } from "../lib/api";
import { initialsOf, useAuth } from "../lib/auth";
import { tr } from "../i18n";

const inputClass =
  "w-full rounded-lg border border-line/20 bg-surface px-3 py-2.5 font-['Roboto',sans-serif] text-sm text-ink outline-none transition-colors focus:border-accent";
const primaryClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-['Roboto_Condensed',sans-serif] text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const secondaryClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line/20 px-4 py-2.5 font-['Roboto_Condensed',sans-serif] text-sm font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent";

function LoginForm({ onDone }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <input
        className={inputClass}
        type="email"
        autoComplete="email"
        placeholder={tr("E-poçt")}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <input
        className={inputClass}
        type="password"
        autoComplete="current-password"
        placeholder={tr("Şifrə")}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error ? <p className="text-sm text-bad-hi">{error}</p> : null}
      <button className={primaryClass} type="submit" disabled={busy}>
        {busy ? tr("Gözləyin...") : tr("Daxil ol")}
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
  const [ageConfirmed, setAgeConfirmed] = useState(false);
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
      await register({ ...form, ageConfirmed });
      setMessage(tr("Qeydiyyat tamamlandı. E-poçtunuzu təsdiqləyin."));
      onDone?.();
    } catch (err) {
      setError(err.message || tr("Qeydiyyat alınmadı."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <input
        className={inputClass}
        type="email"
        autoComplete="email"
        placeholder={tr("E-poçt")}
        value={form.email}
        onChange={update("email")}
        required
      />
      <input
        className={inputClass}
        autoComplete="username"
        placeholder={tr("İstifadəçi adı (3-20)")}
        value={form.username}
        onChange={update("username")}
        pattern="[A-Za-z0-9_]{3,20}"
        required
      />
      <input
        className={inputClass}
        autoComplete="nickname"
        placeholder={tr("Görünən ad (istəyə bağlı)")}
        value={form.displayName}
        onChange={update("displayName")}
      />
      <input
        className={inputClass}
        type="password"
        autoComplete="new-password"
        placeholder={tr("Şifrə (ən azı 8 simvol)")}
        value={form.password}
        onChange={update("password")}
        minLength={8}
        required
      />
      <label className="flex items-start gap-2 text-sm text-muted">
        <input
          type="checkbox"
          className="mt-1 accent-[var(--fg-accent)]"
          checked={ageConfirmed}
          onChange={(event) => setAgeConfirmed(event.target.checked)}
          required
        />
        <span>{tr("16 yaşımın olduğunu təsdiqləyirəm.")}</span>
      </label>
      {error ? <p className="text-sm text-bad-hi">{error}</p> : null}
      {message ? <p className="text-sm text-good-hi">{message}</p> : null}
      <button className={primaryClass} type="submit" disabled={busy}>
        {busy ? tr("Gözləyin...") : tr("Qeydiyyatdan keç")}
      </button>
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
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <input
        className={inputClass}
        type="password"
        autoComplete="new-password"
        placeholder={tr("Yeni şifrə")}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={8}
        required
      />
      {error ? <p className="text-sm text-bad-hi">{error}</p> : null}
      {message ? <p className="text-sm text-good-hi">{message}</p> : null}
      <button className={primaryClass} type="submit">
        {tr("Şifrəni yenilə")}
      </button>
    </form>
  );
}

function Profile({ user }) {
  const { logout } = useAuth();
  const stats = user.stats ?? [];
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        <span className="grid h-14 w-14 place-items-center rounded-full bg-accent font-['Roboto_Condensed',sans-serif] text-xl font-bold text-white">
          {initialsOf(user)}
        </span>
        <div>
          <h1 className="font-['Roboto_Condensed',sans-serif] text-2xl font-bold uppercase text-ink">
            {user.displayName || user.username}
          </h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <section className="rounded-xl border border-line/15 bg-surface p-4">
        <h2 className="font-['Roboto_Condensed',sans-serif] text-lg font-bold uppercase text-ink">
          {tr("Statistika")}
        </h2>
        {stats.length ? (
          <ul className="mt-3 divide-y divide-line/10">
            {stats.map((row) => (
              <li key={row.gameId} className="flex items-center justify-between py-2 text-sm">
                <span className="font-semibold text-ink">{row.gameId}</span>
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
  const [params] = useSearchParams();
  const [notice, setNotice] = useState("");

  const token = params.get("verify");
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

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-line/15 bg-page/95 p-5 shadow-[0_20px_60px_-30px_var(--fg-shadow)] md:p-8">
        <div className="mb-5 flex items-center gap-2">
          <UserRound className="h-6 w-6 text-accent" />
          <h1 className="font-['Roboto_Condensed',sans-serif] text-2xl font-bold uppercase tracking-wide text-ink">
            {tr("Hesab")}
          </h1>
        </div>

        {notice ? <p className="mb-4 rounded-lg bg-good-lo/10 p-3 text-sm text-good-hi">{notice}</p> : null}

        {loading ? (
          <p className="text-sm text-muted">{tr("Yüklənir...")}</p>
        ) : showReset ? (
          <ResetForm />
        ) : user ? (
          <Profile user={user} />
        ) : (
          <>
            {showTabs ? (
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  className={mode === "login" ? primaryClass : secondaryClass}
                  onClick={() => setMode("login")}
                >
                  {tr("Daxil ol")}
                </button>
                <button
                  type="button"
                  className={mode === "register" ? primaryClass : secondaryClass}
                  onClick={() => setMode("register")}
                >
                  {tr("Qeydiyyat")}
                </button>
              </div>
            ) : null}
            {mode === "register" ? <RegisterForm onDone={() => void refresh()} /> : <LoginForm onDone={() => void refresh()} />}
            <p className="mt-4 text-xs text-faint">
              {tr("Qonaq kimi oynamaq üçün hesab lazım deyil.")}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
