import { useState } from "react";
import { Check, Crosshair, Globe2, Hash, HelpCircle, Info, Layers, Search, Shield, Trophy, UserRound, X } from "lucide-react";
import { QUESTIONS, QUESTION_GROUPS } from "../../../lib/games/questions";
import { POS_NAME, countryOf } from "../../../lib/games/playerInfo";
import EntitySearch from "../common/EntitySearch";
import PlayerAvatar, { ClubLogo, Flag } from "../common/PlayerAvatar";
import { FONT } from "../common/ui";

import { tr } from "../../../i18n";

export const SUAL_KEYFRAMES = `
@keyframes sqIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes sqPop { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
@keyframes sqShake { 0%,100% { transform: translateX(0); } 25%,75% { transform: translateX(-6px); } 50% { transform: translateX(6px); } }
`;

export function Mark({ value, size = "h-7 w-7", icon = "h-4 w-4" }) {
  const cls =
    value === true ? "bg-good text-white" : value === false ? "bg-bad text-white" : "bg-line/15 text-muted";
  const Icon = value === true ? Check : value === false ? X : HelpCircle;
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${size} ${cls} animate-[sqPop_0.3s_ease-out_both]`}>
      <Icon className={icon} strokeWidth={3} />
    </span>
  );
}

export function AnswerBoard({ title, items, used, max, accent = "text-yellow", empty, active = true, compact = false }) {
  return (
    <section
      data-theme="dark"
      className={`relative overflow-hidden rounded-2xl bg-navy text-white shadow-[0_30px_60px_-40px_var(--fg-shadow)] transition-opacity duration-300 ${
        active ? "" : "opacity-60"
      } ${compact ? "p-4" : "p-4 md:p-6"}`}
    >
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,white_1px,transparent_1.5px)] [background-size:18px_18px]" />
      <div className="relative flex items-end justify-between gap-3 border-b border-white/15 pb-3">
        <h3 className={`${FONT} text-xl font-black uppercase leading-none tracking-wide md:text-2xl ${accent}`}>{title}</h3>
        <span className={`shrink-0 ${FONT} text-sm font-bold tabular-nums text-white/70`}>
          {tr("{n}/{max} sual", { n: used, max })}
        </span>
      </div>
      {items.length ? (
        <ol className={`relative mt-3 grid gap-x-6 gap-y-1.5 ${compact ? "" : "sm:grid-cols-2"}`}>
          {items.map((it, i) => (
            <li key={`${it.id}-${i}`} className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-1.5 animate-[sqIn_0.25s_ease-out_both]">
              <span className={`min-w-0 ${FONT} text-[15px] font-semibold leading-tight md:text-base ${it.kind === "guess" ? "italic text-white/80" : ""}`}>
                {it.text}
              </span>
              <Mark value={it.answer} size="h-6 w-6 md:h-7 md:w-7" icon="h-3.5 w-3.5 md:h-4 md:w-4" />
            </li>
          ))}
        </ol>
      ) : (
        <p className={`relative mt-4 ${FONT} text-sm text-white/60`}>{empty}</p>
      )}
    </section>
  );
}

const GROUP_ICON = {
  general: Info,
  position: Crosshair,
  nation: Globe2,
  league: Layers,
  club: Shield,
  trophy: Trophy,
  numbers: Hash,
};

export function QuestionBank({ data, asked, onAsk, disabled = false, accent = "border-accent" }) {
  const [tab, setTab] = useState(QUESTION_GROUPS[0].key);
  const group = QUESTION_GROUPS.find((g) => g.key === tab);
  const customCount = [...asked.keys()].filter((id) => !QUESTIONS.has(id)).length;
  const tabs = [
    ...QUESTION_GROUPS.map((g) => ({
      key: g.key,
      label: g.label,
      Icon: GROUP_ICON[g.key] ?? HelpCircle,
      done: g.items.filter((q) => asked.has(q.id)).length,
      total: g.items.length,
    })),
    { key: "custom", label: tr("Öz sualın"), Icon: Search, done: customCount, total: null },
  ];

  return (
    <div>
      <div role="tablist" aria-label={tr("Sual qrupları")} className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
        {tabs.map(({ key, label, Icon, done, total }) => {
          const on = key === tab;
          const full = total != null && done === total;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(key)}
              className={`relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-[background-color,border-color,color,transform] duration-150 ${
                on
                  ? "border-accent bg-accent text-white shadow-[0_10px_22px_-14px_var(--fg-accent)]"
                  : `border-edge bg-page-2 hover:-translate-y-0.5 hover:border-accent/50 ${full ? "text-faint" : "text-muted hover:text-ink"}`
              }`}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
              <span className={`max-w-full truncate ${FONT} text-[11px] font-bold uppercase leading-none tracking-wide sm:tracking-normal`}>{label}</span>
              {done > 0 && (
                <span
                  className={`absolute -right-1 -top-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 ${FONT} text-[10px] font-black tabular-nums ${
                    on ? "bg-white text-accent" : "bg-accent text-white"
                  }`}
                >
                  {done}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div key={tab} className="mt-3 animate-[sqIn_0.2s_ease-out_both]">
        {group ? (
          <div className="grid grid-cols-2 gap-1.5">
            {group.items.map((q) => {
              const done = asked.get(q.id);
              const answered = done !== undefined;
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={disabled || answered}
                  onClick={() => onAsk(q)}
                  className={`group flex min-h-11 items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left sm:px-3 transition-[transform,background-color,border-color] duration-150 ${
                    done === true
                      ? "border-good/50 bg-good/10"
                      : done === false
                        ? "border-bad/40 bg-bad/8"
                        : done === null
                          ? "border-edge bg-page-2"
                          : "border-edge bg-surface enabled:hover:-translate-y-0.5 enabled:hover:border-accent/60 enabled:hover:bg-accent/5 disabled:opacity-50"
                  }`}
                >
                  <span
                    className={`min-w-0 ${FONT} text-[13px] font-bold leading-tight sm:text-[15px] ${
                      done === true ? "text-good-hi" : done === false ? "text-bad-hi line-through decoration-2" : done === null ? "text-muted" : "text-ink"
                    }`}
                  >
                    {q.text}
                  </span>
                  {answered ? (
                    <Mark value={done} size="h-5 w-5 sm:h-6 sm:w-6" icon="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  ) : (
                    <span className="hidden h-6 w-6 shrink-0 place-items-center rounded-full border border-edge sm:grid text-faint transition-colors duration-150 group-enabled:group-hover:border-accent group-enabled:group-hover:bg-accent group-enabled:group-hover:text-white">
                      <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-accent/50 bg-accent/5 p-3">
            <p className={`mb-2 ${FONT} text-sm font-bold text-ink`}>{tr("Klub və ya ölkə barədə soruş")}</p>
            <EntitySearch
              data={data}
              accent={accent}
              disabled={disabled}
              placeholder={tr("Klub və ya ölkə yaz: Real Madrid, Braziliya...")}
              onSelect={(e) => onAsk(e)}
            />
            <p className={`mt-2 ${FONT} text-xs text-muted`}>{tr("Məsələn: “Barcelona klubunda oynayıb?” və ya “Braziliya futbolçusudur?”")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SecretCard({ label, sub, tone = "bg-accent" }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full ${tone} text-white shadow-[0_10px_24px_-12px_var(--fg-shadow)] md:h-16 md:w-16`}>
        <UserRound className="h-9 w-9 opacity-40 md:h-10 md:w-10" />
        <span className={`absolute ${FONT} text-3xl font-black md:text-4xl`}>?</span>
      </span>
      <span className="min-w-0">
        <span className={`block ${FONT} text-lg font-black uppercase leading-none tracking-wide text-ink md:text-xl`}>{label}</span>
        {sub && <span className={`mt-1 block ${FONT} text-[13px] text-muted md:text-sm`}>{sub}</span>}
      </span>
    </div>
  );
}

