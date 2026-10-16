import { Link } from "react-router-dom";
import { ArrowUp, Mail, MapPin, Phone } from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";

const FOOTER_BACKGROUND =
  "https://picsum.photos/seed/futgrid-footer/1920/1000?grayscale&blur=2";

const FOOTER_FONT = "font-['Roboto_Condensed',sans-serif]";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

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
  { Icon: Mail, value: "info@futgrid.az", href: "mailto:info@futgrid.az" },
  { Icon: Phone, value: "+994 50 000 00 00", href: "tel:+994500000000" },
  { Icon: MapPin, value: "Bakı, Azərbaycan", href: "/#contact" },
];

function FooterLink({ label, to }) {
  return (
    <li>
      <Link
        to={to}
        className={`group inline-flex items-center gap-2 ${FOOTER_FONT} text-base font-light text-neutral-400 transition-colors duration-300 hover:text-white`}
      >
        <span
          aria-hidden="true"
          className="h-0.5 w-0 bg-blue-500 transition-all duration-300 ease-out group-hover:w-4"
        />
        {label}
      </Link>
    </li>
  );
}

function FooterTitle({ children }) {
  return (
    <h3
      className={`${FOOTER_FONT} text-xl font-bold uppercase tracking-wide text-white`}
    >
      {children}
      <span aria-hidden="true" className="mt-2 block h-0.5 w-10 bg-blue-500" />
    </h3>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer id="footer" className="relative z-0 mt-6 w-full bg-black md:mt-10">
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
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${FOOTER_BACKGROUND})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-black/90" />
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
                className={`${FOOTER_FONT} text-sm font-normal uppercase tracking-[0.2em] text-blue-500`}
              >
                Futbol taktikanı göstər
              </p>
              <p
                className={`${FOOTER_FONT} mt-4 max-w-sm text-base font-light leading-8 text-neutral-400`}
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
                {FOOTER_CONTACT.map(({ Icon, value, href }) => (
                  <a
                    key={value}
                    href={href}
                    className="group flex items-center gap-4"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-blue-500 text-white transition-all duration-300 group-hover:scale-105 group-hover:bg-blue-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`${FOOTER_FONT} text-base font-bold text-white transition-colors duration-300 group-hover:text-blue-400`}
                    >
                      {value}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-6 md:mt-16 md:flex-row">
            <p
              className={`${FOOTER_FONT} text-center text-sm font-light text-neutral-500 md:text-left`}
            >
              © {year} FutGrid. Bütün hüquqlar qorunur.
            </p>

            <div
              className={`${FOOTER_FONT} flex items-center gap-6 text-sm font-light text-neutral-500`}
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

            <button
              type="button"
              onClick={scrollTop}
              className={`group/btn relative isolate inline-flex items-center gap-2 overflow-hidden bg-blue-500 px-6 py-2.5 ${FOOTER_FONT} text-sm font-bold uppercase tracking-wide text-white transition-colors duration-500 hover:text-blue-500`}
            >
              <span aria-hidden="true" className={SWEEP_WHITE} />
              Yuxarı qalx
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
