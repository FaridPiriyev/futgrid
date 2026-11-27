import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { Loader, Notice } from "./games/common/GameStatus";
import { useAuth } from "../lib/auth";
import { apiRequest } from "../lib/api";
import { gameName } from "../lib/games/names";
import { useSocial } from "../lib/social";
import { tr } from "../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";
const inputClass = `w-full rounded-lg border border-line/20 bg-surface px-3 py-2 ${BODY} text-sm text-ink outline-none focus:border-accent`;
const btn = `inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 ${FONT} text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50`;
const btnGhost = `inline-flex items-center justify-center gap-2 rounded-lg border border-line/20 px-3 py-2 ${FONT} text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50`;
const btnDanger = `inline-flex items-center justify-center gap-2 rounded-lg border border-bad/40 px-3 py-2 ${FONT} text-xs font-bold uppercase tracking-wide text-bad-hi transition-colors hover:bg-bad/10 disabled:opacity-50`;
const card = "rounded-xl border border-line/15 bg-surface p-4";
const badge = `inline-flex items-center rounded-full px-2 py-0.5 ${FONT} text-[11px] font-bold uppercase tracking-wide`;

const SESSION_KEY = "fg-admin-session";
const PAGE = 50;

// [key, label, moderator can see]
const TABS = [
  ["overview", () => tr("Ümumi"), true],
  ["users", () => tr("İstifadəçilər"), true],
  ["results", () => tr("Şübhəli nəticələr"), true],
  ["contact", () => tr("Mesajlar"), true],
  ["daily", () => tr("Günlük"), false],
  ["players", () => tr("Oyunçular"), false],
  ["releases", () => tr("Data"), false],
  ["games", () => tr("Oyunlar"), false],
  ["goat", () => tr("GOAT"), false],
  ["media", () => tr("Media"), false],
  ["audit", () => tr("Audit"), true],
];

const METRICS = [
  ["onlineNow", () => tr("İndi onlayn"), "text-good-hi"],
  ["newUsersToday", () => tr("Bu gün qeydiyyat"), "text-accent"],
  ["newUsersWeek", () => tr("7 gündə qeydiyyat"), "text-ink"],
  ["gamesToday", () => tr("Bu gün oyun"), "text-accent"],
  ["duelsToday", () => tr("Bu gün duel"), "text-accent"],
  ["duelsWeek", () => tr("7 gündə duel"), "text-ink"],
  ["users", () => tr("Cəmi istifadəçi"), "text-ink"],
  ["blocked", () => tr("Bloklanmış"), "text-bad-hi"],
  ["sessions", () => tr("Cəmi oyun"), "text-ink"],
  ["flagged", () => tr("Şübhəli nəticə"), "text-yellow"],
  ["contactNew", () => tr("Oxunmamış mesaj"), "text-yellow"],
  ["goatVotes", () => tr("GOAT səsləri"), "text-ink"],
  ["dataReleases", () => tr("Data buraxılışları"), "text-ink"],
];

const ROLE_LABEL = { user: () => tr("İstifadəçi"), moderator: () => tr("Moderator"), admin: () => tr("Admin") };

function errorText(err) {
  const rule = err?.details?.[0]?.rule ?? err?.body?.error?.details?.[0]?.rule;
  if (rule === "invalid_totp") return tr("Kod yanlışdır və ya artıq istifadə olunub. Authenticator-dakı yeni kodu yaz.");
  if (rule === "totp_not_enabled") return tr("Əvvəlcə TOTP qurmaq lazımdır.");
  if (rule === "admin_session_expired") return tr("Admin sessiyası bitdi. Yenidən kod daxil et.");
  if (err?.code === "RATE_LIMITED") return tr("Çox səhv cəhd oldu. 10 dəqiqə sonra yenidən yoxla.");
  if (err?.code === "CONFLICT") return err.message;
  if (err?.code === "FORBIDDEN") return tr("Bu əməliyyata icazən yoxdur.");
  return err?.message || tr("Xəta baş verdi.");
}