export function RevealCard({ data, player, tone = "border-edge" }) {
  const country = countryOf(data, player);
  const clubs = [...new Set(player.club_history ?? [])].map((id) => data.clubsById.get(id)).filter(Boolean);
  return (
    <div className={`flex items-center gap-4 rounded-2xl border-2 bg-surface p-3 md:p-4 ${tone}`}>
      <PlayerAvatar player={player} className="h-20 w-20 md:h-24 md:w-24 lg:h-28 lg:w-28" textClass="text-2xl" />
      <div className="min-w-0">
        <p className={`truncate ${FONT} text-xl font-black uppercase leading-tight text-ink md:text-2xl`}>{player.name}</p>
        <p className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 ${FONT} text-sm text-muted`}>
          {country && (
            <span className="inline-flex items-center gap-1.5">
              <Flag country={country} />
              {country.name}
            </span>
          )}
          {player.position && <span>· {POS_NAME[player.position]}</span>}
          {player.birth_date && <span>· {player.birth_date.slice(0, 4)}</span>}
        </p>
        {clubs.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5">
            {clubs.slice(0, 8).map((c) => (
              <span key={c.id} title={c.name} className="inline-flex items-center gap-1 rounded-full border border-edge bg-page px-2 py-0.5">
                <ClubLogo club={{ logo: c.logo_url }} className="h-4 w-4" />
                <span className={`${FONT} text-[11px] font-bold uppercase text-ink-soft`}>{c.short_name}</span>
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
