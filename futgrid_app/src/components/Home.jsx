import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Trophy,
  Mail,
  Phone,
  MapPin,
  Send,
  Check,
  ArrowUp,
} from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";

const SLIDES = [
  {
    image: "/public/images/slider1.jpg",
    fallback: "linear-gradient(135deg,#1b0b3a 0%,#5b1f6e 50%,#0b2a4a 100%)",
    lines: ["FUTBOL TAKTİKANI", "GÖSTƏR"],
    subtitle: "Klubları və oyunçuları tanı, matçı qazan",
    button: "DAHA ƏTRAFLI",
    href: "#games",
  },
  {
    image: "/public/images/slider2.jpg",
    fallback: "linear-gradient(135deg,#071a33 0%,#0e4d6b 50%,#1b0b3a 100%)",
    lines: ["FƏRQLİ OYUNLAR"],
    subtitle: "Taktiki oyunların yeni formatını kəşf et",
    button: "OYUNLARA BAX",
    href: "#games",
  },
  {
    image: "/public/images/slider3.jpg",
    fallback: "linear-gradient(135deg,#2a0b3a 0%,#6b1f4e 50%,#0b1a4a 100%)",
    lines: ["REYTİNQDƏ", "YÜKSƏL"],
    subtitle: "Xal topla və liderlər cədvəlinə qalx",
    button: "REYTİNQƏ BAX",
    href: "#leaderboard",
  },
];

const AUTOPLAY_MS = 4500;

const ABOUT_BACKGROUND =
  "https://picsum.photos/seed/futgrid-texture/1920/1000?grayscale&blur=2";

const CARDS = [
  {
    src: "/public/images/card1.jpg",
    alt: "Oyun zalı 1",
    title: "Oyun studiyası",
  },
  {
    src: "/public/images/card2.jpg",
    alt: "Oyun zalı 2",
    title: "Taktika zalı",
  },
  {
    src: "/public/images/card3.jpg",
    alt: "Oyun zalı 3",
    title: "Turnir arenası",
  },
];

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

const STREAMS_BACKGROUND = "/public/images/background_home_games.jpg";

const FEATURED_STREAM = {
  image: "/public/images/game1.avif",
  tag: "Klubların kəsişmə nöqtəsini tap, əfsanəvi oyunçuları yerləşdir və matçı qazan.",
  title: "FUTBOL X0X",
  href: "#games",
};

const SMALL_STREAMS = [
  {
    image: "/public/images/game2.jpg",
    title: "ORTAQ OYUNÇU",
    href: "#games",
  },
  {
    image: "/public/images/game3.avif",
    title: "Yüksək yoxsa Aşağı?",
    href: "#games",
  },
];

const STREAM_DELAYS = ["delay-150", "delay-300"];
const CARD_DELAYS = ["delay-0", "delay-150", "delay-300"];

const LEADERBOARD_BACKGROUND =
  "https://picsum.photos/seed/futgrid-leaderboard/1920/1000?grayscale&blur=2";

const PERIODS = [
  { key: "week", label: "Həftəlik" },
  { key: "month", label: "Aylıq" },
  { key: "all", label: "Bütün zamanlar" },
];

const PLAYERS = [
  {
    name: "Fuad Namazov",
    team: "TAU",
    matches: 148,
    winRate: 82,
    points: { week: 2480, month: 9320, all: 41850 },
  },
  {
    name: "Ali Manafov",
    team: "SDU",
    matches: 132,
    winRate: 78,
    points: { week: 2310, month: 9740, all: 38600 },
  },
  {
    name: "Farid Piriyev",
    team: "AZUQE",
    matches: 156,
    winRate: 74,
    points: { week: 2190, month: 8650, all: 40210 },
  },
  {
    name: "Elesger",
    team: "Nasosnu",
    matches: 121,
    winRate: 71,
    points: { week: 1980, month: 8120, all: 33400 },
  },
  {
    name: "İsfendiyare memmedova",
    team: "Efqanistan",
    matches: 110,
    winRate: 69,
    points: { week: 2050, month: 7430, all: 29870 },
  },
  {
    name: "Elcin İbrahmov",
    team: "Yasildere",
    matches: 137,
    winRate: 66,
    points: { week: 1720, month: 7010, all: 31150 },
  },
  {
    name: "Ali Como",
    team: "TAU",
    matches: 98,
    winRate: 63,
    points: { week: 1940, month: 6580, all: 24300 },
  },
  {
    name: "Umud memmedov",
    team: "Qida",
    matches: 104,
    winRate: 60,
    points: { week: 1490, month: 6890, all: 26720 },
  },
  {
    name: "İdris Muellim",
    team: "UNEC",
    matches: 89,
    winRate: 57,
    points: { week: 1380, month: 5420, all: 21980 },
  },
  {
    name: "Palatqa ",
    team: "Ceyranbatan",
    matches: 76,
    winRate: 54,
    points: { week: 1210, month: 5150, all: 18640 },
  },
];



