import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Globe, ChevronDown, ChevronRight } from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import ThemeToggle from "./ThemeToggle";
import { LANGS, useLang } from "../i18n";

import { tr } from "../i18n";
const LEFT_LINKS = [
  { key: "home", get label() {
    return tr("Ana Səhifə");
  }, id: null },
  { key: "about", get label() {
    return tr("Haqqımızda");
  }, id: "about" },
  { key: "games", get label() {
    return tr("Oyunlar");
  }, id: "games" },
];

const RIGHT_LINKS = [
  { key: "leaderboard", get label() {
    return tr("Reytinq");
  }, id: "leaderboard" },
  { key: "contact", get label() {
    return tr("Əlaqə");
  }, id: "contact" },
  { key: "login", get label() {
    return tr("Hesab");
  }, id: "login" },
];

const ALL_LINKS = [...LEFT_LINKS, ...RIGHT_LINKS];
const SECTION_IDS = ["about", "games", "leaderboard", "contact"];

const SOCIALS = [
  { Icon: FaInstagram, href: "#", get label() {
    return tr("Instagram");
  } },
  { Icon: FaTiktok, href: "#", get label() {
    return tr("TikTok");
  } },
  { Icon: FaYoutube, href: "#", get label() {
    return tr("YouTube");
  } },
];

const LANGUAGES = LANGS.map((l) => l.label);

const linkBase =
  "font-['Roboto_Condensed',sans-serif] whitespace-nowrap text-[13px] font-bold uppercase tracking-wide transition-colors duration-300 xl:text-[15px]";

const stickyLink =
  "font-['Roboto',sans-serif] text-[17px] font-medium transition-colors duration-300";

const SHIELD_CLIP =
  "polygon(calc(50% - var(--sh) - 26px) 0, calc(50% + var(--sh) + 26px) 0, calc(50% + var(--sh)) 140px, 50% 210px, calc(50% - var(--sh)) 140px)";

const hrefOf = (link) => (link.id ? `/#${link.id}` : "/");
const navOffset = () => (window.innerWidth >= 768 ? 90 : 64);

