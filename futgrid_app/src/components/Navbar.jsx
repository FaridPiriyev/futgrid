import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Globe, ChevronDown, ChevronRight } from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import ThemeToggle from "./ThemeToggle";

const LEFT_LINKS = [
  { key: "home", label: "Ana Səhifə", id: null },
  { key: "about", label: "Haqqımızda", id: "about" },
  { key: "games", label: "Oyunlar", id: "games" },
];

const RIGHT_LINKS = [
  { key: "leaderboard", label: "Reytinq", id: "leaderboard" },
  { key: "contact", label: "Əlaqə", id: "contact" },
  { key: "login", label: "Hesab", id: "login" },
];

const ALL_LINKS = [...LEFT_LINKS, ...RIGHT_LINKS];
const SECTION_IDS = ["about", "games", "leaderboard", "contact"];

const SOCIALS = [
  { Icon: FaInstagram, href: "#", label: "Instagram" },
  { Icon: FaTiktok, href: "#", label: "TikTok" },
  { Icon: FaYoutube, href: "#", label: "YouTube" },
];

const LANGUAGES = ["AZ", "EN", "RU"];

const linkBase =
  "font-['Roboto_Condensed',sans-serif] text-[15px] font-bold uppercase tracking-wide transition-colors duration-300";

const stickyLink =
  "font-['Roboto',sans-serif] text-[17px] font-medium transition-colors duration-300";

const SCROLL_THRESHOLD = 0;

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
      className={`${linkBase} ${
        active
          ? "text-blue-500 [text-shadow:0_0_14px_rgba(59,130,246,0.55)]"
          : "text-neutral-400 hover:text-white"
      }`}
    >
      {link.label}
    </a>
  );
}

function Burger({ open, onClick, className = "" }) {
  const bar =
    "absolute right-0 h-0.5 rounded-full bg-blue-500 transition-all duration-300 ease-out motion-reduce:transition-none";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Menyunu bağla" : "Menyunu aç"}
      aria-expanded={open}
      className={`relative flex h-11 w-11 items-center justify-center md:hidden ${className}`}
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
            className="text-neutral-400 transition-colors hover:text-white"
          >
            <Icon className="h-4.5 w-4.5" />
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex overflow-hidden rounded-md border border-white/10"
          role="group"
          aria-label="Dil"
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
                  ? "bg-blue-500 text-white"
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
        <ThemeToggle
          tabIndex={tab}
          className="h-8 w-8 rounded-md border border-white/10 hover:bg-white/5"
        />
      </div>
    </div>
  );
}

