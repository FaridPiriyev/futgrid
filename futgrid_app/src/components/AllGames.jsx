import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, Play, Search, Sparkles, User, Users, X } from "lucide-react";
import { GAME_CATALOG } from "../lib/games/catalog";
import { norm } from "../lib/data";
import AuctionArt from "./games/common/AuctionArt";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";

const BACKGROUND = "/images/background_games.jpg";

const STYLE = `
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap");
@keyframes agIn { from { opacity: 0; transform: translateY(28px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes agUp { from { transform: translateY(105%); } to { transform: none; } }
@keyframes agFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes agLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes agGrid { from { background-position: 0 0; } to { background-position: 0 48px; } }
@keyframes agDrift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.15); } }
@keyframes agShine { 0% { transform: translateX(0) skewX(-14deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateX(480%) skewX(-14deg); opacity: 0; } }
@keyframes agBlink { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
@keyframes agPulse { 0% { transform: scale(.9); opacity: .8; } 100% { transform: scale(1.7); opacity: 0; } }
`;

const SHINE =
  "pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent opacity-0";

const canTilt = () =>
  window.matchMedia(
    "(hover: hover) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)",
  ).matches;

function ModeIcons({ modes }) {
  return (
    <span className="flex items-center gap-1.5 text-faint">
      {modes.includes("solo") && (
        <span title="Tək oyunçu" className="grid h-7 w-7 place-items-center border border-line/10">
          <User className="h-3.5 w-3.5" />
        </span>
      )}
      {modes.includes("duo") && (
        <span title="2 oyunçu" className="grid h-7 w-7 place-items-center border border-line/10">
          <Users className="h-3.5 w-3.5" />
        </span>
      )}
    </span>
  );
}

function Cover({ game, soon }) {
  if (game.art === "auction")
    return (
      <AuctionArt className="transition-transform duration-700 ease-out group-hover/tile:scale-105" />
    );
  return (
    <img
      src={game.image}
      alt=""
      loading="lazy"
      className={`absolute inset-0 h-full w-full object-cover transition-[transform,filter] duration-700 ease-out group-hover/tile:scale-110 ${
        soon ? "brightness-75 grayscale-[0.7] group-hover/tile:grayscale-0" : ""
      }`}
    />
  );
}

