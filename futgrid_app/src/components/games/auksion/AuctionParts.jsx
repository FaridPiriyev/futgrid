import { Bot, Crown, User } from "lucide-react";
import {
  BUDGET,
  bidAmount,
  canBid,
  maxBid,
  money,
  nextPrice,
  openCount,
} from "../../../lib/games/auction";
import {
  POS_NAME,
  POS_SHORT,
  POS_STYLE,
  ageOf,
  clubOf,
  countryOf,
  euro,
} from "../../../lib/games/playerInfo";
import PlayerAvatar, { ClubLogo, Flag } from "../common/PlayerAvatar";
import { FONT } from "../common/ui";
import { KEYS, SIDES } from "./settings";

import { tr } from "../../../i18n";
export const AUCTION_KEYFRAMES = `
@keyframes auLot { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes auStamp { 0% { opacity: 0; transform: rotate(-8deg) scale(1.8); } 60% { opacity: 1; transform: rotate(-8deg) scale(.94); } 100% { opacity: 1; transform: rotate(-8deg) scale(1); } }
@keyframes auBlink { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes auBump { 0% { transform: scale(1); } 40% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes auDot { 0%,80%,100% { opacity: .2; } 40% { opacity: 1; } }
@keyframes auSlot { 0%,100% { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fg-line) 12%, transparent); } 50% { box-shadow: inset 0 0 0 1px var(--au-slot); } }
@keyframes auIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes auGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;

const TIER_STYLE = {
  star: "border-gold-hi/60 text-gold-hi",
  good: "border-sky-300/50 text-sky-300",
  base: "border-line/20 text-soft",
};

export function PosBadge({ pos, className = "h-6 w-10 text-[10px]" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center ${FONT} font-bold tracking-wider ${POS_STYLE[pos]} ${className}`}
    >
      {POS_SHORT[pos]}
    </span>
  );
}

export const shortName = (name) => {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
};