const AVATAR_GRADIENTS = [
  "from-blue-500 to-cyan-400",
  "from-fuchsia-500 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-sky-400",
];

const RANK_STYLES = [
  {
    badge: "bg-amber-400 text-black",
    row: "from-amber-400/15",
    border: "border-l-amber-400",
    points: "text-amber-300",
  },
  {
    badge: "bg-slate-300 text-black",
    row: "from-slate-300/10",
    border: "border-l-slate-300",
    points: "text-slate-200",
  },
  {
    badge: "bg-orange-600 text-white",
    row: "from-orange-600/15",
    border: "border-l-orange-500",
    points: "text-orange-300",
  },
];

const CONTACT_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

const CONTACT_BACKGROUND =
  "https://picsum.photos/seed/futgrid-contact/1920/1000?grayscale&blur=2";

const CONTACT_INFO = [
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
    href: "#contact",
  },
];

const FOOTER_BACKGROUND =
  "https://picsum.photos/seed/futgrid-footer/1920/1000?grayscale&blur=2";

const FOOTER_FONT = "font-['Roboto_Condensed',sans-serif]";

const FOOTER_NAV_LINKS = [
  { label: "Ana Səhifə", href: "#" },
  { label: "Haqqımızda", href: "#about" },
  { label: "Oyunlar", href: "#games" },
  { label: "Reytinq", href: "#leaderboard" },
  { label: "Əlaqə", href: "#contact" },
  { label: "Hesab", href: "#login" },
];

const FOOTER_GAME_LINKS = [
  { label: "Futbol X0X", href: "#games" },
  { label: "Ortaq oyunçu", href: "#games" },
  { label: "Yüksək yoxsa Aşağı?", href: "#games" },
  { label: "Canlı yayımlar", href: "#games" },
];

const FOOTER_SOCIALS = [
  { Icon: FaInstagram, href: "#", label: "Instagram" },
  { Icon: FaTiktok, href: "#", label: "TikTok" },
  { Icon: FaYoutube, href: "#", label: "YouTube" },
];

const FIELD =
  "w-full border border-white/15 bg-white/5 px-4 py-3 font-['Roboto_Condensed',sans-serif] text-base text-white placeholder-neutral-500 outline-none transition-colors duration-300 focus:border-blue-500 focus:bg-white/10";

const LABEL =
  "mb-2 block font-['Roboto_Condensed',sans-serif] text-xs font-bold uppercase tracking-[0.15em] text-neutral-400";

const REVEAL =
  "translate-y-8 opacity-0 transition-all duration-700 ease-out motion-reduce:transition-none";

const SWEEP_BLUE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-blue-500 transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

const SWEEP_WHITE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

function FooterLink({ label, href }) {
  return (
    <li>
      <a
        href={href}
        className={`group inline-flex items-center gap-2 ${FOOTER_FONT} text-base font-light text-neutral-400 transition-colors duration-300 hover:text-white`}
      >
        <span
          aria-hidden="true"
          className="h-[2px] w-0 bg-blue-500 transition-all duration-300 ease-out group-hover:w-4"
        />
        {label}
      </a>
    </li>
  );
}