function useActiveSection(pathname) {
  const [active, setActive] = useState("home");

  useEffect(() => {
    if (pathname.startsWith("/oyunlar")) {
      setActive("games");
      return;
    }
    if (pathname !== "/") {
      setActive(null);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = navOffset() + window.innerHeight * 0.3;
      let current = "home";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom && window.scrollY > 0) {
        const last = [...SECTION_IDS]
          .reverse()
          .find((id) => document.getElementById(id));
        if (last) current = last;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    const late = setTimeout(update, 400);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      clearTimeout(late);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return active;
}

function NavLink({ link, active, onGo }) {
  return (
    <a
      href={hrefOf(link)}
      onClick={(e) => onGo(link, e)}
      aria-current={active ? "page" : undefined}
      className={`fg-navlink ${linkBase} ${
        active ? "text-accent" : "text-nav-ink hover:text-accent"
      }`}
    >
      {link.label}
    </a>
  );
}

function Burger({ open, onClick, className = "", hideAt = "md:hidden" }) {
  const bar =
    "absolute right-0 h-0.5 rounded-full bg-accent transition-all duration-300 ease-out motion-reduce:transition-none";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? tr("Menyunu bağla") : tr("Menyunu aç")}
      aria-expanded={open}
      className={`relative flex h-11 w-11 items-center justify-center ${hideAt} ${className}`}
    >
      <span className="relative block h-4.5 w-7">
        <span
          className={`${bar} w-7 ${
            open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
          }`}
        />
        <span
          className={`${bar} top-1/2 w-7 -translate-y-1/2 ${
            open ? "scale-x-0 opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`${bar} ${
            open ? "top-1/2 w-7 -translate-y-1/2 -rotate-45" : "bottom-0 w-4"
          }`}
        />
      </span>
    </button>
  );
}

function MenuExtras({ open, language, setLanguage }) {
  const tab = open ? 0 : -1;
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        {SOCIALS.map(({ Icon, href, label }) => (
          <a
            key={label}
            href={href}
            aria-label={label}
            tabIndex={tab}
            className="text-nav-soft transition-colors hover:text-nav-ink"
          >
            <Icon className="h-4.5 w-4.5" />
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex overflow-hidden rounded-md border border-nav-line"
          role="group"
          aria-label={tr("Dil")}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              tabIndex={tab}
              onClick={() => setLanguage(lang)}
              aria-pressed={lang === language}
              className={`px-2.5 py-1.5 font-['Roboto_Condensed',sans-serif] text-xs font-bold transition-colors ${
                lang === language
                  ? "bg-accent text-white"
                  : "text-nav-soft hover:bg-line/5 hover:text-nav-ink"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
        <ThemeToggle
          tabIndex={tab}
          className="h-8 w-8 rounded-md border border-nav-line hover:bg-line/5"
        />
      </div>
    </div>
  );
}

function MobileMenu({
  open,
  active,
  onGo,
  extras = null,
  hideAt = "md:hidden",
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${hideAt} ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <nav className="border-t border-nav-line bg-nav px-4 pb-4 pt-1 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
          {ALL_LINKS.map((link) => {
            const on = active === link.key;
            return (
              <a
                key={link.key}
                href={hrefOf(link)}
                tabIndex={open ? 0 : -1}
                onClick={(e) => onGo(link, e)}
                aria-current={on ? "page" : undefined}
                className={`flex items-center justify-between border-b border-nav-line py-3.5 font-['Roboto_Condensed',sans-serif] text-lg font-bold uppercase tracking-wide transition-colors duration-200 ${
                  on ? "text-accent" : "text-ink hover:text-accent"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-5 w-0.5 rounded-full transition-colors duration-200 ${
                      on ? "bg-accent" : "bg-nav-line"
                    }`}
                  />
                  {link.label}
                </span>
                <ChevronRight
                  className={`h-4 w-4 ${on ? "text-accent" : "text-nav-soft"}`}
                />
              </a>
            );
          })}
          {extras}
        </nav>
      </div>
    </div>
  );
}

function LanguageMenu({ language, setLanguage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-semibold text-nav-soft transition-colors hover:text-nav-ink"
        aria-label={tr("Dili dəyiş")}
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        <span>{language}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="absolute right-0 top-full z-70 mt-3 min-w-18 overflow-hidden rounded-lg border border-nav-line bg-nav py-1 shadow-xl">
          {LANGUAGES.map((lang) => (
            <li key={lang}>
              <button
                type="button"
                onClick={() => {
                  setLanguage(lang);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-line/5 hover:text-ink ${
                  lang === language ? "text-accent" : "text-nav-soft"
                }`}
              >
                {lang}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = useActiveSection(pathname);
  const { lang, setLang } = useLang();
  const language = LANGS.find((l) => l.code === lang)?.label ?? "AZ";
  const setLanguage = (label) =>
    setLang(LANGS.find((l) => l.label === label)?.code ?? "az");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      setScrolled(window.scrollY > h);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [scrolled, pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (e) => e.key === "Escape" && setIsMobileMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileMenuOpen]);

  const go = useCallback(
    (link, e) => {
      e.preventDefault();
      setIsMobileMenuOpen(false);
      if (pathname !== "/") {
        navigate(hrefOf(link));
        return;
      }
      if (!link.id) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.replaceState(null, "", "/");
        return;
      }
      const el = document.getElementById(link.id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - navOffset();
      window.scrollTo({ top, behavior: "smooth" });
      window.history.replaceState(null, "", `/#${link.id}`);
    },
    [pathname, navigate],
  );

  const toggleMenu = () => setIsMobileMenuOpen((v) => !v);

  const logoLink = (className, imgClassName, tone = "auto") => (
    <a
      href="/"
      onClick={(e) => go(LEFT_LINKS[0], e)}
      className={className}
      aria-label={tr("FutGrid ana səhifə")}
    >
      <Wordmark tone={tone} className={imgClassName} />
    </a>
  );

  return (
    <>
      <div
        aria-hidden={!scrolled}
        className={`fixed inset-x-0 top-0 z-60 bg-nav shadow-[0_4px_20px_rgba(15,23,42,0.1)] transition-[transform,opacity,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          scrolled
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-330 items-center justify-between px-4 md:h-22.5 md:px-6">
          {logoLink(
            `block transition-all duration-500 motion-reduce:transition-none ${
              scrolled
                ? "translate-x-0 opacity-100 delay-150"
                : "-translate-x-4 opacity-0"
            }`,
            "h-6 md:h-7",
          )}

          <nav className="hidden items-center gap-10 md:flex">
            {ALL_LINKS.map((l, i) => (
              <span
                key={l.key}
                className={`inline-block transition-all duration-500 motion-reduce:transition-none ${
                  scrolled
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-3 opacity-0"
                }`}
                style={{
                  transitionDelay: scrolled ? `${200 + i * 70}ms` : "0ms",
                }}
              >
                <a
                  href={hrefOf(l)}
                  onClick={(e) => go(l, e)}
                  aria-current={active === l.key ? "page" : undefined}
                  className={`${stickyLink} ${
                    active === l.key
                      ? "text-accent"
                      : "text-ink hover:text-accent"
                  }`}
                >
                  {l.label}
                </a>
              </span>
            ))}
          </nav>

          <Burger
            open={isMobileMenuOpen && scrolled}
            onClick={toggleMenu}
            className={`-mr-2 transition-all duration-500 motion-reduce:transition-none ${
              scrolled
                ? "translate-x-0 opacity-100 delay-150"
                : "translate-x-4 opacity-0"
            }`}
          />
        </div>

        <span
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent transition-transform duration-700 motion-reduce:transition-none ${
            scrolled ? "scale-x-100 delay-300" : "scale-x-0"
          }`}
        />

        <MobileMenu
          open={isMobileMenuOpen && scrolled}
          active={active}
          onGo={go}
          extras={
            <MenuExtras
              open={isMobileMenuOpen && scrolled}
              language={language}
              setLanguage={setLanguage}
            />
          }
        />
      </div>

      <header ref={headerRef} className="relative z-50 w-full select-none">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@700&family=Roboto:wght@400;500&display=swap');`}</style>

        <div className="pointer-events-none absolute inset-0 z-0 hidden lg:block">
          <div className="absolute inset-x-0 top-0 h-15 border-b border-nav-line bg-nav-top" />
          <div className="absolute inset-x-0 top-15 h-20 border-b border-nav-line bg-nav shadow-[0_10px_30px_-20px_var(--fg-shadow)]" />
          <div className="fg-drop absolute inset-x-0 top-0 h-52.5">
            <div
              className="absolute left-0 top-0 h-52.5 w-full bg-shield shadow-2xl [--sh:185px]"
              style={{ clipPath: SHIELD_CLIP }}
            />
            <div
              className="fg-halftone-w fg-drift absolute left-0 top-0 h-52.5 w-full opacity-40 [--sh:185px]"
              style={{ clipPath: SHIELD_CLIP }}
            />
            <div
              className="absolute left-0 top-0 h-52.5 w-full bg-yellow [--sh:185px]"
              style={{
                clipPath:
                  "polygon(calc(50% + var(--sh)) 135px, calc(50% + var(--sh)) 140px, 50% 210px, calc(50% - var(--sh)) 140px, calc(50% - var(--sh)) 135px, 50% 205px)",
              }}
            />
          </div>
        </div>

        <div className="relative z-20 h-11 border-b border-nav-line bg-nav-top lg:h-15 lg:border-0 lg:bg-transparent">
          <div className="mx-auto flex h-full max-w-330 items-center justify-between px-4 md:px-6">
            <span className="hidden font-['Roboto',sans-serif] text-sm text-nav-soft lg:inline">
              {tr("Welcome to FutGrid tactical hub")}
            </span>

            <div className="flex items-center gap-4 lg:hidden">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="text-nav-soft transition-colors hover:text-nav-ink"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-5 lg:gap-7">
              <LanguageMenu language={language} setLanguage={setLanguage} />
              <span className="h-4 w-px bg-nav-line lg:hidden" />
              <ThemeToggle className="h-6 w-6" />
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="hidden text-ink transition-colors hover:text-accent lg:block"
                >
                  <Icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-18 items-center border-b border-nav-line bg-nav lg:h-20 lg:border-0 lg:bg-transparent">
          <div className="mx-auto flex w-full max-w-330 items-center justify-between px-4 md:px-6">
            {logoLink(
              "block lg:hidden",
              "h-6 sm:h-7",
            )}

            <nav className="hidden min-w-0 flex-1 items-center justify-start gap-5 lg:flex xl:gap-12 2xl:gap-16">
              {LEFT_LINKS.map((l) => (
                <NavLink
                  key={l.key}
                  link={l}
                  active={active === l.key}
                  onGo={go}
                />
              ))}
            </nav>

            <span
              aria-hidden="true"
              className="hidden w-100 shrink-0 lg:block"
            />

            <nav className="hidden min-w-0 flex-1 items-center justify-end gap-5 lg:flex xl:gap-12 2xl:gap-16">
              {RIGHT_LINKS.map((l) => (
                <NavLink
                  key={l.key}
                  link={l}
                  active={active === l.key}
                  onGo={go}
                />
              ))}
            </nav>

            <Burger
              open={isMobileMenuOpen && !scrolled}
              onClick={toggleMenu}
              className="-mr-2"
              hideAt="lg:hidden"
            />
          </div>
        </div>

        <div className="fg-pop pointer-events-none absolute left-1/2 top-8.75 z-30 hidden -translate-x-1/2 justify-center [animation-delay:.5s] lg:flex">
          {logoLink(
            "pointer-events-auto block px-4 pt-5 transition-transform hover:scale-105",
            "lg:h-10 xl:h-11",
            "dark",
          )}
        </div>

        <div className="relative z-20">
          <MobileMenu
            open={isMobileMenuOpen && !scrolled}
            active={active}
            onGo={go}
            hideAt="lg:hidden"
          />
        </div>
      </header>
    </>
  );
}

const WM_FUT =
  "M0,0 L26,0 L26,9 L9,9 L9,16 L22,16 L22,25 L9,25 L9,40 L0,40Z M31,0 L40,0 L40,31 L48,31 L48,0 L57,0 L57,34 L51,40 L37,40 L31,34Z M62,0 L88,0 L88,9 L79.5,9 L79.5,40 L70.5,40 L70.5,9 L62,9Z";
const WM_GRID =
  "M99,0 L119,0 L119,9 L102,9 L102,31 L110,31 L110,27 L106,27 L106,19 L119,19 L119,34 L113,40 L99,40 L93,34 L93,6Z M124,0 L144,0 L150,6 L150,19 L145,23.5 L150.5,40 L141,40 L136.5,25.5 L133,25.5 L133,40 L124,40Z M133,8.5 L141,8.5 L141,17 L133,17Z M155.5,0 L164.5,0 L164.5,40 L155.5,40Z M169.5,0 L189.5,0 L195.5,6 L195.5,34 L189.5,40 L169.5,40Z M178.5,9 L186.5,9 L186.5,31 L178.5,31Z";

export function Wordmark({ className = "", tone = "auto" }) {
  const fut = tone === "dark" ? "#ffffff" : "var(--fg-ink)";
  const grid = tone === "dark" ? "#3b7bff" : "var(--fg-accent)";
  return (
    <svg
      viewBox="0 0 205 40"
      role="img"
      aria-label="FutGrid"
      className={`block w-auto ${className}`}
    >
      <g transform="translate(8.5 0) skewX(-12)">
        <path d={WM_FUT} fill={fut} fillRule="evenodd" />
        <path d={WM_GRID} fill={grid} fillRule="evenodd" />
      </g>
    </svg>
  );
}