function GameTile({ game, index }) {
  const ref = useRef(null);
  const soon = game.status === "soon";

  const onMove = (e) => {
    if (!canTilt()) return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-6px)`;
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    ref.current.style.transform = "";
  };

  return (
    <div
      className="h-full animate-[agIn_0.7s_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <Link
        ref={ref}
        to={game.href}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="group/tile relative flex h-full flex-col overflow-hidden border border-line/10 bg-surface transition-[transform,border-color,box-shadow] duration-300 ease-out will-change-transform hover:border-blue-500/60 hover:shadow-[0_24px_60px_-28px_rgba(59,130,246,0.75)] active:scale-[0.98]"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(59,130,246,0.14), transparent 45%)",
          }}
        />

        <div className="relative aspect-16/10 shrink-0 overflow-hidden bg-[#070a12]">
          <Cover game={game} soon={soon} />
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />
          <span
            aria-hidden="true"
            className={`${SHINE} group-hover/tile:animate-[agShine_0.9s_ease-out_1_both]`}
          />
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 md:left-4 md:top-4">
            {soon && (
              <span
                className={`inline-flex items-center gap-1.5 border border-amber-300/40 bg-black/60 px-2 py-1 ${FONT} text-[11px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur-sm`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-[agBlink_1.6s_ease-in-out_infinite]" />
                Tezliklə
              </span>
            )}
            {game.isNew && (
              <span
                className={`inline-flex items-center gap-1 bg-blue-500 px-2 py-1 ${FONT} text-[11px] font-bold uppercase tracking-wider text-white`}
              >
                <Sparkles className="h-3 w-3" />
                Yeni
              </span>
            )}
          </div>
          <span
            className={`absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center transition-transform duration-300 group-hover/tile:scale-110 md:right-4 md:top-4 ${
              soon
                ? "border border-white/20 bg-black/50 text-white backdrop-blur-sm"
                : "bg-blue-500 text-white"
            }`}
          >
            {!soon && (
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-blue-500/60 animate-[agPulse_2.2s_ease-out_infinite] motion-reduce:hidden"
              />
            )}
            {soon ? (
              <Bell className="relative h-4 w-4" />
            ) : (
              <Play className="relative h-4 w-4 fill-white" />
            )}
          </span>
        </div>

        <div className="relative z-10 flex flex-1 flex-col p-5 md:p-6">
          <p className={`${FONT} text-xs uppercase tracking-[0.2em] text-blue-500`}>
            {game.genre}
          </p>
          <h3
            className={`mt-1 ${FONT} text-2xl font-bold uppercase leading-tight text-ink`}
          >
            {game.title}
          </h3>
          <p
            className={`mt-2 line-clamp-3 min-h-[4.1em] ${BODY} text-sm leading-relaxed text-muted`}
          >
            {game.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className={`border border-line/15 px-2 py-0.5 ${FONT} text-[11px] uppercase tracking-wider text-muted`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between gap-3 border-t border-line/10 pt-4">
              {soon ? (
                <span
                  className={`${FONT} text-sm font-bold uppercase tracking-wide text-faint`}
                >
                  Hazırlanır
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-2 ${FONT} text-sm font-bold uppercase tracking-wide text-blue-500`}
                >
                  Oyna
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/tile:translate-x-1.5" />
                </span>
              )}
              <ModeIcons modes={game.modes} />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function Header() {
  return (
    <section className="relative overflow-hidden bg-page-2 pb-10 pt-28 md:pb-14 md:pt-36">
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-110 bg-cover bg-center"
        style={{ backgroundImage: `url(${BACKGROUND})` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-page/80 light:bg-page/90" />
      <div
        aria-hidden="true"
        className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-blue-600/25 blur-[90px] animate-[agDrift_14s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-sky-500/15 blur-[90px] animate-[agDrift_18s_ease-in-out_infinite_reverse] motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 animate-[agGrid_2.5s_linear_infinite] opacity-25 mask-[linear-gradient(to_top,black,transparent)] motion-reduce:animate-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.45) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          transform: "perspective(420px) rotateX(58deg)",
          transformOrigin: "bottom",
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-blue-500" />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-page"
      />

      <div className="relative z-10 mx-auto max-w-330 px-4 md:px-6">
        <nav
          aria-label="Səhifə yolu"
          className={`flex items-center gap-2 ${FONT} text-xs uppercase tracking-[0.18em] text-faint animate-[agFade_0.6s_ease-out_both] md:text-sm`}
        >
          <Link to="/" className="transition-colors duration-300 hover:text-ink">
            Ana səhifə
          </Link>
          <span className="text-blue-500">/</span>
          <span className="text-muted">Oyunlar</span>
        </nav>

        <div className="mt-6 flex items-center gap-3 md:mt-8">
          <span className="h-px w-10 origin-left bg-blue-500 animate-[agLine_0.8s_ease-out_0.1s_both] md:w-16" />
          <p
            className={`${FONT} text-base uppercase tracking-wider text-blue-500 animate-[agFade_0.6s_ease-out_0.2s_both] md:text-xl`}
          >
            Oyun kolleksiyası
          </p>
        </div>
        <h1
          className={`mt-1 overflow-hidden py-[0.08em] ${FONT} text-5xl font-bold uppercase leading-none text-ink md:text-[84px]`}
        >
          <span className="block animate-[agUp_0.9s_cubic-bezier(.2,.8,.2,1)_0.15s_both] motion-reduce:animate-none">
            Bütün oyunlar
          </span>
        </h1>
        <p
          className={`mt-4 max-w-2xl ${FONT} text-base font-light leading-7 text-muted animate-[agFade_0.7s_ease-out_0.35s_both] md:text-lg md:leading-8`}
        >
          Futbol biliyini fərqli formatlarda sına: tək oyna, dostunla yarış, yeni
          oyunlar gəldikcə ilk sən kəşf et.
        </p>
      </div>
    </section>
  );
}

export default function AllGames() {
  const [query, setQuery] = useState("");
  const q = norm(query.trim());
  const list = GAME_CATALOG.filter(
    (g) =>
      !q ||
      norm(`${g.title} ${g.genre} ${g.description} ${g.tags.join(" ")}`).includes(q),
  );

  return (
    <main className="bg-page">
      <style>{STYLE}</style>
      <Header />

      <section className="relative pb-16 md:pb-24">
        <div className="relative z-10 mx-auto max-w-330 px-4 md:px-6">
          <label className="relative flex h-12 w-full items-center border border-line/10 bg-surface/70 backdrop-blur-sm transition-colors duration-300 animate-[agFade_0.6s_ease-out_0.45s_both] focus-within:border-blue-500 md:max-w-md">
            <Search className="pointer-events-none absolute left-4 h-4 w-4 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Oyun axtar..."
              aria-label="Oyun axtar"
              className={`h-full w-full bg-transparent pl-11 pr-11 ${BODY} text-sm text-ink outline-none placeholder:text-faint`}
            />
            {query && (
              <button
                type="button"
                aria-label="Axtarışı təmizlə"
                onClick={() => setQuery("")}
                className="absolute right-2 grid h-8 w-8 place-items-center text-faint transition-colors duration-300 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          {list.length ? (
            <div
              key={q}
              className="mt-8 grid auto-rows-fr gap-4 sm:grid-cols-2 md:mt-10 md:gap-6 lg:grid-cols-3"
            >
              {list.map((g, i) => (
                <GameTile key={g.key} game={g} index={i} />
              ))}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center border border-dashed border-line/15 px-6 py-16 text-center animate-[agFade_0.5s_ease-out_both]">
              <Search className="h-8 w-8 text-faint" />
              <p className={`mt-4 ${FONT} text-xl font-bold uppercase text-ink`}>
                Heç nə tapılmadı
              </p>
              <p className={`mt-2 ${BODY} text-sm text-muted`}>
                “{query}” üzrə oyun yoxdur. Başqa söz yoxla.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