const when = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

function Gate({ onSession }) {
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const open = async (event) => {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (setup) await apiRequest("/admin/auth/verify", { method: "POST", body: JSON.stringify({ token: code }) });
      const res = await apiRequest("/admin/auth/session", { method: "POST", body: JSON.stringify({ token: code }) });
      onSession(res.session, res.expiresIn);
    } catch (err) {
      setError(errorText(err));
      if ((err?.details?.[0]?.rule ?? err?.body?.error?.details?.[0]?.rule) === "totp_not_enabled") void startSetup();
    } finally {
      setBusy(false);
      setCode("");
    }
  };

  const startSetup = async () => {
    try {
      const result = await apiRequest("/admin/auth/setup");
      setSetup(result);
    } catch (err) {
      if (err?.code !== "CONFLICT") setError(errorText(err));
    }
  };

  return (
    <section className={`${card} mx-auto mt-6 max-w-md`}>
      <p className={`inline-flex items-center gap-2 ${FONT} text-lg font-black uppercase text-ink`}>
        <KeyRound className="h-5 w-5 text-accent" />
        {setup ? tr("TOTP qur") : tr("Admin girişi")}
      </p>
      <p className={`mt-1 ${BODY} text-sm text-muted`}>
        {setup
          ? tr("Açarı Google Authenticator və ya Authy-yə əlavə et, sonra göstərdiyi 6 rəqəmi yaz.")
          : tr("Authenticator-dakı 6 rəqəmli kodu yaz. Bir kod 45 dəqiqəlik sessiya açır.")}
      </p>
      {setup ? (
        <div className="mt-3 break-all rounded-lg bg-page-2 p-3 font-mono text-xs text-ink">
          <p>
            {tr("Açar")}: <span className="font-bold">{setup.secret}</span>
          </p>
          <p className="mt-1 text-muted">{setup.otpauthUrl}</p>
        </div>
      ) : null}
      <form onSubmit={open} className="mt-4 flex gap-2">
        <input
          className={`${inputClass} max-w-40 text-center tracking-[0.3em]`}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
        />
        <button type="submit" className={btn} disabled={code.length !== 6 || busy}>
          <ShieldCheck className="h-4 w-4" />
          {setup ? tr("Təsdiqlə və daxil ol") : tr("Daxil ol")}
        </button>
      </form>
      {!setup ? (
        <button type="button" className={`mt-3 ${FONT} text-xs uppercase tracking-wide text-muted hover:text-ink`} onClick={() => void startSetup()}>
          {tr("TOTP hələ qurulmayıb?")}
        </button>
      ) : null}
      {error ? <p className={`mt-3 ${BODY} text-sm text-bad-hi`}>{error}</p> : null}
    </section>
  );
}

