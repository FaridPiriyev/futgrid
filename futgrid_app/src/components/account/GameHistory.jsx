import { useCallback, useEffect, useState } from "react";
import { History, Swords, Target, TrendingUp, Trophy } from "lucide-react";
import { api } from "../../lib/api";
import { gameName } from "../../lib/games/names";
import { getLang, tr } from "../../i18n";
import { useSocial } from "../../lib/social";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";
const CARD = "rounded-[14px] border border-line/10 bg-line/3 p-4 md:p-5";

const FILTERS = [
  { key: "all", label: () => tr("Hamısı") },
  { key: "duel", label: () => tr("Duellər") },
  { key: "solo", label: () => tr("Tək") },
];

const RESULT = {
  win: { label: () => tr("Qələbə"), tone: "bg-good/15 text-good-hi border-good/30" },
  loss: { label: () => tr("Məğlubiyyət"), tone: "bg-bad/12 text-bad-hi border-bad/30" },
  draw: { label: () => tr("Heç-heçə"), tone: "bg-line/8 text-ink border-line/20" },
};

const REASON = {
  surrender: () => tr("təslim"),
  left: () => tr("oyunu tərk etdi"),
  disconnect: () => tr("bağlantı kəsildi"),
};

const DIFFICULTY = {
  easy: () => tr("Asan"),
  normal: () => tr("Normal"),
  hard: () => tr("Çətin"),
};

function timeAgo(iso) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  let rtf;
  try {
    rtf = new Intl.RelativeTimeFormat(getLang(), { numeric: "auto" });
  } catch {
    rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  }
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return new Date(iso).toLocaleDateString(getLang());
}

