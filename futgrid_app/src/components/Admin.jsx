import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader, Notice } from "./games/common/GameStatus";
import { useAuth } from "../lib/auth";
import { apiRequest } from "../lib/api";
import { tr } from "../i18n";

const inputClass =
  "w-full rounded-lg border border-line/20 bg-surface px-3 py-2 font-['Roboto',sans-serif] text-sm text-ink outline-none focus:border-accent";
const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 font-['Roboto_Condensed',sans-serif] text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line/20 px-3 py-2 font-['Roboto_Condensed',sans-serif] text-xs font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent";
const card = "rounded-xl border border-line/15 bg-surface p-4";

const TABS = [
  ["overview", "Ümumi"],
  ["users", "İstifadəçilər"],
  ["contact", "Mesajlar"],
  ["daily", "Günlük"],
  ["players", "Oyunçular"],
  ["releases", "Data"],
  ["games", "Oyunlar"],
  ["goat", "GOAT"],
  ["audit", "Audit"],
  ["media", "Media"],
];

export default function Admin() {
  const { user, loading } = useAuth();
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [csv, setCsv] = useState("player_id,market_value_eur\n");
  const [mediaForm, setMediaForm] = useState({
    entityType: "player",
    entityId: "",
    kind: "portrait",
    sourceUrl: "",
    license: "",
    author: "",
  });

  const request = useCallback(
    (path, options = {}) =>
      apiRequest(path, {
        ...options,
        headers: { ...(options.headers ?? {}), "X-Admin-TOTP": code },
      }),
    [code],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const paths = {
        overview: "/admin/overview",
        users: `/admin/users?limit=50${query ? `&query=${encodeURIComponent(query)}` : ""}`,
        contact: "/admin/contact-messages?limit=50",
        daily: "/admin/daily-puzzles?limit=30",
        players: `/admin/players?limit=50${query ? `&query=${encodeURIComponent(query)}` : ""}`,
        releases: "/admin/data-releases",
        games: "/admin/games",
        goat: "/admin/goat/roster?size=128",
        audit: "/admin/audit-log?limit=50",
        media: "/admin/media?limit=50",
      };
      setData(await request(paths[tab]));
    } catch (err) {
      setError(err.message || "Admin request failed");
    } finally {
      setBusy(false);
    }
  }, [tab, query, request]);

  useEffect(() => {
    if (user?.role === "admin" && code.length >= 6) void load();
  }, [user, code, load]);

  const setup = async () => {
    setError("");
    try {
      const result = await apiRequest("/admin/auth/setup");
      setSecret(result.secret);
      setOtpauth(result.otpauthUrl);
    } catch (err) {
      setError(err.message || "TOTP setup failed");
    }
  };

  const verify = async () => {
    setError("");
    setMessage("");
    try {
      await apiRequest("/admin/auth/verify", {
        method: "POST",
        body: JSON.stringify({ token: code }),
      });
      setMessage("TOTP enabled. Reloading data...");
      await load();
    } catch (err) {
      setError(err.message || "Invalid TOTP");
    }
  };

  const action = async (path, options, success = "Done") => {
    setError("");
    setMessage("");
    try {
      await request(path, options);
      setMessage(success);
      await load();
    } catch (err) {
      setError(err.message || "Action failed");
    }
  };

  if (loading) return <Loader text={tr("Yüklənir...")} />;
  if (!user) {
    return (
      <Notice
        title={tr("Admin girişi")}
        text={tr("Əvvəlcə hesabınıza daxil olun.")}
      />
    );
  }
  if (user.role !== "admin") {
    return <Notice title={tr("İcazə yoxdur")} text={tr("Bu səhifə yalnız admin üçündür.")} />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-['Roboto_Condensed',sans-serif] text-3xl font-black uppercase text-ink">
          Admin panel
        </h1>
        <Link to="/hesab" className={btnGhost}>
          Hesab
        </Link>
      </div>

      <section className={`${card} mt-4`}>
        <p className="font-['Roboto_Condensed',sans-serif] text-sm font-bold uppercase tracking-wide text-muted">
          TOTP
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} max-w-40`}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="6 rəqəm"
            inputMode="numeric"
          />
          <button type="button" className={btn} onClick={verify} disabled={code.length < 6}>
            Təsdiqlə / Yenilə
          </button>
          <button type="button" className={btnGhost} onClick={setup}>
            TOTP qur
          </button>
        </div>
        {secret ? (
          <div className="mt-3 break-all rounded-lg bg-page-2 p-3 font-mono text-xs text-ink">
            <p>Secret: {secret}</p>
            <p className="mt-1">otpauth: {otpauth}</p>
            <p className="mt-1 text-muted">
              Authenticator-a əlavə et, sonra kodu yuxarıda yaz və Təsdiqlə.
            </p>
          </div>
        ) : null}
      </section>

      {error ? <p className="mt-4 text-sm text-bad-hi">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-good-hi">{message}</p> : null}

      <nav className="mt-5 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={tab === key ? btn : btnGhost}
          >
            {label}
          </button>
        ))}
      </nav>

      {busy ? <p className="mt-4 text-sm text-muted">Yüklənir...</p> : null}

      {data && tab === "overview" ? (
        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data)
            .filter(([, value]) => typeof value === "number")
            .map(([key, value]) => (
              <div key={key} className={card}>
                <p className="text-xs uppercase tracking-wide text-muted">{key}</p>
                <p className="mt-1 text-2xl font-black text-ink">{value}</p>
              </div>
            ))}
        </section>
      ) : null}

      {data && (tab === "users" || tab === "players") ? (
        <section className="mt-4">
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Axtar..."
            />
            <button type="button" className={btn} onClick={() => void load()}>
              Axtar
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                {(data.entries ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-line/10">
                    <td className="py-2 pr-3 text-ink">
                      {row.displayName ?? row.name ?? row.username ?? row.id}
                    </td>
                    <td className="py-2 pr-3 text-muted">
                      {row.email ?? row.position ?? ""}
                      {row.role ? ` · ${row.role}` : ""}
                    </td>
                    <td className="py-2 text-right">
                      {tab === "users" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() =>
                              action(
                                `/admin/users/${row.id}/block`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({ blocked: !row.blockedAt }),
                                },
                                row.blockedAt ? "Unblocked" : "Blocked",
                              )
                            }
                          >
                            {row.blockedAt ? "Unblock" : "Block"}
                          </button>
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() =>
                              action(
                                `/admin/users/${row.id}/role`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    role:
                                      row.role === "admin"
                                        ? "user"
                                        : row.role === "moderator"
                                          ? "admin"
                                          : "moderator",
                                  }),
                                },
                                "Role updated",
                              )
                            }
                          >
                            Role
                          </button>
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() =>
                              action(`/admin/users/${row.id}/logout-all`, { method: "POST" }, "Sessions revoked")
                            }
                          >
                            Logout
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() =>
                            action(
                              `/admin/players/${row.id}`,
                              { method: "PATCH", body: JSON.stringify({ hidden: !row.hidden }) },
                              row.hidden ? "Visible" : "Hidden",
                            )
                          }
                        >
                          {row.hidden ? "Show" : "Hide"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {data && tab === "contact" ? (
        <section className="mt-4 space-y-3">
          {(data.entries ?? []).map((row) => (
            <div key={row.id} className={card}>
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-bold text-ink">
                  {row.name} · {row.email}
                </p>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    action(`/admin/contact-messages/${row.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ status: "read" }),
                    })
                  }
                >
                  Oxundu
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{row.message}</p>
            </div>
          ))}
        </section>
      ) : null}

      {data && tab === "daily" ? (
        <section className="mt-4 space-y-2">
          {(data.entries ?? []).map((row) => (
            <div key={row.id} className={`${card} flex flex-wrap items-center justify-between gap-2`}>
              <span className="text-sm text-ink">
                {row.date} · {row.game} · {row.difficulty}
              </span>
              <button
                type="button"
                className={btnGhost}
                onClick={() =>
                  action(`/admin/daily-puzzles/${row.id}/regenerate`, { method: "POST" }, "Regenerated")
                }
              >
                Regenerate
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {data && tab === "releases" ? (
        <section className="mt-4 space-y-2">
          <button
            type="button"
            className={btn}
            onClick={() =>
              action(
                "/admin/data-releases/build",
                { method: "POST", timeoutMs: 180000 },
                "Build started",
              )
            }
          >
            Yeni build
          </button>
          <textarea
            className={`${inputClass} min-h-28`}
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            placeholder="player_id,market_value_eur"
          />
          <button
            type="button"
            className={btnGhost}
            onClick={() =>
              action(
                "/admin/market-values",
                { method: "POST", body: JSON.stringify({ csv }) },
                "Market values applied",
              )
            }
          >
            Market CSV tətbiq et
          </button>
          {(data.entries ?? []).map((row) => (
            <div key={row.id} className={`${card} flex flex-wrap items-center justify-between gap-2`}>
              <span className="text-sm text-ink">
                {row.version} · {row.status}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    action(
                      `/admin/data-releases/${row.id}/publish`,
                      { method: "POST", timeoutMs: 180000 },
                      "Published",
                    )
                  }
                >
                  Publish
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    action(`/admin/data-releases/${row.id}/rollback`, { method: "POST" }, "Rolled back")
                  }
                >
                  Rollback
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {data && tab === "games" ? (
        <section className="mt-4 space-y-2">
          {(data.entries ?? []).map((row) => (
            <div key={row.id} className={`${card} flex flex-wrap items-center justify-between gap-2`}>
              <span className="text-sm text-ink">
                {row.id} · {row.name}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    action(`/admin/games/${row.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ enabled: !row.enabled }),
                    })
                  }
                >
                  {row.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() =>
                    action(`/admin/games/${row.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ isNew: !row.isNew }),
                    })
                  }
                >
                  New: {row.isNew ? "on" : "off"}
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {data && tab === "goat" ? (
        <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(data.entries ?? []).map((row) => (
            <div key={row.id} className={`${card} text-sm text-ink`}>
              {row.name} · {row.pos} · {row.code}
            </div>
          ))}
        </section>
      ) : null}

      {data && tab === "audit" ? (
        <section className="mt-4 space-y-2">
          {(data.entries ?? []).map((row) => (
            <div key={row.id} className={`${card} text-sm`}>
              <span className="font-bold text-ink">{row.action}</span> · {row.entity} ·{" "}
              {row.entityId} · {new Date(row.createdAt).toLocaleString()}
            </div>
          ))}
        </section>
      ) : null}

      {data && tab === "media" ? (
        <section className="mt-4 space-y-2">
          <div className={`${card} grid gap-2 sm:grid-cols-2`}>
            <select
              className={inputClass}
              value={mediaForm.entityType}
              onChange={(event) => setMediaForm((form) => ({ ...form, entityType: event.target.value }))}
            >
              {["player", "club", "coach", "game", "other"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Entity ID"
              value={mediaForm.entityId}
              onChange={(event) => setMediaForm((form) => ({ ...form, entityId: event.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Kind"
              value={mediaForm.kind}
              onChange={(event) => setMediaForm((form) => ({ ...form, kind: event.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Image URL"
              value={mediaForm.sourceUrl}
              onChange={(event) => setMediaForm((form) => ({ ...form, sourceUrl: event.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="License"
              value={mediaForm.license}
              onChange={(event) => setMediaForm((form) => ({ ...form, license: event.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Author"
              value={mediaForm.author}
              onChange={(event) => setMediaForm((form) => ({ ...form, author: event.target.value }))}
            />
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
                  "Media processed",
                )
              }
            >
              Media yüklə
            </button>
          </div>
          {(data.entries ?? []).map((row) => (
            <div key={row.id} className={`${card} text-sm text-ink`}>
              {row.entityType}:{row.entityId} · {row.kind} · {row.status}
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
