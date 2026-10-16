import React, { useState, useEffect, useRef } from "react";
import { Globe, Menu, X, Sun, Moon, ChevronDown } from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";

const LEFT_LINKS = [
  { label: "Ana Səhifə", href: "#", active: true },
  { label: "Haqqımızda", href: "#about" },
  { label: "Oyunlar", href: "#games" },
];

const RIGHT_LINKS = [
  { label: "Reytinq", href: "#leaderboard" },
  { label: "Əlaqə", href: "#contact" },
  { label: "Hesab", href: "#login" },
];

const SOCIALS = [
  { Icon: FaInstagram, href: "#", label: "Instagram" },
  { Icon: FaTiktok, href: "#", label: "TikTok" },
  { Icon: FaYoutube, href: "#", label: "YouTube" },
];

const LANGUAGES = ["AZ", "EN", "RU"];

const linkBase =
  "font-['Roboto_Condensed',sans-serif] text-[15px] font-bold uppercase tracking-wide transition-colors";

const stickyLink =
  "font-['Roboto',sans-serif] text-[17px] font-medium transition-colors";

const SCROLL_THRESHOLD = 0;

function NavLink({ label, href, active }) {
  return (
    <a
      href={href}
      className={`${linkBase} ${
        active
          ? "text-white [text-shadow:1px_0_#00e5ff,-1px_0_#ff2d55]"
          : "text-neutral-400 hover:text-white"
      }`}
    >
      {label}
    </a>
  );
}

export default function Navbar() {
  const [language, setLanguage] = useState("AZ");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [scrolled]);

  const stickyLinks = [...LEFT_LINKS, ...RIGHT_LINKS];

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
          <a
            href="#"
            className={`block transition-all duration-500 motion-reduce:transition-none ${
              scrolled
                ? "translate-x-0 opacity-100 delay-150"
                : "-translate-x-4 opacity-0"
            }`}
          >
            <img
              src="/logo3.png"
              alt="FutGrid Logo"
              className="h-8 w-auto object-contain mix-blend-screen md:h-11"
            />
          </a>

          <nav className="hidden items-center gap-10 md:flex">
            {stickyLinks.map((l, i) => (
              <span
                key={l.label}
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
                  href={l.href}
                  className={`${stickyLink} ${
                    l.active
                      ? "text-blue-500"
                      : "text-white hover:text-blue-400"
                  }`}
                >
                  {l.label}
                </a>
              </span>
            ))}
          </nav>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 text-white transition-all duration-500 motion-reduce:transition-none md:hidden ${
              scrolled
                ? "translate-x-0 opacity-100 delay-150"
                : "translate-x-4 opacity-0"
            }`}
            aria-label="Menyu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        <span
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-blue-500 transition-transform duration-700 motion-reduce:transition-none ${
            scrolled ? "scale-x-100 delay-300" : "scale-x-0"
          }`}
        />

        {isMobileMenuOpen && scrolled && (
          <div className="flex flex-col gap-3 border-t border-neutral-800 bg-black px-6 py-4 text-center md:hidden">
            {stickyLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`${stickyLink} py-1 ${
                  l.active ? "text-blue-500" : "text-white hover:text-blue-400"
                }`}
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
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
                "polygon(0 60px, calc(50% - 220px) 60px, 50% 130px, calc(50% + 220px) 60px, 100% 60px, 100% 140px, calc(50% + 220px) 140px, 50% 210px, calc(50% - 220px) 140px, 0 140px)",
            }}
          />
        </div>

        <div className="relative z-20 h-14 bg-[#0b0909] md:h-15 md:bg-transparent">
          <div className="mx-auto flex h-full max-w-330 items-center justify-between px-4 md:px-6">
            <span className="hidden font-['Roboto',sans-serif] text-sm text-neutral-400 md:inline">
              Welcome to FutGrid tactical hub
            </span>

            <div className="ml-auto flex items-center gap-5 md:gap-7">
              <div ref={langRef} className="relative">
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-1 text-xs font-semibold text-neutral-400 transition-colors hover:text-white"
                  aria-label="Dili dəyiş"
                  aria-expanded={isLangOpen}
                >
                  <Globe className="h-4 w-4" />
                  <span>{language}</span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      isLangOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isLangOpen && (
                  <ul className="absolute right-0 top-full z-50 mt-3 min-w-18 overflow-hidden rounded-lg border border-neutral-800 bg-[#0b0909] py-1 shadow-xl">
                    {LANGUAGES.map((lang) => (
                      <li key={lang}>
                        <button
                          onClick={() => {
                            setLanguage(lang);
                            setIsLangOpen(false);
                          }}
                          className={`block w-full px-4 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-neutral-800 hover:text-white ${
                            lang === language
                              ? "text-cyan-400"
                              : "text-neutral-400"
                          }`}
                        >
                          {lang}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="text-neutral-400 transition-colors hover:text-white"
                aria-label={isDarkMode ? "Light rejim" : "Dark rejim"}
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-400" />
                )}
              </button>

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

        <div className="relative z-10 flex h-14 items-center bg-black md:h-20 md:bg-transparent">
          <div className="mx-auto flex w-full max-w-330 items-center justify-between px-4 md:px-6">
            <nav className="hidden w-[40%] items-center justify-start gap-12 lg:gap-20 md:flex">
              {LEFT_LINKS.map((l) => (
                <NavLink key={l.label} {...l} />
              ))}
            </nav>

            <nav className="hidden w-[40%] items-center justify-end gap-12 lg:gap-20 md:flex">
              {RIGHT_LINKS.map((l) => (
                <NavLink key={l.label} {...l} />
              ))}
            </nav>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="ml-auto p-2 text-white md:hidden"
              aria-label="Menyu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1.5 z-30 flex -translate-x-1/2 justify-center md:top-8.75">
          <a
            href="#"
            className="pointer-events-auto block transition-transform hover:scale-105"
          >
            <img
              src="/logo3.png"
              alt="FutGrid Logo"
              className="h-3 w-auto object-contain mix-blend-screen drop-shadow-[0_0_15px_rgba(0,229,255,0.4)] md:h-6.25 lg:h-10"
            />
          </a>
        </div>

        {isMobileMenuOpen && !scrolled && (
          <div className="relative z-20 flex flex-col gap-4 bg-black px-6 py-5 text-center md:hidden border-t border-neutral-800">
            {stickyLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`${linkBase} py-1 ${
                  l.active ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex justify-center gap-6 text-white">
              {SOCIALS.map(({ Icon, href, label }) => (
                <a key={label} href={href} aria-label={label}>
                  <Icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