function UserDetail({ request, id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    request(`/admin/users/${id}/summary`)
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(errorText(err)));
    return () => {
      alive = false;
    };
  }, [id, request]);
  if (error) return <p className="text-sm text-bad-hi">{error}</p>;
  if (!data) return <p className="text-sm text-muted">{tr("Yüklənir...")}</p>;
  return (
    <div className={`grid gap-3 ${BODY} text-sm md:grid-cols-3`}>
      <div>
        <p className={`${FONT} text-xs font-bold uppercase tracking-wide text-muted`}>{tr("Hesab")}</p>
        <p className="mt-1 text-ink">{data.user.email}</p>
        <p className="text-muted">
          {tr("Qeydiyyat")}: {when(data.user.createdAt)}
        </p>
        <p className="text-muted">
          {tr("Email təsdiqi")}: {data.user.emailVerifiedAt ? "✓" : "✗"}
        </p>
        <p className="text-muted">
          {tr("Duel")}: {data.duels} · {tr("Dost")}: {data.friends}
        </p>
      </div>
      <div>
        <p className={`${FONT} text-xs font-bold uppercase tracking-wide text-muted`}>{tr("Reytinq")}</p>
        <ul className="mt-1 space-y-0.5">
          {data.ratings.length ? (
            data.ratings.map((r) => (
              <li key={r.gameId} className="flex justify-between gap-2">
                <span className="text-muted">{gameName(r.gameId)}</span>
                <span className="font-bold text-ink">
                  {r.rating} <span className="font-normal text-faint">· {r.games}</span>
                </span>
              </li>
            ))
          ) : (
            <li className="text-faint">—</li>
          )}
        </ul>
      </div>
      <div>
        <p className={`${FONT} text-xs font-bold uppercase tracking-wide text-muted`}>{tr("Son oyunlar")}</p>
        <ul className="mt-1 space-y-0.5">
          {data.sessions.length ? (
            data.sessions.slice(0, 8).map((s) => (
              <li key={s.id} className="flex justify-between gap-2">
                <span className="truncate text-muted">
                  {gameName(s.gameId)} · {s.difficulty}
                </span>
                <span className={s.flagged ? "font-bold text-yellow" : "text-ink"}>
                  {s.score != null ? Math.round(s.score * 100) + "%" : s.status}
                </span>
              </li>
            ))
          ) : (
            <li className="text-faint">—</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  const { openProfile } = useSocial();
  const [session, setSession] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [offset, setOffset] = useState(0);
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [open, setOpen] = useState(null);
  const [csv, setCsv] = useState("player_id,market_value_eur\n");
  const [mediaForm, setMediaForm] = useState({
    entityType: "player",
    entityId: "",
    kind: "portrait",
    sourceUrl: "",
    license: "",
    author: "",
  });

  const isAdmin = user?.role === "admin";
  const tabs = useMemo(() => TABS.filter(([, , mod]) => isAdmin || mod), [isAdmin]);

  const saveSession = useCallback((value) => {
    setSession(value);
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, value);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // private mode
    }
  }, []);

  const request = useCallback(
    async (path, options = {}) => {
      try {
        return await apiRequest(path, {
          ...options,
          headers: { ...(options.headers ?? {}), "X-Admin-Session": session },
        });
      } catch (err) {
        const rule = err?.details?.[0]?.rule ?? err?.body?.error?.details?.[0]?.rule;
        if (rule === "admin_session_expired" || rule === "invalid_totp") saveSession("");
        throw err;
      }
    },
    [session, saveSession],
  );

  const load = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      const q = query ? `&query=${encodeURIComponent(query)}` : "";
      const paths = {
        overview: "/admin/overview",
        users: `/admin/users?limit=${PAGE}&offset=${offset}&status=${status}${q}`,
        results: `/admin/results?limit=100${flaggedOnly ? "&flagged=true" : ""}`,
        contact: "/admin/contact-messages?limit=50",
        daily: "/admin/daily-puzzles?limit=30",
        players: `/admin/players?limit=50${q}`,
        releases: "/admin/data-releases",
        games: "/admin/games",
        goat: "/admin/goat/roster?size=128",
        audit: "/admin/audit-log?limit=50",
        media: "/admin/media?limit=50",
      };
      setData({ tab, ...(await request(paths[tab])) });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, [session, tab, query, offset, status, flaggedOnly, request]);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) void load();
  }, [user, load]);

  const action = async (path, options, success = tr("Hazırdır"), confirmText = null) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError("");
    setMessage("");
    try {
      await request(path, options);
      setMessage(success);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const logout = async () => {
    try {
      await request("/admin/auth/session", { method: "DELETE" });
    } catch {
      // already gone
    }
    saveSession("");
  };

  if (loading) return <Loader text={tr("Yüklənir...")} />;
  if (!user) return <Notice title={tr("Admin girişi")} text={tr("Əvvəlcə hesabınıza daxil olun.")} />;
  if (user.role !== "admin" && user.role !== "moderator") {
    return <Notice title={tr("İcazə yoxdur")} text={tr("Bu səhifə yalnız admin və moderatorlar üçündür.")} />;
  }

  const rows = data?.tab === tab ? (data.entries ?? []) : [];
  const current = data?.tab === tab ? data : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className={`${FONT} text-3xl font-black uppercase text-ink`}>{tr("Admin panel")}</h1>
          <span className={`${badge} ${isAdmin ? "bg-accent/15 text-accent" : "bg-yellow/20 text-ink"}`}>
            {ROLE_LABEL[user.role]?.() ?? user.role}
          </span>
        </div>
        <div className="flex gap-2">
          {session ? (
            <button type="button" className={btnGhost} onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              {tr("Sessiyanı bağla")}
            </button>
          ) : null}
          <Link to="/hesab" className={btnGhost}>
            {tr("Hesab")}
          </Link>
        </div>
      </div>

      {!session ? (
        <Gate onSession={(value) => saveSession(value)} />
      ) : (
        <>
          <nav className="mt-5 flex flex-wrap gap-2">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setOpen(null);
                  setMessage("");
                }}
                className={tab === key ? btn : btnGhost}
              >
                {label()}
              </button>
            ))}
            <button type="button" className={btnGhost} onClick={() => void load()} title={tr("Yenilə")}>
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            </button>
          </nav>

          {error ? <p className={`mt-4 rounded-lg bg-bad/10 px-3 py-2 ${BODY} text-sm text-bad-hi`}>{error}</p> : null}
          {message ? <p className={`mt-4 rounded-lg bg-good/10 px-3 py-2 ${BODY} text-sm text-good-hi`}>{message}</p> : null}

          {current && tab === "overview" ? (
            <>
              <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {METRICS.filter(([key]) => typeof current[key] === "number").map(([key, label, tone]) => (
                  <div key={key} className={card}>
                    <p className={`${FONT} text-xs font-bold uppercase tracking-wide text-muted`}>{label()}</p>
                    <p className={`mt-1 ${FONT} text-3xl font-black ${tone}`}>{current[key]}</p>
                  </div>
                ))}
              </section>
              {current.recentAudit?.length ? (
                <section className={`${card} mt-4`}>
                  <p className={`${FONT} text-xs font-bold uppercase tracking-wide text-muted`}>{tr("Son əməliyyatlar")}</p>
                  <ul className={`mt-2 space-y-1 ${BODY} text-sm`}>
                    {current.recentAudit.map((row) => (
                      <li key={row.id} className="text-muted">
                        <span className="font-bold text-ink">{row.action}</span> · {row.entity} · {when(row.createdAt)}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          ) : null}

          {current && (tab === "users" || tab === "players") ? (
            <section className="mt-4">
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setOffset(0);
                  setQuery(queryInput.trim());
                }}
              >
                <label className="relative min-w-60 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <input
                    className={`${inputClass} pl-9`}
                    value={queryInput}
                    onChange={(event) => setQueryInput(event.target.value)}
                    placeholder={tab === "users" ? tr("Email, istifadəçi adı və ya ad...") : tr("Oyunçu adı...")}
                  />
                </label>
                {tab === "users" ? (
                  <select
                    className={`${inputClass} w-auto`}
                    value={status}
                    onChange={(event) => {
                      setOffset(0);
                      setStatus(event.target.value);
                    }}
                  >
                    <option value="all">{tr("Hamısı")}</option>
                    <option value="blocked">{tr("Bloklanmış")}</option>
                    <option value="unverified">{tr("Email təsdiqsiz")}</option>
                    <option value="staff">{tr("Admin və moderatorlar")}</option>
                  </select>
                ) : null}
                <button type="submit" className={btn}>
                  {tr("Axtar")}
                </button>
              </form>

              {tab === "users" && typeof current.total === "number" ? (
                <div className={`mt-3 flex items-center justify-between ${BODY} text-sm text-muted`}>
                  <span>
                    {tr("{from}–{to} / {total}", {
                      from: current.total ? offset + 1 : 0,
                      to: Math.min(offset + PAGE, current.total),
                      total: current.total,
                    })}
                  </span>
                  <span className="flex gap-2">
                    <button type="button" className={btnGhost} disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE))}>
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={btnGhost}
                      disabled={offset + PAGE >= current.total}
                      onClick={() => setOffset((o) => o + PAGE)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              ) : null}

              <div className="mt-2 divide-y divide-line/10">
                {rows.map((row) => {
                  const self = row.id === user.id;
                  return (
                    <div key={row.id} className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className={`min-w-0 ${BODY} text-sm`}>
                          <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                            {tab === "users" && row.username ? (
                              <button type="button" className="hover:text-accent hover:underline" onClick={() => openProfile(row.username)}>
                                {row.displayName ?? row.username}
                              </button>
                            ) : (
                              row.displayName ?? row.name ?? row.username ?? row.id
                            )}
                            {row.username ? <span className="font-normal text-muted">@{row.username}</span> : null}
                            {row.role && row.role !== "user" ? (
                              <span className={`${badge} bg-accent/15 text-accent`}>{ROLE_LABEL[row.role]?.()}</span>
                            ) : null}
                            {row.blockedAt ? <span className={`${badge} bg-bad/15 text-bad-hi`}>{tr("Bloklanıb")}</span> : null}
                            {tab === "users" && !row.emailVerifiedAt ? (
                              <span className={`${badge} bg-line/10 text-muted`}>{tr("Təsdiqsiz")}</span>
                            ) : null}
                            {row.hidden ? <span className={`${badge} bg-line/10 text-muted`}>{tr("Gizli")}</span> : null}
                          </p>
                          <p className="truncate text-muted">
                            {row.email ?? row.position ?? ""}
                            {row.createdAt ? ` · ${when(row.createdAt)}` : ""}
                          </p>
                        </div>
                        {tab === "users" ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" className={btnGhost} onClick={() => setOpen(open === row.id ? null : row.id)}>
                              {open === row.id ? tr("Bağla") : tr("Detallar")}
                            </button>
                            {!self ? (
                              <button
                                type="button"
                                className={row.blockedAt ? btnGhost : btnDanger}
                                onClick={() =>
                                  action(
                                    `/admin/users/${row.id}/block`,
                                    { method: "PATCH", body: JSON.stringify({ blocked: !row.blockedAt }) },
                                    row.blockedAt ? tr("Blok götürüldü") : tr("Bloklandı"),
                                    row.blockedAt
                                      ? tr("@{u} blokdan çıxarılsın?", { u: row.username })
                                      : tr("@{u} bloklansın? Bütün cihazlardan çıxarılacaq və onlayn oyunu kəsiləcək.", { u: row.username }),
                                  )
                                }
                              >
                                <Ban className="h-4 w-4" />
                                {row.blockedAt ? tr("Blokdan çıxar") : tr("Blokla")}
                              </button>
                            ) : null}
                            {isAdmin && !self ? (
                              <select
                                className={`${inputClass} w-auto py-1.5 text-xs`}
                                value={row.role}
                                onChange={(event) => {
                                  const role = event.target.value;
                                  void action(
                                    `/admin/users/${row.id}/role`,
                                    { method: "PATCH", body: JSON.stringify({ role }) },
                                    tr("Rol dəyişdi"),
                                    tr("@{u} üçün rol: {role}. Təsdiqləyirsən?", { u: row.username, role: ROLE_LABEL[role]() }),
                                  );
                                }}
                              >
                                <option value="user">{ROLE_LABEL.user()}</option>
                                <option value="moderator">{ROLE_LABEL.moderator()}</option>
                                <option value="admin">{ROLE_LABEL.admin()}</option>
                              </select>
                            ) : null}
                            {isAdmin && !self ? (
                              <button
                                type="button"
                                className={btnGhost}
                                onClick={() =>
                                  action(
                                    `/admin/users/${row.id}/logout-all`,
                                    { method: "POST" },
                                    tr("Bütün cihazlardan çıxarıldı"),
                                    tr("@{u} bütün cihazlardan çıxarılsın?", { u: row.username }),
                                  )
                                }
                              >
                                {tr("Çıxart")}
                              </button>
                            ) : null}
                            {isAdmin ? (
                              <button
                                type="button"
                                className={btnDanger}
                                onClick={() =>
                                  action(
                                    `/admin/users/${row.id}/rating-reset`,
                                    { method: "POST" },
                                    tr("Reytinq 1000-ə qaytarıldı"),
                                    tr("@{u} üçün bütün reytinqlər 1000-ə qaytarılsın? Bunu geri qaytarmaq olmur.", { u: row.username }),
                                  )
                                }
                              >
                                {tr("Reytinqi sıfırla")}
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() =>
                              action(
                                `/admin/players/${row.id}`,
                                { method: "PATCH", body: JSON.stringify({ hidden: !row.hidden }) },
                                row.hidden ? tr("Göstərilir") : tr("Gizlədildi"),
                              )
                            }
                          >
                            {row.hidden ? tr("Göstər") : tr("Gizlət")}
                          </button>
                        )}
                      </div>
                      {open === row.id ? (
                        <div className={`${card} mt-2`}>
                          <UserDetail request={request} id={row.id} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!rows.length && !busy ? <p className={`py-6 text-center ${BODY} text-sm text-muted`}>{tr("Heç nə tapılmadı.")}</p> : null}
              </div>
            </section>
          ) : null}

          {current && tab === "results" ? (
            <section className="mt-4">
              <label className={`inline-flex items-center gap-2 ${BODY} text-sm text-muted`}>
                <input type="checkbox" checked={flaggedOnly} onChange={(event) => setFlaggedOnly(event.target.checked)} />
                {tr("Yalnız şübhəli (flagged) nəticələr")}
              </label>
              <div className="mt-3 overflow-x-auto">
                <table className={`w-full text-left ${BODY} text-sm`}>
                  <thead className={`${FONT} text-xs uppercase tracking-wide text-muted`}>
                    <tr className="border-b border-line/15">
                      <th className="py-2 pr-3">{tr("Oyunçu")}</th>
                      <th className="py-2 pr-3">{tr("Oyun")}</th>
                      <th className="py-2 pr-3">{tr("Nəticə")}</th>
                      <th className="py-2 pr-3">{tr("Tarix")}</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-line/10">
                        <td className="py-2 pr-3 text-ink">
                          {row.user?.username ? (
                            <button type="button" className="hover:text-accent hover:underline" onClick={() => openProfile(row.user.username)}>
                              @{row.user.username}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 pr-3 text-muted">
                          {gameName(row.gameId)} · {row.difficulty}
                        </td>
                        <td className="py-2 pr-3 text-ink">
                          {row.score != null ? `${Math.round(row.score * 100)}%` : "—"}
                          {row.flagged ? <span className={`${badge} ml-2 bg-yellow/20 text-ink`}>{tr("Şübhəli")}</span> : null}
                        </td>
                        <td className="py-2 pr-3 text-muted">{when(row.finishedAt ?? row.startedAt)}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() =>
                              action(
                                `/admin/results/${row.id}/revoke`,
                                { method: "POST" },
                                tr("Nəticə ləğv edildi, reytinq geri alındı"),
                                tr("Bu nəticə ləğv olunsun? Oyunçunun qazandığı reytinq xalı geri alınacaq."),
                              )
                            }
                          >
                            <Undo2 className="h-4 w-4" />
                            {tr("Ləğv et")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && !busy ? <p className={`py-6 text-center ${BODY} text-sm text-muted`}>{tr("Şübhəli nəticə yoxdur.")}</p> : null}
              </div>
            </section>
          ) : null}

          {current && tab === "contact" ? (
            <section className="mt-4 space-y-3">
              {rows.map((row) => (
                <div key={row.id} className={card}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={`${BODY} font-bold text-ink`}>
                      {row.name} · <a className="text-accent hover:underline" href={`mailto:${row.email}`}>{row.email}</a>
                      <span className="ml-2 font-normal text-muted">{when(row.createdAt)}</span>
                    </p>
                    {row.status === "new" ? (
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          action(`/admin/contact-messages/${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "read" }) }, tr("Oxundu kimi qeyd edildi"))
                        }
                      >
                        {tr("Oxundu")}
                      </button>
                    ) : (
                      <span className={`${badge} bg-line/10 text-muted`}>{tr("Oxunub")}</span>
                    )}
                  </div>
                  <p className={`mt-2 whitespace-pre-wrap ${BODY} text-sm text-muted`}>{row.message}</p>
                </div>
              ))}
              {!rows.length && !busy ? <p className={`py-6 text-center ${BODY} text-sm text-muted`}>{tr("Mesaj yoxdur.")}</p> : null}
            </section>
          ) : null}

          {current && tab === "daily" ? (
            <section className="mt-4 space-y-2">
              {rows.map((row) => (
                <div key={row.id} className={`${card} flex flex-wrap items-center justify-between gap-2`}>
                  <span className={`${BODY} text-sm text-ink`}>
                    {row.date} · {gameName(row.game)} · {row.difficulty}
                  </span>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() =>
                      action(
                        `/admin/daily-puzzles/${row.id}/regenerate`,
                        { method: "POST" },
                        tr("Yenidən yaradıldı"),
                        tr("{date} tarixli günlük oyun yenidən yaradılsın? Artıq oynayanların nəticəsi köhnə suala aid qalacaq.", { date: row.date }),
                      )
                    }
                  >
                    {tr("Yenidən yarat")}
                  </button>
                </div>
              ))}
            </section>
          ) : null}

          {current && tab === "releases" ? (
            <section className="mt-4 space-y-2">
              <button
                type="button"
                className={btn}
                onClick={() =>
                  action("/admin/data-releases/build", { method: "POST", timeoutMs: 180000 }, tr("Build hazırdır"), tr("Yeni data build başlasın? 1–3 dəqiqə çəkə bilər."))
                }
              >
                {tr("Yeni build")}
              </button>
              <textarea className={`${inputClass} min-h-28`} value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="player_id,market_value_eur" />
              <button
                type="button"
                className={btnGhost}
                onClick={() =>
                  action("/admin/market-values", { method: "POST", body: JSON.stringify({ csv }) }, tr("Bazar dəyərləri tətbiq edildi"), tr("CSV-dəki bazar dəyərləri tətbiq olunsun?"))
                }
              >
                {tr("Bazar dəyəri CSV-ni tətbiq et")}
              </button>
              {rows.map((row) => (
                <div key={row.id} className={`${card} flex flex-wrap items-center justify-between gap-2`}>
                  <span className={`${BODY} text-sm text-ink`}>
                    {row.version} · {row.status} {row.createdAt ? `· ${when(row.createdAt)}` : ""}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() =>
                        action(
                          `/admin/data-releases/${row.id}/publish`,
                          { method: "POST", timeoutMs: 180000 },
                          tr("Dərc edildi"),
                          tr("{v} versiyası saytda dərc olunsun? Bütün oyunçular yeni datanı görəcək.", { v: row.version }),
                        )
                      }
                    >
                      {tr("Dərc et")}
                    </button>
                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() =>
                        action(`/admin/data-releases/${row.id}/rollback`, { method: "POST" }, tr("Geri qaytarıldı"), tr("{v} versiyası geri qaytarılsın?", { v: row.version }))
                      }
                    >
                      {tr("Geri qaytar")}
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {current && tab === "games" ? (
            <section className="mt-4 space-y-2">
              {rows.map((row) => (
                <div key={row.id} className={`${card} flex flex-wrap items-center justify-between gap-2`}>
                  <span className={`${BODY} text-sm text-ink`}>
                    {gameName(row.id)} <span className="text-muted">· {row.id}</span>
                    {!row.enabled ? <span className={`${badge} ml-2 bg-bad/15 text-bad-hi`}>{tr("Söndürülüb")}</span> : null}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={row.enabled ? btnDanger : btnGhost}
                      onClick={() =>
                        action(
                          `/admin/games/${row.id}`,
                          { method: "PATCH", body: JSON.stringify({ enabled: !row.enabled }) },
                          tr("Yeniləndi"),
                          row.enabled ? tr("{g} söndürülsün?", { g: gameName(row.id) }) : null,
                        )
                      }
                    >
                      {row.enabled ? tr("Söndür") : tr("Aktiv et")}
                    </button>
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => action(`/admin/games/${row.id}`, { method: "PATCH", body: JSON.stringify({ isNew: !row.isNew }) }, tr("Yeniləndi"))}
                    >
                      {tr("Yeni nişanı")}: {row.isNew ? tr("var") : tr("yox")}
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {current && tab === "goat" ? (
            <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row) => (
                <div key={row.id} className={`${card} ${BODY} text-sm text-ink`}>
                  {row.name} · {row.pos} · {row.code}
                </div>
              ))}
            </section>
          ) : null}

          {current && tab === "audit" ? (
            <section className="mt-4 space-y-2">
              {rows.map((row) => (
                <details key={row.id} className={`${card} ${BODY} text-sm`}>
                  <summary className="cursor-pointer text-muted">
                    <span className="font-bold text-ink">{row.action}</span> · {row.entity}
                    {row.entityId ? ` · ${row.entityId}` : ""} · {row.adminUsername ? `@${row.adminUsername}` : "—"} · {when(row.createdAt)}
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <pre className="max-h-60 overflow-auto rounded-lg bg-page-2 p-2 text-xs text-muted">
                      {tr("Əvvəl")}: {JSON.stringify(row.before, null, 2)}
                    </pre>
                    <pre className="max-h-60 overflow-auto rounded-lg bg-page-2 p-2 text-xs text-ink">
                      {tr("Sonra")}: {JSON.stringify(row.after, null, 2)}
                    </pre>
                  </div>
                </details>
              ))}
            </section>
          ) : null}

          {current && tab === "media" ? (
            <section className="mt-4 space-y-2">
              <div className={`${card} grid gap-2 sm:grid-cols-2`}>
                <select
                  className={inputClass}
                  value={mediaForm.entityType}
                  onChange={(event) => setMediaForm((form) => ({ ...form, entityType: event.target.value }))}
                >
                  {["player", "club", "coach", "game", "other"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <input className={inputClass} placeholder={tr("Obyekt ID")} value={mediaForm.entityId} onChange={(event) => setMediaForm((form) => ({ ...form, entityId: event.target.value }))} />
                <input className={inputClass} placeholder={tr("Növ (portrait, logo...)")} value={mediaForm.kind} onChange={(event) => setMediaForm((form) => ({ ...form, kind: event.target.value }))} />
                <input className={inputClass} placeholder={tr("Şəkil URL")} value={mediaForm.sourceUrl} onChange={(event) => setMediaForm((form) => ({ ...form, sourceUrl: event.target.value }))} />
                <input className={inputClass} placeholder={tr("Lisenziya")} value={mediaForm.license} onChange={(event) => setMediaForm((form) => ({ ...form, license: event.target.value }))} />
                <input className={inputClass} placeholder={tr("Müəllif")} value={mediaForm.author} onChange={(event) => setMediaForm((form) => ({ ...form, author: event.target.value }))} />
                <button
                  type="button"
                  className={`${btn} sm:col-span-2`}
                  onClick={() =>
                    action(
                      "/admin/media",
                      {
                        method: "POST",
                        timeoutMs: 120000,
                        body: JSON.stringify({
                          ...mediaForm,
                          license: mediaForm.license || undefined,
                          author: mediaForm.author || undefined,
                        }),
                      },
                      tr("Media emal olundu"),
                    )
                  }
                >
                  {tr("Media yüklə")}
                </button>
              </div>
              {rows.map((row) => (
                <div key={row.id} className={`${card} ${BODY} text-sm text-ink`}>
                  {row.entityType}:{row.entityId} · {row.kind} · {row.status}
                </div>
              ))}
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
