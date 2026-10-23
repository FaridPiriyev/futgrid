import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Mail, MapPin, Phone } from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";

const HEAD = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

const FOOTER_STYLE = `
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&family=Roboto+Condensed:wght@400;700&display=swap");
@keyframes fgBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes fgRise { 0% { transform: translateY(0); opacity: 1; } 45% { transform: translateY(-26px); opacity: 0; } 46% { transform: translateY(26px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes fgSpin { to { transform: rotate(360deg); } }
@keyframes fgPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.8; } }
`;

const SWEEP_BLUE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-blue-500 transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

const SWEEP_WHITE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

const FOOTER_NAV_LINKS = [
  { label: "Ana Səhifə", to: "/" },
  { label: "Haqqımızda", to: "/#about" },
  { label: "Oyunlar", to: "/#games" },
  { label: "Reytinq", to: "/#leaderboard" },
  { label: "Əlaqə", to: "/#contact" },
  { label: "Hesab", to: "/#login" },
];

const FOOTER_GAME_LINKS = [
  { label: "Futbol X0X", to: "/oyunlar/futbol-x0x" },
  { label: "Ortaq oyunçu", to: "/oyunlar/ortaq-oyuncu" },
  { label: "Yüksək yoxsa Aşağı?", to: "/oyunlar/yuksek-asagi" },
  { label: "Canlı yayımlar", to: "/#games" },
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
        className={`group inline-flex items-center ${BODY} text-[15px] text-neutral-400 transition-colors duration-300 hover:text-white`}
      >
        <span
          aria-hidden="true"
          className="mr-0 h-0.5 w-0 bg-blue-500 transition-all duration-300 ease-out group-hover:mr-2 group-hover:w-4"
        />
        {label}
      </Link>
    </li>
  );
}

function FooterTitle({ children }) {
  return (
    <h3
      className={`${HEAD} text-lg font-bold uppercase tracking-[0.12em] text-white`}
    >
      {children}
      <span aria-hidden="true" className="mt-3 block h-0.5 w-8 bg-blue-500" />
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
      className={`group/btn relative isolate inline-flex items-stretch overflow-hidden bg-blue-500 ${HEAD} text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_-12px_rgba(59,130,246,0.9)] transition-[color,transform] duration-500 hover:-translate-y-0.5 hover:text-blue-500 active:scale-95`}
    >
      <span aria-hidden="true" className={SWEEP_WHITE} />
      <span className="flex items-center px-5 py-3">Yuxarı qalx</span>
      <span className="relative flex w-11 items-center justify-center overflow-hidden border-l border-white/25 bg-black/10">
        <ArrowUp
          className={`h-4.5 w-4.5 ${
            launch
              ? "animate-[fgRise_0.6s_ease-in-out_1]"
              : "animate-[fgBob_1.6s_ease-in-out_infinite] group-hover/btn:animate-[fgRise_0.8s_ease-in-out_infinite]"
          }`}
        />
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 bg-white/70 transition-[width] duration-150 group-hover/btn:bg-blue-500"
        style={{ width: `${progress * 100}%` }}
      />
    </button>
  );
}

function FooterDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[#07090f]" />
      <div className="absolute left-1/2 top-0 h-112 w-240 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[110px]" />
      <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 md:block bg-linear-to-b from-blue-500/40 via-blue-500/5 to-transparent" />
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(96,150,255,0.3)_1px,transparent_1.3px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_55%_75%_at_0%_100%,black,transparent)]" />
      <div className="absolute -right-56 top-1/2 h-176 w-176 -translate-y-1/2 rounded-full border border-white/8" />
      <div className="absolute -right-32 top-1/2 h-128 w-128 -translate-y-1/2 rounded-full border border-dashed border-blue-500/30 animate-[fgSpin_80s_linear_infinite] motion-reduce:animate-none" />
      <div className="absolute -right-8 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full border border-white/8" />
      <div className="absolute right-32 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-500 shadow-[0_0_18px_4px_rgba(59,130,246,0.6)] animate-[fgPulse_3s_ease-in-out_infinite] motion-reduce:animate-none" />
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="footer" className="relative z-0 w-full bg-black">
      <style>{FOOTER_STYLE}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10.5 left-0 z-20 hidden h-10.5 w-full md:block"
      >
        <div
          className="absolute bottom-0 left-1/2 h-full w-115 -translate-x-1/2 bg-black"
          style={{
            clipPath:
              "polygon(0 100%, 100% 100%, calc(50% + 90px) 0, calc(50% - 90px) 0)",
          }}
        />
      </div>

      <div className="relative w-full overflow-hidden">
        <FooterDecor />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{ backgroundImage: NOISE }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-[#05060a] to-transparent"
        />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 bg-blue-500"
        />

        <div className="relative z-10 mx-auto max-w-330 px-4 pb-8 pt-14 md:px-6 md:pt-20">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1.1fr] lg:gap-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <Link
                to="/"
                aria-label="FutGrid"
                className="mb-5 inline-block md:hidden"
              >
                <img
                  src="/logo3.png"
                  alt="FutGrid Logo"
                  className="h-8 w-auto object-contain mix-blend-screen"
                />
              </Link>

              <p
                className={`${HEAD} text-sm font-bold uppercase tracking-[0.25em] text-blue-500`}
              >
                Futbol taktikanı göstər
              </p>
              <p
                className={`${BODY} mt-4 max-w-sm text-[15px] leading-7 text-neutral-400`}
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
                    className="group/btn relative isolate flex h-11 w-11 items-center justify-center overflow-hidden border border-white/15 text-white transition-all duration-300 hover:-translate-y-1 hover:border-blue-500"
                  >
                    <span aria-hidden="true" className={SWEEP_BLUE} />
                    <Icon className="h-4.5 w-4.5" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <FooterTitle>Menyu</FooterTitle>
              <ul className="mt-6 flex flex-col gap-3">
                {FOOTER_NAV_LINKS.map((l) => (
                  <FooterLink key={l.label} {...l} />
                ))}
              </ul>
            </div>

            <div>
              <FooterTitle>Oyunlar</FooterTitle>
              <ul className="mt-6 flex flex-col gap-3">
                {FOOTER_GAME_LINKS.map((l) => (
                  <FooterLink key={l.label} {...l} />
                ))}
              </ul>
            </div>

            <div>
              <FooterTitle>Əlaqə</FooterTitle>
              <div className="mt-6 flex flex-col gap-4">
                {FOOTER_CONTACT.map(({ Icon, label, value, href }) => (
                  <a
                    key={value}
                    href={href}
                    className="group flex items-center gap-4"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-blue-500 text-white transition-all duration-300 group-hover:scale-105 group-hover:bg-blue-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block ${HEAD} text-[11px] uppercase tracking-[0.18em] text-neutral-500`}
                      >
                        {label}
                      </span>
                      <span
                        className={`block ${BODY} text-[15px] font-medium text-white transition-colors duration-300 group-hover:text-blue-400`}
                      >
                        {value}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-6 md:mt-16 md:flex-row">
            <p
              className={`${BODY} text-center text-[13px] text-neutral-500 md:text-left`}
            >
              © {year} FutGrid. Bütün hüquqlar qorunur.
            </p>

            <div
              className={`${BODY} flex items-center gap-6 text-[13px] text-neutral-500`}
            >
              <a
                href="#"
                className="transition-colors duration-300 hover:text-white"
              >
                Məxfilik siyasəti
              </a>
              <a
                href="#"
                className="transition-colors duration-300 hover:text-white"
              >
                İstifadə şərtləri
              </a>
            </div>

            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
