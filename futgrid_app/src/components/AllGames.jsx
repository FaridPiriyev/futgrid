import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Play,
  Search,
  Sparkles,
  User,
  Users,
  X,
  Type,
  Route,
  Shirt,
  Link2,
  ListOrdered,
  Triangle,
  Crown,
  Keyboard,
  HelpCircle,
  Grid3x3,
} from "lucide-react";
import { GAME_CATALOG } from "../lib/games/catalog";
import { norm, prefetchData } from "../lib/data";
import AuctionArt from "./games/common/AuctionArt";

import { tr } from "../i18n";
const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";

const BACKGROUND = "/images/background_games.webp";

const STYLE = `
@keyframes agIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
@keyframes agFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
`;

const FILTERS = [
  { key: "all", get label() {
    return tr("Hamısı");
  }, test: () => true },
  { key: "solo", get label() {
    return tr("Tək oyunçu");
  }, test: (g) => g.modes.includes("solo") },
  { key: "duo", get label() {
    return tr("Dostla");
  }, test: (g) => g.modes.includes("duo") },
  { key: "new", get label() {
    return tr("Yeni");
  }, test: (g) => g.isNew },
];

const COVER_ICONS = { wordle: Type, karyera: Route, heyet: Shirt, besklub: Link2, sirala: ListOrdered, piramida: Triangle, goat: Crown, ikiherf: Keyboard, sual: HelpCircle, sekil: Grid3x3 };

const isModeTag = (tag) => tag === tr("Tək oyunçu") || tag === tr("2 oyunçu");