export function SideMark({ side, isBot, className = "h-8 w-8" }) {
  return (
    <span className={`grid shrink-0 place-items-center ${SIDES[side].solid} ${className}`}>
      {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
    </span>
  );
}

export function LotCard({ data, lot, phase, outcome, names }) {
  const p = lot.player;
  const club = clubOf(data, p);
  const country = countryOf(data, p);
  const age = ageOf(p);
  const stats = [
    { label: tr("Yaş"), value: age ?? "—" },
    { label: tr("Dəyər"), value: euro(p.market_value?.amount_eur ?? 0) },
    { label: tr("Yığma"), value: p.international?.caps ?? 0 },
  ];

  return (
    <div
      key={lot.id}
      data-theme="dark"
      className="relative w-full overflow-hidden border border-sky-300/20 bg-[linear-gradient(160deg,#16203a_0%,#0b0f1c_55%,#0a0d16_100%)] p-4 shadow-[0_30px_80px_-30px_color-mix(in_srgb,var(--fg-accent-lo)_55%,transparent)] animate-[auLot_0.55s_cubic-bezier(.2,.8,.2,1)_both] md:p-5"
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-16 -top-20 h-56 w-72 rounded-full blur-3xl ${
          lot.tier.key === "star" ? "bg-gold/20" : "bg-accent/15"
        }`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p
            className={`${FONT} text-5xl font-bold leading-none text-gold-hi md:text-6xl`}
          >
            {lot.rating}
          </p>
          <p
            className={`mt-1 ${FONT} text-[11px] font-bold uppercase tracking-[0.25em] text-gold`}
          >
            {tr("Reytinq", null, "rating")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`border px-2.5 py-1 ${FONT} text-[11px] font-bold uppercase tracking-[0.18em] ${TIER_STYLE[lot.tier.key]}`}
          >
            {lot.tier.label}
          </span>
          <PosBadge pos={lot.pos} className="h-6 w-12 text-[11px]" />
        </div>
      </div>

      <div className="relative -mt-6 flex justify-center md:-mt-10">
        <PlayerAvatar
          key={p.id}
          player={p}
          className="h-24 w-24 border-2 md:h-28 md:w-28"
          textClass="text-3xl md:text-4xl"
        />
      </div>
      <h3
        className={`relative mt-2 text-center ${FONT} text-2xl font-bold uppercase leading-tight text-ink md:text-[28px]`}
      >
        {p.name}
      </h3>
      <div
        className={`relative mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 ${FONT} text-sm text-muted`}
      >
        {country && (
          <span className="inline-flex items-center gap-1.5">
            <Flag key={country.code} country={country} />
            {country.name}
          </span>
        )}
        {country && club && <span className="text-dim">·</span>}
        {club && (
          <span className="inline-flex items-center gap-1.5">
            <ClubLogo key={club.name} club={club} />
            {club.name}
          </span>
        )}
        <span className="text-dim">·</span>
        <span>{POS_NAME[lot.pos]}</span>
      </div>
      <div className="relative mt-3 grid grid-cols-3 border-t border-line/10 pt-2.5">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className={`${FONT} text-lg font-bold text-ink`}>{s.value}</p>
            <p
              className={`${FONT} text-[11px] uppercase tracking-[0.15em] text-faint`}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {phase === "sold" && outcome && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/65 backdrop-blur-[2px]">
          <div
            className={`border-4 px-6 py-3 text-center animate-[auStamp_0.5s_cubic-bezier(.2,.8,.2,1)_both] ${
              outcome.winner
                ? `${SIDES[outcome.winner].border} ${SIDES[outcome.winner].text}`
                : "border-faint text-muted"
            }`}
          >
            <p className={`${FONT} text-3xl font-bold uppercase tracking-widest md:text-4xl`}>
              {outcome.winner ? tr("Satıldı") : tr("Satılmadı")}
            </p>
            {outcome.winner && (
              <p className={`${FONT} mt-1 text-base font-bold uppercase text-ink`}>
                {names[outcome.winner]} · {money(outcome.price)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimerRing({ remaining, total }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, remaining / total));
  const urgent = remaining <= 3000;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" style={{ stroke: "color-mix(in srgb, var(--fg-line) 10%, transparent)" }} strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          style={{ stroke: urgent ? "var(--fg-bad)" : "var(--fg-gold)" }}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className="transition-[stroke-dashoffset] duration-100 ease-linear"
        />
      </svg>
      <span
        className={`absolute inset-0 grid place-items-center ${FONT} text-2xl font-bold ${
          urgent ? "text-bad animate-[auBlink_0.6s_ease-in-out_infinite]" : "text-ink"
        }`}
      >
        {Math.ceil(remaining / 1000)}
      </span>
    </div>
  );
}

export function PriceRow({ state, names, now, timerMs }) {
  const lot = state.lot;
  const leader = lot.leader;
  const remaining = state.phase === "bid" ? Math.max(0, state.deadline - now) : 0;
  return (
    <div className="flex items-center justify-center gap-6 md:gap-8">
      <div className="text-center">
        <p
          className={`${FONT} text-[11px] font-bold uppercase tracking-[0.24em] text-faint`}
        >
          {leader ? tr("Cari təklif") : tr("Başlanğıc qiymət")}
        </p>
        <p
          key={`${lot.id}-${lot.price}-${leader}`}
          className={`${FONT} text-5xl font-bold leading-tight text-ink animate-[auBump_0.35s_ease-out]`}
        >
          {money(leader ? lot.price : lot.start)}
        </p>
        <p
          className={`${FONT} text-sm font-bold ${leader ? SIDES[leader].text : "text-faint"}`}
        >
          {leader ? (
            <span className="inline-flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5" />
              {tr("{name} öndədir", { name: names[leader] })}
            </span>
          ) : (
            tr("Hələ təklif yoxdur")
          )}
        </p>
      </div>
      <TimerRing remaining={remaining} total={timerMs} />
    </div>
  );
}

function statusText(state, side) {
  const { lot, teams, phase } = state;
  if (phase !== "bid" || !lot) return null;
  if (lot.leader === side) return tr("Öndəsən");
  if (lot.passed[side]) return tr("Bu lotdan keçdin");
  if (!openCount(teams[side], lot.pos)) return `${POS_NAME[lot.pos]} yerin doludur`;
  if (maxBid(teams[side]) < nextPrice(lot)) return tr("Büdcə çatmır");
  return null;
}

export function BidControls({ side, state, names, onBid, onPass, showName, showKeys }) {
  const lot = state.lot;
  const can = canBid(state, side);
  const cap = maxBid(state.teams[side]);
  const status = statusText(state, side);
  const incs = [1, 2, 4];
  const keys = KEYS[side];

  return (
    <div className="w-full">
      {(showName || status) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {showName && (
            <span className={`${FONT} text-sm font-bold uppercase tracking-wide ${SIDES[side].text}`}>
              {names[side]}
            </span>
          )}
          {status && (
            <span className={`ml-auto ${FONT} text-xs uppercase tracking-wider text-muted`}>
              {status}
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {incs.map((inc, i) => {
          const amount = lot ? bidAmount(lot, inc) : 0;
          const disabled = !can || amount > cap;
          return (
            <button
              key={inc}
              type="button"
              disabled={disabled}
              onClick={() => onBid(side, inc)}
              className={`relative flex h-13 flex-col items-center justify-center border ${FONT} font-bold transition-[transform,background-color,opacity] duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
                i === 0
                  ? `${SIDES[side].solid} border-transparent text-base md:text-lg`
                  : "border-line/12 bg-line/5 text-base text-ink enabled:hover:bg-line/10"
              }`}
            >
              {money(amount)}
              {showKeys && (
                <span className="absolute right-1 top-0.5 text-[10px] font-normal opacity-60">
                  {keys.bids[i]}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          disabled={!can}
          onClick={() => onPass(side)}
          className={`relative h-13 border border-transparent bg-bad-lo ${FONT} text-base font-bold uppercase text-white shadow-[0_10px_22px_-12px_var(--fg-bad)] transition-[filter,transform] duration-200 active:scale-95 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35`}
        >
          {tr("Keç")}
          {showKeys && (
            <span className="absolute right-1 top-0.5 text-[10px] font-normal uppercase opacity-60">
              {keys.pass}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function Thinking({ state, side }) {
  const lot = state.lot;
  if (state.phase !== "bid" || !lot) return null;
  if (lot.passed[side])
    return <span className={`${FONT} text-xs uppercase tracking-wider text-faint`}>{tr("Keçdi")}</span>;
  if (!canBid(state, side)) return null;
  return (
    <span className={`inline-flex items-center gap-1 ${FONT} text-xs uppercase tracking-wider text-muted`}>
      {tr("Düşünür")}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1 w-1 rounded-full bg-muted animate-[auDot_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}

export function TeamPanel({ data, side, name, state, isBot }) {
  const team = state.teams[side];
  const lot = state.phase === "bid" ? state.lot : null;
  const open = openCount(team);
  const cap = maxBid(team);
  const leading = lot?.leader === side;
  const target = lot ? team.slots.findIndex((s) => !s.pick && s.pos === lot.pos) : -1;

  return (
    <div
      className={`border bg-surface/85 p-4 transition-[box-shadow,border-color] duration-500 ${
        leading ? `border-transparent ${SIDES[side].shadow}` : "border-line/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <SideMark side={side} isBot={isBot} />
          <span className={`truncate ${FONT} text-lg font-bold uppercase text-ink`}>{name}</span>
        </span>
        {isBot ? (
          <Thinking state={state} side={side} />
        ) : (
          <span className={`${FONT} text-xs uppercase tracking-wider text-faint`}>
            {open ? tr("{open} yer boş", { open }) : tr("Heyət tamdır")}
          </span>
        )}
      </div>
      <p className={`mt-4 ${FONT} text-3xl font-bold text-ink`}>
        {money(team.money)}
        <span className="ml-1.5 text-sm font-normal text-faint">/ {money(BUDGET)}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden bg-line/8">
        <span
          className={`block h-full transition-[width] duration-700 ease-out ${SIDES[side].bar}`}
          style={{ width: `${(team.money / BUDGET) * 100}%` }}
        />
      </div>
      <p className={`mt-2 ${FONT} text-xs text-faint`}>
        {open ? (
          <>
            {tr("Maksimum təklif:")}{" "} <span className="font-bold text-ink">{money(cap)}</span>
          </>
        ) : (
          tr("Bütün yerlər doludur")
        )}
      </p>
      <div className="mt-4 space-y-2">
        {team.slots.map((s, i) => (
          <div
            key={i}
            style={{ "--au-slot": SIDES[side].ring }}
            className={`flex h-13 items-center gap-2.5 px-2.5 ${
              s.pick
                ? "bg-line/4 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--fg-line)_8%,transparent)] animate-[auIn_0.4s_ease-out_both]"
                : `shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--fg-line)_10%,transparent)] ${
                    i === target ? "animate-[auSlot_1.4s_ease-in-out_infinite]" : ""
                  }`
            }`}
          >
            <PosBadge pos={s.pos} />
            {s.pick ? (
              <>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${FONT} text-sm font-bold text-ink`}>
                    {shortName(s.pick.player.name)}
                  </span>
                  <span className={`block truncate ${FONT} text-[11px] text-faint`}>
                    {s.pick.auto ? "avtomatik" : clubOf(data, s.pick.player)?.name}
                  </span>
                </span>
                <span className={`bg-line/10 px-1.5 py-0.5 ${FONT} text-xs font-bold text-ink`}>
                  {s.pick.rating}
                </span>
                <span className={`w-11 text-right ${FONT} text-xs font-bold text-soft`}>
                  {money(s.pick.price)}
                </span>
              </>
            ) : (
              <span className={`${FONT} text-xs text-dim`}>{tr("Boş")}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniTeam({ side, name, state, isBot }) {
  const team = state.teams[side];
  const lot = state.phase === "bid" ? state.lot : null;
  const leading = lot?.leader === side;
  return (
    <div
      className={`border bg-surface/85 p-2.5 transition-[box-shadow,border-color] duration-500 ${
        leading ? `border-transparent ${SIDES[side].shadow}` : "border-line/10"
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <SideMark side={side} isBot={isBot} className="h-6 w-6" />
          <span className={`truncate ${FONT} text-sm font-bold uppercase text-ink`}>{name}</span>
        </span>
        <span className={`${FONT} text-base font-bold text-ink`}>{money(team.money)}</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {team.slots.map((s, i) => (
          <span
            key={i}
            title={s.pick?.player.name}
            className={`grid h-6 place-items-center ${FONT} text-[9px] font-bold ${
              s.pick ? POS_STYLE[s.pos] : "text-dim shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--fg-line)_12%,transparent)]"
            }`}
          >
            {s.pick ? s.pick.rating : POS_SHORT[s.pos]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Feed({ state, names }) {
  const lot = state.lot;
  if (!lot) return null;
  const rows = lot.history.slice(0, 4);
  return (
    <div className="w-full space-y-1.5">
      {rows.map((h, i) => (
        <div
          key={`${lot.id}-${lot.history.length - i}`}
          className={`flex items-center justify-between border-b border-line/5 pb-1.5 ${FONT} text-sm ${
            i === 0 ? "text-ink-soft animate-[auIn_0.3s_ease-out_both]" : "text-faint"
          }`}
        >
          <span>
            <span className={`font-bold ${SIDES[h.side].text}`}>{names[h.side]}</span> {tr("təklif etdi")}
          </span>
          <span className="font-bold">{money(h.amount)}</span>
        </div>
      ))}
      <div className={`flex items-center justify-between ${FONT} text-sm text-dim`}>
        <span>{tr("Başlanğıc qiymət")}</span>
        <span>{money(lot.start)}</span>
      </div>
    </div>
  );
}