function Avatar({ person }) {
  if (person.avatarUrl) {
    return <img src={person.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  const letter = (person.displayName || person.username || "?").slice(0, 1).toUpperCase();
  return (
    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-line/10 ${FONT} text-sm font-bold text-muted`}>
      {person.guest ? "?" : letter}
    </span>
  );
}

const personName = (person) =>
  person.guest ? tr("Qonaq") : person.deleted ? tr("Silinmiş hesab") : person.displayName || `@${person.username}`;

function Delta({ value }) {
  if (value === null || value === undefined) return null;
  const tone = value > 0 ? "text-good-hi" : value < 0 ? "text-bad-hi" : "text-muted";
  return (
    <span className={`${FONT} text-base font-black ${tone}`}>
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

function DuelRow({ item }) {
  const { openProfile } = useSocial();
  const result = RESULT[item.result] ?? RESULT.draw;
  const opponents = item.opponents ?? [];
  const first = opponents[0];
  const scoreLine =
    item.myScore !== null && item.myScore !== undefined && first?.score !== null && first?.score !== undefined && opponents.length === 1
      ? `${item.myScore}–${first.score}`
      : null;
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
        <Swords className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${FONT} text-[15px] font-bold uppercase text-ink`}>{gameName(item.gameId)}</p>
        <div className={`mt-0.5 flex min-w-0 items-center gap-1.5 ${BODY} text-[13px] text-muted`}>
          <span className="shrink-0">{tr("vs")}</span>
          {first ? <Avatar person={first} /> : null}
          <span className="truncate">
            {opponents.length
              ? opponents.map((person, i) => (
                  <span key={i}>
                    {i ? ", " : ""}
                    {!person.guest && !person.deleted && person.username ? (
                      <button type="button" onClick={() => openProfile(person.username)} className="hover:text-accent hover:underline">
                        {personName(person)}
                      </button>
                    ) : (
                      personName(person)
                    )}
                  </span>
                ))
              : tr("Rəqib")}
          </span>
        </div>
        <p className={`mt-0.5 ${BODY} text-xs text-faint`}>
          {timeAgo(item.at)}
          {scoreLine ? ` · ${scoreLine}` : ""}
          {REASON[item.endedReason] ? ` · ${REASON[item.endedReason]()}` : ""}
          {!item.rated ? ` · ${tr("reytinqsiz")}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`rounded-full border px-2.5 py-0.5 ${FONT} text-xs font-bold uppercase tracking-wide ${result.tone}`}>
          {result.label()}
        </span>
        {item.rated ? <Delta value={item.ratingDelta} /> : null}
      </div>
    </li>
  );
}

function SoloRow({ item }) {
  const percent = typeof item.score === "number" ? Math.round(item.score * 100) : null;
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-yellow/15 text-yellow">
        <Target className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate ${FONT} text-[15px] font-bold uppercase text-ink`}>{gameName(item.gameId)}</p>
        <p className={`mt-0.5 ${BODY} text-[13px] text-muted`}>
          {tr("Tək oyun")} · {DIFFICULTY[item.difficulty]?.() ?? item.difficulty}
          {percent !== null ? ` · ${tr("nəticə {n}%", { n: percent })}` : ""}
        </p>
        <p className={`mt-0.5 ${BODY} text-xs text-faint`}>{timeAgo(item.at)}</p>
      </div>
      <span className={`shrink-0 ${FONT} text-base font-black ${item.points > 0 ? "text-ink" : "text-faint"}`}>
        {item.points > 0 ? `+${Math.round(item.points)}` : "0"} <span className="text-xs font-bold text-muted">{tr("xal")}</span>
      </span>
    </li>
  );
}

function EloSummary({ summary }) {
  const overall = summary?.overall;
  const games = (summary?.games ?? []).filter((row) => row.games > 0);
  return (
    <section className={CARD}>
      <h2 className={`flex items-center gap-2 ${FONT} text-lg font-bold uppercase text-ink`}>
        <TrendingUp className="h-5 w-5 text-accent" />
        {tr("Duel reytinqi")}
      </h2>
      {overall && overall.games > 0 ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Elo", value: Math.round(overall.rating), strong: true },
              { label: tr("Ən yüksək"), value: Math.round(overall.peak) },
              { label: tr("Q–M–H"), value: `${overall.wins}–${overall.losses}–${overall.draws}` },
              {
                label: tr("Qələbə faizi"),
                value: `${overall.games ? Math.round((overall.wins / overall.games) * 100) : 0}%`,
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[10px] border border-line/10 bg-page/40 px-3 py-2.5">
                <p className={`${FONT} text-[11px] font-bold uppercase tracking-[0.14em] text-muted`}>{stat.label}</p>
                <p className={`mt-0.5 ${FONT} font-black ${stat.strong ? "text-2xl text-accent" : "text-xl text-ink"}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          {games.length ? (
            <ul className="mt-3 divide-y divide-line/10">
              {games.map((row) => (
                <li key={row.gameId} className={`flex items-center justify-between gap-3 py-2 ${BODY} text-sm`}>
                  <span className="truncate font-semibold text-ink">{gameName(row.gameId)}</span>
                  <span className="shrink-0 text-muted">
                    <span className={`${FONT} font-bold text-ink`}>{Math.round(row.rating)}</span> · {row.wins}–{row.losses}–
                    {row.draws}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {overall.games < 5 ? (
            <p className={`mt-3 ${BODY} text-xs text-muted`}>
              {tr("Reytinq cədvəlində görünmək üçün daha {n} duel oyna.", { n: 5 - overall.games })}
            </p>
          ) : null}
        </>
      ) : (
        <p className={`mt-2 ${BODY} text-sm text-muted`}>
          {tr("Hələ reytinqli duel oynamamısan. Hamı 1000 Elo ilə başlayır — güclü rəqibi udmaq daha çox xal gətirir.")}
        </p>
      )}
    </section>
  );
}

export default function GameHistory() {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [nextBefore, setNextBefore] = useState(null);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async (type, before) => {
    const params = new URLSearchParams({ type, limit: "15" });
    if (before) params.set("before", before);
    return api.get(`/me/history?${params.toString()}`);
  }, []);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    load(filter)
      .then((data) => {
        if (!alive) return;
        setItems(data.entries ?? []);
        setNextBefore(data.nextBefore ?? null);
        setSummary(data.summary ?? null);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [filter, load]);

  const more = async () => {
    if (!nextBefore) return;
    setStatus("more");
    try {
      const data = await load(filter, nextBefore);
      setItems((current) => {
        const seen = new Set(current.map((item) => `${item.kind}:${item.id}`));
        return [...current, ...(data.entries ?? []).filter((item) => !seen.has(`${item.kind}:${item.id}`))];
      });
      setNextBefore(data.nextBefore ?? null);
      setStatus("ready");
    } catch {
      setStatus("ready");
    }
  };

  return (
    <>
      <EloSummary summary={summary} />

      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`flex items-center gap-2 ${FONT} text-lg font-bold uppercase text-ink`}>
            <History className="h-5 w-5 text-accent" />
            {tr("Oyun tarixçəsi")}
          </h2>
          <div className="flex gap-1 rounded-full border border-line/10 bg-page/40 p-1" role="tablist">
            {FILTERS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={filter === entry.key}
                onClick={() => setFilter(entry.key)}
                className={`h-8 rounded-full px-3 ${FONT} text-xs font-bold uppercase tracking-wide transition-colors ${
                  filter === entry.key ? "bg-accent-lo text-white" : "text-muted hover:text-ink"
                }`}
              >
                {entry.label()}
              </button>
            ))}
          </div>
        </div>

        {summary ? (
          <p className={`mt-2 ${BODY} text-xs text-muted`}>
            {tr("{d} duel · {s} tək oyun", { d: summary.duels, s: summary.solo })}
          </p>
        ) : null}

        {status === "loading" ? (
          <p className={`mt-4 ${BODY} text-sm text-muted`}>{tr("Yüklənir...")}</p>
        ) : status === "error" ? (
          <p className={`mt-4 ${BODY} text-sm text-bad-hi`}>{tr("Tarixçə yüklənmədi. Səhifəni yenilə.")}</p>
        ) : items.length === 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-dashed border-line/15 p-4">
            <Trophy className="h-5 w-5 shrink-0 text-faint" />
            <p className={`${BODY} text-sm text-muted`}>{tr("Hələ oyun yoxdur. Oynadığın hər oyun burada görünəcək.")}</p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line/10">
            {items.map((item) =>
              item.kind === "duel" ? (
                <DuelRow key={`d-${item.id}`} item={item} />
              ) : (
                <SoloRow key={`s-${item.id}`} item={item} />
              ),
            )}
          </ul>
        )}

        {nextBefore && status !== "loading" ? (
          <button
            type="button"
            onClick={() => void more()}
            disabled={status === "more"}
            className={`mt-3 h-10 w-full rounded-[10px] border border-line/15 ${FONT} text-sm font-bold uppercase tracking-wide text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50`}
          >
            {status === "more" ? tr("Yüklənir...") : tr("Daha çox göstər")}
          </button>
        ) : null}
      </section>
    </>
  );
}