function MobileMenu({ open, active, onGo, extras = null }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none md:hidden ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <nav className="border-t border-white/10 bg-black px-4 pb-4 pt-1">
          {ALL_LINKS.map((link) => {
            const on = active === link.key;
            return (
              <a
                key={link.key}
                href={hrefOf(link)}
                tabIndex={open ? 0 : -1}
                onClick={(e) => onGo(link, e)}
                aria-current={on ? "page" : undefined}
                className={`flex items-center justify-between border-b border-white/5 py-3.5 font-['Roboto_Condensed',sans-serif] text-lg font-bold uppercase tracking-wide transition-colors duration-200 ${
                  on ? "text-blue-500" : "text-neutral-300 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-5 w-0.5 rounded-full transition-colors duration-200 ${
                      on ? "bg-blue-500" : "bg-white/10"
                    }`}
                  />
                  {link.label}
                </span>
                <ChevronRight
                  className={`h-4 w-4 ${on ? "text-blue-500" : "text-neutral-600"}`}
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
        className="flex items-center gap-1 text-xs font-semibold text-neutral-400 transition-colors hover:text-white"
        aria-label="Dili dəyiş"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        <span>{language}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="absolute right-0 top-full z-70 mt-3 min-w-18 overflow-hidden rounded-lg border border-neutral-800 bg-[#0b0909] py-1 shadow-xl">
          {LANGUAGES.map((lang) => (
            <li key={lang}>
              <button
                type="button"
                onClick={() => {
                  setLanguage(lang);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-neutral-800 hover:text-white ${
                  lang === language ? "text-blue-400" : "text-neutral-400"
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
  const [language, setLanguage] = useState("AZ");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
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

  const logoLink = (className, imgClassName) => (
    <a
      href="/"
      onClick={(e) => go(LEFT_LINKS[0], e)}
      className={className}
      aria-label="FutGrid ana səhifə"
    >
      <img
        src="/logo.png"
        alt="FutGrid Logo"
        className={`w-auto object-contain mix-blend-screen ${imgClassName}`}
      />
    </a>
  );

  return (
    <>
      <div
        aria-hidden={!scrolled}
        className={`fixed inset-x-0 top-0 z-60 bg-black shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-[transform,opacity,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
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
            "h-15 md:h-19",
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
                      ? "text-blue-500"
                      : "text-white hover:text-blue-400"
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
          className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-blue-500 transition-transform duration-700 motion-reduce:transition-none ${
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

      <header className="relative z-50 w-full select-none">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@700&family=Roboto:wght@400;500&display=swap');`}</style>

        <div className="pointer-events-none absolute inset-0 z-0 hidden md:block">
          <div
            className="absolute left-0 top-0 h-32.5 w-full bg-[#0b0909]"
            style={{
              clipPath:
                "polygon(0 0, 100% 0, 100% 60px, calc(50% + 220px) 60px, 50% 130px, calc(50% - 220px) 60px, 0 60px)",
            }}
          />
          <div
            className="absolute left-0 top-0 -z-10 h-52.5 w-full bg-[#000000] shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
            style={{
              clipPath:
                "polygon(0 0, 100% 0, 100% 140px, calc(50% + 220px) 140px, 50% 210px, calc(50% - 220px) 140px, 0 140px)",
            }}
          />
        </div>

        <div className="relative z-20 h-11 border-b border-white/5 bg-[#0b0909] md:h-15 md:border-0 md:bg-transparent">
          <div className="mx-auto flex h-full max-w-330 items-center justify-between px-4 md:px-6">
            <span className="hidden font-['Roboto',sans-serif] text-sm text-neutral-400 md:inline">
              Welcome to FutGrid tactical hub
            </span>

            <div className="flex items-center gap-4 md:hidden">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="text-neutral-400 transition-colors hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-5 md:gap-7">
              <LanguageMenu language={language} setLanguage={setLanguage} />
              <span className="h-4 w-px bg-white/10 md:hidden" />
              <ThemeToggle className="h-6 w-6" />
              {SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="hidden text-white transition-opacity hover:opacity-70 md:block"
                >
                  <Icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex h-18 items-center bg-black md:h-20 md:bg-transparent">
          <div className="mx-auto flex w-full max-w-330 items-center justify-between px-4 md:px-6">
            {logoLink("block md:hidden", "h-15")}

            <nav className="hidden w-[40%] items-center justify-start gap-12 md:flex lg:gap-20">
              {LEFT_LINKS.map((l) => (
                <NavLink
                  key={l.key}
                  link={l}
                  active={active === l.key}
                  onGo={go}
                />
              ))}
            </nav>

            <nav className="hidden w-[40%] items-center justify-end gap-12 md:flex lg:gap-20">
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
            />
          </div>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-blue-500/60 to-transparent md:hidden"
          />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-8.75 z-30 hidden -translate-x-1/2 justify-center md:flex">
          {logoLink(
            "pointer-events-auto block transition-transform hover:scale-105",
            "drop-shadow-[0_0_15px_rgba(0,229,255,0.4)] md:h-16 lg:h-23",
          )}
        </div>

        <div className="relative z-20">
          <MobileMenu
            open={isMobileMenuOpen && !scrolled}
            active={active}
            onGo={go}
          />
        </div>
      </header>
    </>
  );
}