function Cover({ game }) {
  const [broken, setBroken] = useState(false);
  if (game.art === "auction")
    return (
      <AuctionArt className="transition-transform duration-700 ease-out group-hover/tile:scale-105" />
    );
  if (!game.image || broken) {
    const Icon = COVER_ICONS[game.key] ?? Play;
    return (
      <div className="absolute inset-0 grid place-items-center bg-surface-2">
        <Icon className="h-10 w-10 text-accent/70" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={game.image}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover/tile:scale-105"
    />
  );
}

function ModeChips({ modes }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {modes.includes("solo") && (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-line/6 px-2 py-1 ${FONT} text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft`}
        >
          <User className="h-3 w-3" aria-hidden="true" />
          {tr("Tək")}
        </span>
      )}
      {modes.includes("duo") && (
        <span
          className={`inline-flex items-center gap-1 rounded-md bg-accent/12 px-2 py-1 ${FONT} text-[11px] font-bold uppercase tracking-[0.08em] text-accent`}
        >
          <Users className="h-3 w-3" aria-hidden="true" />
          {tr("Dostla")}
        </span>
      )}
    </span>
  );
}

function GameCard({ game, index }) {
  const soon = game.status === "soon";
  const extraTags = game.tags.filter((t) => !isModeTag(t) && t !== game.genre);

  return (
    <li
      className="animate-[agIn_0.5s_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <Link
        to={game.href}
        className="group/tile flex h-full flex-col overflow-hidden rounded-xl border border-line/10 bg-surface transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_24px_48px_-28px_color-mix(in_srgb,var(--fg-accent)_70%,transparent)] sm:rounded-2xl"
      >
        <div
          data-theme="dark"
          className="relative aspect-16/10 w-full shrink-0 overflow-hidden bg-surface-2"
        >
          <Cover game={game} />
          <div className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent" />
          {(game.isNew || soon) && (
            <span
              className={`absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${FONT} text-[10px] font-bold uppercase tracking-wider sm:left-3 sm:top-3 sm:px-2 sm:text-[11px] ${
                soon ? "bg-black/65 text-gold-hi" : "bg-accent text-white"
              }`}
            >
              <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
              {soon ? tr("Tezliklə") : tr("Yeni")}
            </span>
          )}
          <span
            aria-hidden="true"
            className="absolute bottom-3 right-3 z-10 hidden h-10 w-10 place-items-center rounded-full bg-accent text-white opacity-0 transition-[opacity,translate] duration-300 group-hover/tile:translate-y-0 group-hover/tile:opacity-100 sm:grid sm:translate-y-1"
          >
            <Play className="ml-0.5 h-4 w-4 fill-white" />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:gap-2.5 sm:p-5">
          <p
            className={`truncate ${FONT} text-[10px] font-bold uppercase tracking-[0.12em] text-accent sm:text-xs sm:tracking-[0.16em]`}
          >
            {game.genre}
          </p>
          <h2
            className={`${FONT} text-[15px] font-bold uppercase leading-tight text-ink sm:text-[22px]`}
          >
            {game.title}
          </h2>
          <p
            className={`hidden ${BODY} text-[15px] leading-relaxed text-muted sm:line-clamp-3`}
          >
            {game.description}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 sm:pt-2">
            <ModeChips modes={game.modes} />
            {extraTags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={`hidden rounded-md border border-line/10 px-2 py-[3px] ${FONT} text-[11px] font-semibold uppercase tracking-[0.06em] text-muted sm:inline-block`}
              >
                {tag}
              </span>
            ))}
          </div>

          <span
            className={`hidden items-center gap-2 border-t border-line/8 pt-3.5 ${FONT} text-sm font-bold uppercase tracking-[0.1em] text-accent sm:mt-1 sm:flex`}
          >
            {tr("Oyna")}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/tile:translate-x-1" />
          </span>
        </div>
      </Link>
    </li>
  );
}

function Header({ total }) {
  return (
    <section className="relative overflow-hidden bg-page-2 pb-8 pt-8 md:pb-12 md:pt-16 lg:pt-36">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: `url(${BACKGROUND})` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-page/80 light:bg-page/90" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b from-page from-30% via-page/80 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-transparent to-page"
      />

      <div className="relative z-10 mx-auto max-w-330 px-4 md:px-6">
        <nav
          aria-label={tr("Səhifə yolu")}
          className={`flex items-center gap-2 ${FONT} text-xs uppercase tracking-[0.18em] text-faint animate-[agFade_0.5s_ease-out_both] md:text-sm`}
        >
          <Link to="/" className="transition-colors duration-300 hover:text-ink">
            {tr("Ana səhifə")}
          </Link>
          <span className="text-accent">/</span>
          <span className="text-muted">{tr("Oyunlar")}</span>
        </nav>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 md:mt-8">
          <div className="max-w-2xl animate-[agFade_0.6s_ease-out_0.1s_both]">
            <p
              className={`${FONT} text-sm font-bold uppercase tracking-[0.16em] text-accent md:text-base`}
            >
              {tr("Oyun kolleksiyası")}
            </p>
            <h1
              className={`mt-2 ${FONT} text-[44px] font-extrabold uppercase leading-none text-ink md:text-[64px]`}
            >
              {tr("Bütün oyunlar")}
            </h1>
            <p
              className={`mt-4 ${BODY} text-base leading-relaxed text-muted md:text-lg`}
            >
              {tr("Futbol biliyini fərqli formatlarda sına: tək oyna, dostunla yarış, yeni oyunlar gəldikcə ilk sən kəşf et.")}
            </p>
          </div>
          <div className="flex gap-8 animate-[agFade_0.6s_ease-out_0.2s_both]">
            <div>
              <p className={`${FONT} text-4xl font-extrabold leading-none text-ink`}>{total}</p>
              <p className={`mt-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.14em] text-muted`}>
                {tr("oyun")}
              </p>
            </div>
            <div className="border-l border-line/12 pl-8">
              <p className={`${FONT} text-4xl font-extrabold leading-none text-ink`}>
                {GAME_CATALOG.filter((g) => g.modes.includes("duo")).length}
              </p>
              <p className={`mt-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.14em] text-muted`}>
                {tr("dostla oynanır")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AllGames() {
  useEffect(() => prefetchData(), []);
  const [query, setQuery] = useState("");
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get("filter");
  const filter = FILTERS.some((f) => f.key === fromUrl) ? fromUrl : "all";
  const setFilter = (key) =>
    setParams(key === "all" ? {} : { filter: key }, { replace: true, preventScrollReset: true });
  const q = norm(query.trim());
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const list = GAME_CATALOG.filter(
    (g) =>
      active.test(g) &&
      (!q ||
        norm(`${g.title} ${g.genre} ${g.description} ${g.tags.join(" ")}`).includes(q)),
  );

  return (
    <main className="bg-page">
      <style>{STYLE}</style>
      <Header total={GAME_CATALOG.length} />

      <section className="relative pb-16 md:pb-24">
        <div className="relative z-10 mx-auto max-w-330 px-4 md:px-6">
          <div className="flex flex-col gap-3 animate-[agFade_0.5s_ease-out_0.25s_both] md:flex-row md:items-center md:justify-between">
            <div
              role="group"
              aria-label={tr("Oyunları süz")}
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
            >
              {FILTERS.map((f) => {
                const on = f.key === filter;
                const count = GAME_CATALOG.filter(f.test).length;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    aria-pressed={on}
                    className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 ${FONT} text-sm font-bold uppercase tracking-[0.08em] transition-colors duration-200 ${
                      on
                        ? "border-accent bg-accent text-white"
                        : "border-line/15 bg-surface text-ink-soft hover:border-line/40 hover:text-ink"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`rounded-full px-1.5 text-xs ${on ? "bg-white/20" : "bg-line/8 text-muted"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="relative flex h-11 w-full items-center rounded-full border border-line/15 bg-surface transition-colors duration-300 focus-within:border-accent md:max-w-sm">
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-faint" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr("Oyun axtar...")}
                aria-label={tr("Oyun axtar")}
                className={`h-full w-full rounded-full bg-transparent pl-11 pr-11 ${BODY} text-sm text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden`}
              />
              {query && (
                <button
                  type="button"
                  aria-label={tr("Axtarışı təmizlə")}
                  onClick={() => setQuery("")}
                  className="absolute right-1 grid h-9 w-9 place-items-center rounded-full text-faint transition-colors duration-300 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>

          {list.length ? (
            <ul
              key={`${filter}-${q}`}
              className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:mt-8 lg:grid-cols-3"
            >
              {list.map((g, i) => (
                <GameCard key={g.key} game={g} index={i} />
              ))}
            </ul>
          ) : (
            <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-line/15 px-6 py-16 text-center animate-[agFade_0.5s_ease-out_both]">
              <Search className="h-8 w-8 text-faint" />
              <p className={`mt-4 ${FONT} text-xl font-bold uppercase text-ink`}>
                {tr("Heç nə tapılmadı")}
              </p>
              <p className={`mt-2 ${BODY} text-sm text-muted`}>
                {q
                  ? tr("“{query}” üzrə oyun yoxdur. Başqa söz yoxla.", { query })
                  : tr("Bu filtrdə oyun yoxdur.")}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