function FooterTitle({ children }) {
  return (
    <h3
      className={`${FOOTER_FONT} text-xl font-bold uppercase tracking-wide text-white`}
    >
      {children}
      <span
        aria-hidden="true"
        className="mt-2 block h-[2px] w-10 bg-blue-500"
      />
    </h3>
  );
}

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [textIn, setTextIn] = useState(false);
  const [barFull, setBarFull] = useState(false);
  const [period, setPeriod] = useState("week");
  const [rowsIn, setRowsIn] = useState(false);
  const [lbInView, setLbInView] = useState(false);
  const [status, setStatus] = useState("idle");

  const touchStartX = useRef(null);
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  const goTo = (updater) => {
    setTextIn(false);
    setBarFull(false);
    setIndex(updater);
  };

  const go = (dir) => goTo((i) => (i + dir + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    const id = setTimeout(
      () => goTo((i) => (i + 1) % SLIDES.length),
      AUTOPLAY_MS,
    );
    return () => clearTimeout(id);
  }, [index]);

  useEffect(() => {
    let r2;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setMounted(true);
        setTextIn(true);
        setBarFull(true);
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("translate-y-8", "opacity-0");
          entry.target.classList.add("translate-y-0", "opacity-100");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );
    root.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLbInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!lbInView) return;
    let r2;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setRowsIn(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [lbInView, period]);

  const changePeriod = (key) => {
    if (key === period) return;
    setRowsIn(false);
    setPeriod(key);
  };

  useEffect(() => {
    if (status !== "success") return;
    const id = setTimeout(() => setStatus("idle"), 7000);
    return () => clearTimeout(id);
  }, [status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    setStatus("sending");
    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(formEl),
      });
      if (!res.ok) throw new Error("failed");
      formEl.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const handlePointerDown = (e) => {
    touchStartX.current = e.clientX;
  };
  const handlePointerUp = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.clientX - touchStartX.current;
    if (Math.abs(diff) > 60) go(diff < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const slide = SLIDES[index];
  const subDelay = 200 + slide.lines.length * 200;
  const btnDelay = subDelay + 200;

  const rows = [...PLAYERS].sort((a, b) => b.points[period] - a.points[period]);

  const year = new Date().getFullYear();

  return (
    <div ref={rootRef} className="w-full">
      <section
        className="relative z-0 h-[500px] w-full overflow-hidden bg-black md:h-[790px]"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {SLIDES.map((s, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              className={`absolute inset-0 bg-cover bg-center transition-transform duration-[8000ms] ease-out motion-reduce:transition-none ${
                i === index && mounted ? "scale-110" : "scale-100"
              }`}
              style={{ backgroundImage: `url(${s.image}), ${s.fallback}` }}
            />
          </div>
        ))}

        <div className="absolute inset-0 bg-linear-to-b from-black/45 via-[#1a0933]/50 to-black/70" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 pb-10 text-center">
          <h2 className="font-['Roboto_Condensed',sans-serif] text-3xl font-bold uppercase leading-[1.05] text-white sm:text-5xl lg:text-[72px]">
            {slide.lines.map((line, i) => (
              <span key={line} className="block overflow-hidden pt-[0.12em]">
                <span
                  className={`block transition-all ease-out motion-reduce:transition-none ${
                    textIn
                      ? "translate-y-0 opacity-100 duration-[900ms]"
                      : "translate-y-full opacity-0 duration-0"
                  }`}
                  style={{
                    transitionDelay: textIn ? `${150 + i * 200}ms` : "0ms",
                  }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h2>

          <p
            className={`mt-3 font-['Roboto_Condensed',sans-serif] text-sm font-normal uppercase tracking-[0.2em] text-blue-500 transition-all ease-out motion-reduce:transition-none md:mt-4 md:text-xl ${
              textIn
                ? "translate-y-0 opacity-100 duration-700"
                : "translate-y-4 opacity-0 duration-0"
            }`}
            style={{ transitionDelay: textIn ? `${subDelay}ms` : "0ms" }}
          >
            {slide.subtitle}
          </p>

          <div
            className={`relative mt-5 inline-block transition-all ease-out motion-reduce:transition-none md:mt-8 ${
              textIn
                ? "translate-y-0 scale-100 opacity-100 duration-[800ms]"
                : "translate-y-7 scale-90 opacity-0 duration-0"
            }`}
            style={{ transitionDelay: textIn ? `${btnDelay}ms` : "0ms" }}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
                textIn ? "opacity-100 delay-[1800ms]" : "opacity-0 duration-0"
              }`}
            >
              <span className="absolute -inset-1.5 animate-pulse bg-blue-500/30 [animation-duration:2.4s]" />
            </span>

            <a
              href={slide.href}
              className="group/btn relative isolate inline-block overflow-hidden bg-blue-500 px-7 py-2.5 font-['Roboto_Condensed',sans-serif] text-sm font-bold uppercase tracking-wide text-white transition-colors duration-500 hover:text-blue-500 md:px-10 md:py-3.5 md:text-base"
            >
              <span aria-hidden="true" className={SWEEP_WHITE} />
              {slide.button}
            </a>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 z-20 h-4 w-full bg-black" />
        <svg
          aria-hidden="true"
          viewBox="0 0 520 60"
          preserveAspectRatio="none"
          className="pointer-events-none absolute bottom-3 left-1/2 z-20 h-[34px] w-[240px] -translate-x-1/2 md:h-[42px] md:w-[300px]"
        >
          <path
            fill="#000"
            d="M0,60 C120,60 170,0 260,0 C350,0 400,60 520,60 Z"
          />
        </svg>

        <div
          aria-hidden="true"
          className={`absolute bottom-0 left-0 z-30 h-[3px] bg-blue-500 transition-[width] ease-linear ${
            barFull ? "w-full" : "w-0 duration-0"
          }`}
          style={
            barFull ? { transitionDuration: `${AUTOPLAY_MS}ms` } : undefined
          }
        />

        <button
          onClick={() => go(-1)}
          aria-label="Əvvəlki slayd"
          className="group/btn absolute left-3 top-1/2 z-30 isolate flex h-10 w-10 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-blue-500 md:left-8 md:h-12 md:w-12"
        >
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        <button
          onClick={() => go(1)}
          aria-label="Növbəti slayd"
          className="group/btn absolute right-3 top-1/2 z-30 isolate flex h-10 w-10 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-blue-500 md:right-8 md:h-12 md:w-12"
        >
          <span aria-hidden="true" className={SWEEP_BLUE} />
          <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
        </button>

        <div className="absolute bottom-[12px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i !== index) goTo(() => i);
              }}
              aria-label={`Slayd ${i + 1}`}
              aria-current={i === index}
              className={`group/btn relative isolate h-3 w-3 overflow-hidden rounded-full transition-all duration-300 ${
                i === index ? "scale-110 bg-blue-500" : "bg-neutral-600"
              }`}
            >
              <span aria-hidden="true" className={SWEEP_BLUE} />
            </button>
          ))}
        </div>
      </section>

      <section
        id="about"
        className="relative w-full overflow-hidden bg-[#0b0909] py-16 md:py-24"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${ABOUT_BACKGROUND})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#0b0909]/90" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{ backgroundImage: NOISE }}
        />

        <div className="relative z-10 mx-auto max-w-330 px-4 md:px-6">
          <div className="text-center">
            <div data-reveal className={REVEAL}>
              <p className="font-['Roboto_Condensed',sans-serif] text-base font-normal uppercase tracking-wider text-blue-500 md:text-xl">
                FUTBOL BİLİKİNİ SINA
              </p>
            </div>
            <div data-reveal className={`${REVEAL} delay-100`}>
              <h2 className="mt-1 font-['Roboto_Condensed',sans-serif] text-4xl font-bold uppercase leading-tight text-white md:text-[56px]">
                TAKTİKİ OYUNLAR &amp; STRATEGİYA
              </h2>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-14 lg:grid-cols-3 lg:gap-9">
            {CARDS.map((card, i) => (
              <div
                key={card.src}
                data-reveal
                className={`${REVEAL} ${CARD_DELAYS[i]}`}
              >
                <div className="group relative aspect-[11/10] overflow-hidden bg-neutral-900 transition-transform duration-500 ease-out hover:-translate-y-2">
                  <img
                    src={card.src}
                    alt={card.alt}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-black/70 via-[#1a0933]/65 to-black/70 px-6 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <h3 className="translate-y-4 text-center font-['Roboto_Condensed',sans-serif] text-3xl font-bold uppercase leading-tight text-white/90 transition-transform duration-500 ease-out group-hover:translate-y-0 md:text-4xl">
                      {card.title}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-3xl text-center md:mt-14">
            <div data-reveal className={REVEAL}>
              <p className="font-['Roboto_Condensed',sans-serif] text-base font-light leading-8 text-neutral-400 md:text-lg md:leading-9">
                FutGrid oyun həvəskarları üçün taktiki oyunların, reytinq
                cədvəllərinin və turnirlərin bir yerdə toplandığı platformadır.
                Burada komandanı qura, rəqiblərinlə yarışa və öz səviyyəni hər
                gün yüksəldə bilərsən. Sadəcə oyna, öyrən və liderlər cədvəlində
                yerini tut.
              </p>
            </div>

            <div data-reveal className={`${REVEAL} delay-150`}>
              <a
                href="#games"
                className="group/btn relative isolate mt-8 inline-block overflow-hidden bg-blue-500 px-10 py-3.5 font-['Roboto_Condensed',sans-serif] text-sm font-bold uppercase tracking-wide text-white transition-[color,transform] duration-500 hover:-translate-y-0.5 hover:text-blue-500 md:mt-10 md:px-12 md:text-base"
              >
                <span aria-hidden="true" className={SWEEP_WHITE} />
                Oyunlara bax
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="games"
        className="relative w-full overflow-hidden bg-[#05060a] py-12 md:py-16"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${STREAMS_BACKGROUND})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#05060a]/85" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-[#0b0909] to-transparent"
        />

        <div className="relative z-10 mx-auto max-w-330 px-4 md:px-6">
          <div className="text-center">
            <div data-reveal className={REVEAL}>
              <p className="font-['Roboto_Condensed',sans-serif] text-base font-normal uppercase tracking-wider text-blue-500 md:text-xl">
                İndi kəşf et
              </p>
            </div>
            <div data-reveal className={`${REVEAL} delay-100`}>
              <h2 className="mt-1 font-['Roboto_Condensed',sans-serif] text-4xl font-bold uppercase leading-tight text-white md:text-[56px]">
                Populyar oyunlar
              </h2>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 lg:grid-cols-2 lg:grid-rows-2 lg:gap-6">
            <div data-reveal className={`${REVEAL} h-full lg:row-span-2`}>
              <a
                href={FEATURED_STREAM.href}
                className="group relative block h-full min-h-[320px] overflow-hidden border border-white/10 bg-neutral-900"
              >
                <img
                  src={FEATURED_STREAM.image}
                  alt={FEATURED_STREAM.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-black/40" />

                <span className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center bg-blue-500 text-white transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-400 md:left-10 md:top-10 md:h-14 md:w-14">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-blue-500/60 opacity-0 group-hover:animate-ping group-hover:opacity-100"
                  />
                  <Play className="relative h-5 w-5 fill-white" />
                </span>

                <div className="absolute bottom-6 left-5 right-5 md:bottom-8 md:left-10">
                  <p className="font-['Roboto_Condensed',sans-serif] text-xs uppercase tracking-[0.15em] text-blue-500">
                    {FEATURED_STREAM.tag}
                  </p>
                  <h3 className="mt-1 max-w-[380px] font-['Roboto_Condensed',sans-serif] text-2xl font-bold uppercase leading-[1.1] text-white md:text-[32px]">
                    {FEATURED_STREAM.title}
                  </h3>
                </div>
              </a>
            </div>

            {SMALL_STREAMS.map((item, i) => (
              <div
                key={item.title}
                data-reveal
                className={`${REVEAL} ${STREAM_DELAYS[i]} h-full`}
              >
                <a
                  href={item.href}
                  className="group relative block h-full min-h-[190px] overflow-hidden border border-white/10 bg-neutral-900 md:min-h-[220px]"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/25 transition-colors duration-500 group-hover:bg-transparent" />

                  <div className="absolute bottom-0 left-0 flex h-[60px] w-[58%] min-w-[190px] items-center gap-3 bg-blue-500/85 px-5 backdrop-blur-[2px] transition-all duration-300 group-hover:w-[70%] group-hover:bg-blue-500 md:h-[68px] md:px-8">
                    <Play className="h-4 w-4 shrink-0 fill-white text-white md:h-5 md:w-5" />
                    <span className="truncate font-['Roboto_Condensed',sans-serif] text-lg font-bold uppercase text-white md:text-xl">
                      {item.title}
                    </span>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="leaderboard"
        className="relative w-full overflow-hidden bg-[#0b0909] py-12 md:py-16"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${LEADERBOARD_BACKGROUND})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#0b0909]/90" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{ backgroundImage: NOISE }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-[#05060a] to-transparent"
        />

        <div className="relative z-10 mx-auto max-w-5xl px-4 md:px-6">
          <div className="text-center">
            <div data-reveal className={REVEAL}>
              <p className="font-['Roboto_Condensed',sans-serif] text-base font-normal uppercase tracking-wider text-blue-500 md:text-xl">
                Ən yaxşılar
              </p>
            </div>
            <div data-reveal className={`${REVEAL} delay-100`}>
              <h2 className="mt-1 font-['Roboto_Condensed',sans-serif] text-4xl font-bold uppercase leading-tight text-white md:text-[56px]">
                Reytinq cədvəli
              </h2>
            </div>
          </div>

          <div
            data-reveal
            className={`${REVEAL} delay-200 mt-8 flex flex-wrap justify-center gap-3`}
          >
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => changePeriod(p.key)}
                className={`group/btn relative isolate overflow-hidden border px-5 py-2 font-['Roboto_Condensed',sans-serif] text-sm font-bold uppercase tracking-wide transition-colors duration-300 md:px-7 md:text-base ${
                  period === p.key
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-white/15 text-neutral-400 hover:border-blue-500 hover:text-white"
                }`}
              >
                <span aria-hidden="true" className={SWEEP_BLUE} />
                {p.label}
              </button>
            ))}
          </div>

          <div
            ref={panelRef}
            className="mt-8 overflow-hidden border border-white/10 bg-[#0b0e14]/85 backdrop-blur-sm"
          >
            <div className="grid grid-cols-[44px_1fr_80px] items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3 font-['Roboto_Condensed',sans-serif] text-xs font-bold uppercase tracking-[0.15em] text-neutral-400 md:grid-cols-[56px_1.6fr_1.2fr_80px_190px_100px] md:px-6">
              <span>#</span>
              <span>Oyunçu</span>
              <span className="hidden md:block">Komanda</span>
              <span className="hidden md:block">Matç</span>
              <span className="hidden md:block">Qələbə %</span>
              <span className="text-right">Xal</span>
            </div>

            <div>
              {rows.map((player, i) => {
                const top = i < 3 ? RANK_STYLES[i] : null;
                return (
                  <div
                    key={player.name}
                    className={`border-b border-white/5 transition-all ease-out last:border-b-0 motion-reduce:transition-none ${
                      rowsIn
                        ? "translate-x-0 opacity-100 duration-500"
                        : "-translate-x-4 opacity-0 duration-0"
                    }`}
                    style={{ transitionDelay: rowsIn ? `${i * 70}ms` : "0ms" }}
                  >
                    <div
                      className={`grid grid-cols-[44px_1fr_80px] items-center gap-3 border-l-2 px-4 py-3 transition-colors duration-300 md:grid-cols-[56px_1.6fr_1.2fr_80px_190px_100px] md:px-6 ${
                        top
                          ? `${top.border} bg-linear-to-r ${top.row} to-transparent`
                          : "border-l-transparent hover:bg-blue-500/10"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center font-['Roboto_Condensed',sans-serif] text-sm font-bold ${
                          top ? top.badge : "bg-white/5 text-neutral-400"
                        }`}
                      >
                        {i === 0 ? <Trophy className="h-4 w-4" /> : i + 1}
                      </span>

                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br font-['Roboto_Condensed',sans-serif] text-sm font-bold text-white md:h-10 md:w-10 ${
                            AVATAR_GRADIENTS[
                              PLAYERS.indexOf(player) % AVATAR_GRADIENTS.length
                            ]
                          }`}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-['Roboto_Condensed',sans-serif] text-base font-bold uppercase tracking-wide text-white md:text-lg">
                            {player.name}
                          </p>
                          <p className="truncate font-['Roboto_Condensed',sans-serif] text-xs font-light text-neutral-400 md:hidden">
                            {player.team}
                          </p>
                        </div>
                      </div>

                      <span className="hidden truncate font-['Roboto_Condensed',sans-serif] text-base font-light text-neutral-300 md:block">
                        {player.team}
                      </span>

                      <span className="hidden font-['Roboto_Condensed',sans-serif] text-base text-neutral-300 md:block">
                        {player.matches}
                      </span>

                      <div className="hidden items-center gap-3 md:flex">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full bg-blue-500 transition-[width] ease-out motion-reduce:transition-none ${
                              rowsIn ? "duration-700" : "duration-0"
                            }`}
                            style={{
                              width: rowsIn ? `${player.winRate}%` : "0%",
                              transitionDelay: rowsIn
                                ? `${i * 70 + 200}ms`
                                : "0ms",
                            }}
                          />
                        </div>
                        <span className="font-['Roboto_Condensed',sans-serif] text-sm text-neutral-300">
                          {player.winRate}%
                        </span>
                      </div>

                      <span
                        className={`text-right font-['Roboto_Condensed',sans-serif] text-lg font-bold md:text-xl ${
                          top ? top.points : "text-white"
                        }`}
                      >
                        {player.points[period].toLocaleString("en-US")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="relative w-full overflow-hidden bg-[#05060a] py-12 md:py-16"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${CONTACT_BACKGROUND})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#05060a]/90" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{ backgroundImage: NOISE }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-[#0b0909] to-transparent"
        />

        <div className="relative z-10 mx-auto max-w-5xl px-4 md:px-6">
          <div className="text-center">
            <div data-reveal className={REVEAL}>
              <p className="font-['Roboto_Condensed',sans-serif] text-base font-normal uppercase tracking-wider text-blue-500 md:text-xl">
                Bizimlə əlaqə
              </p>
            </div>
            <div data-reveal className={`${REVEAL} delay-100`}>
              <h2 className="mt-1 font-['Roboto_Condensed',sans-serif] text-4xl font-bold uppercase leading-tight text-white md:text-[56px]">
                Mesaj göndər
              </h2>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 md:mt-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
            <div data-reveal className={`${REVEAL} delay-100`}>
              <p className="font-['Roboto_Condensed',sans-serif] text-base font-light leading-8 text-neutral-400 md:text-lg">
                Sualın, təklifin və ya əməkdaşlıq ideyan var? Formu doldur,
                mesajın birbaşa bizə çatsın. Ən qısa zamanda sənə cavab
                verəcəyik.
              </p>

              <div className="mt-8 flex flex-col gap-5">
                {CONTACT_INFO.map(({ Icon, label, value, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="group flex items-center gap-4"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-blue-500 text-white transition-all duration-300 group-hover:scale-105 group-hover:bg-blue-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-['Roboto_Condensed',sans-serif] text-xs uppercase tracking-[0.15em] text-blue-500">
                        {label}
                      </span>
                      <span className="block font-['Roboto_Condensed',sans-serif] text-lg font-bold text-white transition-colors duration-300 group-hover:text-blue-400">
                        {value}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div data-reveal className={`${REVEAL} delay-200`}>
              <form
                onSubmit={handleSubmit}
                className="border border-white/10 bg-[#0b0e14]/85 p-5 backdrop-blur-sm md:p-8"
              >
                <input
                  type="hidden"
                  name="_subject"
                  value="FutGrid saytından yeni mesaj"
                />
                <input
                  type="text"
                  name="_gotcha"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className={LABEL}>Ad və soyad</span>
                    <input
                      type="text"
                      name="name"
                      required
                      minLength={2}
                      autoComplete="name"
                      placeholder="Adını yaz"
                      className={FIELD}
                    />
                  </label>
                  <label className="block">
                    <span className={LABEL}>E-poçt</span>
                    <input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      placeholder="ad@mail.com"
                      className={FIELD}
                    />
                  </label>
                </div>

                <label className="mt-5 block">
                  <span className={LABEL}>Mövzu</span>
                  <input
                    type="text"
                    name="subject"
                    required
                    placeholder="Nə haqqında yazırsan?"
                    className={FIELD}
                  />
                </label>

                <label className="mt-5 block">
                  <span className={LABEL}>Mesaj</span>
                  <textarea
                    name="message"
                    required
                    minLength={10}
                    rows={5}
                    placeholder="Mesajını bura yaz..."
                    className={`${FIELD} resize-none`}
                  />
                </label>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="group/btn relative isolate inline-flex items-center gap-2 overflow-hidden bg-blue-500 px-10 py-3.5 font-['Roboto_Condensed',sans-serif] text-sm font-bold uppercase tracking-wide text-white transition-colors duration-500 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-60 md:text-base"
                  >
                    <span aria-hidden="true" className={SWEEP_WHITE} />
                    {status === "sending" ? "Göndərilir..." : "Mesajı göndər"}
                    <Send className="h-4 w-4" />
                  </button>

                  {status === "success" && (
                    <p
                      role="status"
                      className="flex items-center gap-2 font-['Roboto_Condensed',sans-serif] text-base text-emerald-400"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                        <Check className="h-4 w-4" />
                      </span>
                      Mesajın göndərildi, təşəkkürlər!
                    </p>
                  )}

                  {status === "error" && (
                    <p
                      role="alert"
                      className="font-['Roboto_Condensed',sans-serif] text-base text-rose-400"
                    >
                      Mesaj göndərilmədi. Bir az sonra yenidən cəhd et.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer
        id="footer"
        className="relative z-0 mt-6 w-full bg-black md:mt-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-[42px] left-0 z-20 hidden h-[42px] w-full md:block"
        >
          <div
            className="absolute bottom-0 left-1/2 h-full w-[460px] -translate-x-1/2 bg-black"
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
            className="absolute inset-x-0 top-0 h-[2px] bg-blue-500"
          />

          <div className="relative z-10 mx-auto max-w-330 px-4 pb-8 pt-14 md:px-6 md:pt-20">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1.1fr] lg:gap-12">
              <div className="sm:col-span-2 lg:col-span-1">
                <a
                  href="#"
                  aria-label="FutGrid"
                  className="mb-5 inline-block md:hidden"
                >
                  <img
                    src="/logo3.png"
                    alt="FutGrid Logo"
                    className="h-8 w-auto object-contain mix-blend-screen"
                  />
                </a>

                <p
                  className={`${FOOTER_FONT} text-sm font-normal uppercase tracking-[0.2em] text-blue-500`}
                >
                  Futbol taktikanı göstər
                </p>
                <p
                  className={`${FOOTER_FONT} mt-4 max-w-sm text-base font-light leading-8 text-neutral-400`}
                >
                  FutGrid taktiki oyunların, reytinq cədvəllərinin və
                  turnirlərin bir yerdə toplandığı platformadır. Oyna, öyrən və
                  liderlər cədvəlində yerini tut.
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
                      <Icon className="h-[18px] w-[18px]" />
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
                  {CONTACT_INFO.map(({ Icon, value, href }) => (
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

              <a
                href="#"
                className={`group/btn relative isolate inline-flex items-center gap-2 overflow-hidden bg-blue-500 px-6 py-2.5 ${FOOTER_FONT} text-sm font-bold uppercase tracking-wide text-white transition-colors duration-500 hover:text-blue-500`}
              >
                <span aria-hidden="true" className={SWEEP_WHITE} />
                Yuxarı qalx
                <ArrowUp className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
