import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Mail, MapPin, Phone } from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import { GAME_CATALOG } from "../lib/games/catalog";

const HEAD = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";

const FOOTER_STYLE = `
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Roboto+Condensed:wght@400;700;800;900&display=swap");
@keyframes fgBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes fgRise { 0% { transform: translateY(0); opacity: 1; } 45% { transform: translateY(-26px); opacity: 0; } 46% { transform: translateY(26px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
`;

const FOOTER_NAV_LINKS = [
  { label: "Ana Səhifə", to: "/" },
  { label: "Haqqımızda", to: "/#about" },
  { label: "Oyunlar", to: "/#games" },
  { label: "Reytinq", to: "/#leaderboard" },
  { label: "Əlaqə", to: "/#contact" },
  { label: "Hesab", to: "/#login" },
];

const FOOTER_GAME_LINKS = [
  ...GAME_CATALOG.slice(0, 5).map((g) => ({ label: g.title, to: g.href })),
  { label: "Bütün oyunlar", to: "/oyunlar" },
];

const FOOTER_SOCIALS = [
  { Icon: FaInstagram, href: "#", label: "Instagram" },
  { Icon: FaTiktok, href: "#", label: "TikTok" },
  { Icon: FaYoutube, href: "#", label: "YouTube" },
];

const FOOTER_CONTACT = [
  {
    Icon: Mail,
    label: "E-poçt",
    value: "info@futgrid.az",
    href: "mailto:info@futgrid.az",
  },
  {
    Icon: Phone,
    label: "Telefon",
    value: "+994 50 000 00 00",
    href: "tel:+994500000000",
  },
  {
    Icon: MapPin,
    label: "Ünvan",
    value: "Bakı, Azərbaycan",
    href: "/#contact",
  },
];

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return progress;
}

function FooterLink({ label, to }) {
  return (
    <li>
      <Link
        to={to}
        className={`group inline-flex items-center ${BODY} text-[15px] text-white/85 transition-colors duration-300 hover:text-yellow`}
      >
        <span
          aria-hidden="true"
          className="mr-0 h-0.5 w-0 bg-yellow transition-all duration-300 ease-out group-hover:mr-2 group-hover:w-4"
        />
        {label}
      </Link>
    </li>
  );
}

function FooterTitle({ children }) {
  return (
    <h3
      className={`${HEAD} text-base font-black uppercase tracking-[0.14em] text-yellow`}
    >
      {children}
    </h3>
  );
}

function BackToTop() {
  const progress = useScrollProgress();
  const [launch, setLaunch] = useState(false);

  const scrollTop = () => {
    setLaunch(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setLaunch(false), 900);
  };

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label="Səhifənin yuxarısına qalx"
      className={`group/btn relative inline-flex items-stretch overflow-hidden bg-white ${HEAD} text-sm font-extrabold uppercase tracking-[0.12em] text-navy transition-[translate,background-color] duration-300 hover:-translate-y-0.5 hover:bg-yellow active:translate-y-0`}
    >
      <span className="flex items-center px-5 py-3">Yuxarı qalx</span>
      <span className="relative flex w-11 items-center justify-center overflow-hidden bg-accent text-white">
        <ArrowUp
          className={`h-4.5 w-4.5 ${
            launch
              ? "animate-[fgRise_0.6s_ease-in-out_1]"
              : "animate-[fgBob_1.6s_ease-in-out_infinite] group-hover/btn:animate-[fgRise_0.8s_ease-in-out_infinite] motion-reduce:animate-none"
          }`}
        />
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 bg-accent transition-[width] duration-150"
        style={{ width: `${progress * 100}%` }}
      />
    </button>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      id="footer"
      className="relative z-0 w-full overflow-hidden bg-navy text-white"
    >
      <style>{FOOTER_STYLE}</style>

      <div aria-hidden="true" className="fg-stripe-bar fg-bar-run h-2" />
      <span
        aria-hidden="true"
        className="fg-halftone-w fg-drift pointer-events-none absolute right-0 top-2 h-80 w-1/3 opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]"
      />

      <div className="relative mx-auto max-w-330 px-4 pb-8 pt-14 md:px-6 md:pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1.1fr] lg:gap-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" aria-label="FutGrid" className="inline-block">
              <img
                src="/logo.png"
                alt="FutGrid Logo"
                className="h-14 w-auto object-contain mix-blend-lighten contrast-[1.35] md:h-16"
              />
            </Link>

            <p
              className={`mt-5 ${HEAD} text-sm font-extrabold uppercase tracking-[0.22em] text-yellow`}
            >
              Futbol taktikanı göstər
            </p>
            <p
              className={`${BODY} mt-3 max-w-sm text-[15px] leading-7 text-navy-soft`}
            >
              FutGrid taktiki oyunların, reytinq cədvəllərinin və turnirlərin
              bir yerdə toplandığı platformadır. Oyna, öyrən və liderlər
              cədvəlində yerini tut.
            </p>

            <div className="mt-6 flex items-center gap-3">
              {FOOTER_SOCIALS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="grid h-11 w-11 place-items-center border border-white/20 transition-[translate,background-color,color,border-color] duration-300 hover:-translate-y-1 hover:border-yellow hover:bg-yellow hover:text-on-yellow"
                >
                  <Icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <FooterTitle>Menyu</FooterTitle>
            <ul className="mt-5 flex flex-col gap-3">
              {FOOTER_NAV_LINKS.map((l) => (
                <FooterLink key={l.label} {...l} />
              ))}
            </ul>
          </div>

          <div>
            <FooterTitle>Oyunlar</FooterTitle>
            <ul className="mt-5 flex flex-col gap-3">
              {FOOTER_GAME_LINKS.map((l) => (
                <FooterLink key={l.label} {...l} />
              ))}
            </ul>
          </div>

          <div>
            <FooterTitle>Əlaqə</FooterTitle>
            <div className="mt-5 flex flex-col gap-4">
              {FOOTER_CONTACT.map(({ Icon, label, value, href }) => (
                <a
                  key={value}
                  href={href}
                  className="group flex items-center gap-4"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center bg-white/10 transition-[background-color,color,rotate] duration-300 group-hover:-rotate-8 group-hover:bg-yellow group-hover:text-on-yellow">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block ${HEAD} text-[11px] uppercase tracking-[0.18em] text-navy-soft`}
                    >
                      {label}
                    </span>
                    <span
                      className={`block ${BODY} text-[15px] font-medium transition-colors duration-300 group-hover:text-yellow`}
                    >
                      {value}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <p
          aria-hidden="true"
          className={`fg-outline-w fg-wipe-w mt-12 select-none whitespace-nowrap ${HEAD} text-[clamp(72px,17vw,232px)] font-black leading-[0.8] tracking-[-0.01em] md:mt-16`}
        >
          FUTGRID
        </p>

        <div className="mt-6 flex flex-col items-center justify-between gap-5 border-t border-white/12 pt-6 md:flex-row">
          <p
            className={`${BODY} text-center text-[13px] text-navy-soft md:text-left`}
          >
            © {year} FutGrid. Bütün hüquqlar qorunur.
          </p>

          <div
            className={`${BODY} flex items-center gap-6 text-[13px] text-navy-soft`}
          >
            <a
              href="#"
              className="transition-colors duration-300 hover:text-yellow"
            >
              Məxfilik siyasəti
            </a>
            <a
              href="#"
              className="transition-colors duration-300 hover:text-yellow"
            >
              İstifadə şərtləri
            </a>
          </div>

          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
