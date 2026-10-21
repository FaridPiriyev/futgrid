import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
  Crown,
  ArrowRight,
  User,
  MessageSquare,
} from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";

const SLIDES = [
  {
    image: "/images/slider1.png",
    fallback: "linear-gradient(135deg,#1b0b3a 0%,#5b1f6e 50%,#0b2a4a 100%)",
    lines: ["FUTBOL TAKTİKANI", "GÖSTƏR"],
    subtitle: "Klubları və oyunçuları tanı, matçı qazan",
    button: "DAHA ƏTRAFLI",
    href: "#games",
  },
  {
    image: "/images/slider2.png",
    fallback: "linear-gradient(135deg,#071a33 0%,#0e4d6b 50%,#1b0b3a 100%)",
    lines: ["FƏRQLİ OYUNLAR"],
    subtitle: "Taktiki oyunların yeni formatını kəşf et",
    button: "OYUNLARA BAX",
    href: "#games",
  },
  {
    image: "/images/slider3.png",
    fallback: "linear-gradient(135deg,#2a0b3a 0%,#6b1f4e 50%,#0b1a4a 100%)",
    lines: ["REYTİNQDƏ", "YÜKSƏL"],
    subtitle: "Xal topla və liderlər cədvəlinə qalx",
    button: "REYTİNQƏ BAX",
    href: "#leaderboard",
  },
];

const AUTOPLAY_MS = 4500;

const ABOUT_BACKGROUND = "/images/background_home_about.png";

const CARDS = [
  { src: "/images/card1.jpg", alt: "Oyun zalı 1", title: "Oyun studiyası" },
  { src: "/images/card2.jpg", alt: "Oyun zalı 2", title: "Taktika zalı" },
  { src: "/images/card3.jpg", alt: "Oyun zalı 3", title: "Turnir arenası" },
];

const STATS = [
  { value: 15900, suffix: "+", label: "Oyunçu" },
  { value: 433, suffix: "", label: "Klub" },
  { value: 220, suffix: "", label: "Ölkə" },
  { value: 1800, suffix: "+", label: "Məşqçi" },
];

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

const GAMES_BACKGROUND = "/images/background_home_games.jpg";

const GAMES = [
  {
    key: "x0x",
    image: "/images/game1.avif",
    title: "Futbol X0X",
    description:
      "Sətir və sütundakı klub, ölkə, məşqçi və kubokların kəsişməsində oynamış futbolçunu tap. Üç xananı bir xətdə tutan qalib olur.",
    tags: ["2 oyunçu", "Tək oyunçu", "3 səviyyə"],
    href: "/oyunlar/futbol-x0x",
  },
  {
    key: "ortaq",
    image: "/images/game2.jpg",
    title: "Ortaq Oyunçu",
    description: "Kartları gizli seç, açılanda ortaq futbolçunu birinci tap.",
    tags: ["Kart dueli", "2 oyunçu"],
    href: "/oyunlar/ortaq-oyuncu",
  },
  {
    key: "yuksek",
    image: "/images/game3.avif",
    title: "Yüksək yoxsa Aşağı?",
    description: "Futbolçuların rəqəmlərini müqayisə et və seriyanı qır.",
    tags: ["Tək oyunçu", "Seriya"],
    href: "/oyunlar/yuksek-asagi",
  },
];

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
    name: "Apo kerim sentarci",
    team: "kapital bank",
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

const PODIUM = [
  {
    height: "h-24 md:h-36",
    ring: "from-amber-200 via-amber-400 to-amber-600",
    text: "text-amber-300",
    block: "border-amber-400 from-amber-400/30 to-amber-400/0",
    glow: "shadow-[0_0_34px_-4px_rgba(251,191,36,0.75)]",
  },
  {
    height: "h-16 md:h-26",
    ring: "from-white via-slate-300 to-slate-500",
    text: "text-slate-200",
    block: "border-slate-300 from-slate-300/25 to-slate-300/0",
    glow: "",
  },
  {
    height: "h-11 md:h-18",
    ring: "from-orange-300 via-orange-500 to-orange-800",
    text: "text-orange-300",
    block: "border-orange-500 from-orange-500/25 to-orange-500/0",
    glow: "",
  },
];

const PODIUM_ORDER = [1, 0, 2];
const PODIUM_DELAY = [150, 0, 300];

const FORMSPREE_ID = "xeaeyrkp";
const CONTACT_ENDPOINT = `https://formspree.io/f/${FORMSPREE_ID}`;

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
  { Icon: MapPin, label: "Ünvan", value: "Bakı, Azərbaycan" },
];

const SOCIALS = [
  { Icon: FaInstagram, href: "#", label: "Instagram" },
  { Icon: FaTiktok, href: "#", label: "TikTok" },
  { Icon: FaYoutube, href: "#", label: "YouTube" },
];

const MESSAGE_MAX = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const KEYFRAMES = `
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap");
@keyframes fgFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes fgDrift { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.1); } }
@keyframes fgShine { 0% { transform: translateX(0) skewX(-14deg); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateX(480%) skewX(-14deg); opacity: 0; } }
@keyframes fgSwipe { 0%,100% { transform: translateX(0); opacity: 1; } 50% { transform: translateX(-8px); opacity: .4; } }
@keyframes fgPulseRing { 0% { transform: scale(.9); opacity: .8; } 100% { transform: scale(1.7); opacity: 0; } }
@keyframes fgGrid { from { background-position: 0 0; } to { background-position: 0 48px; } }
@keyframes fgFly { 0% { transform: translate(0,0) rotate(0); opacity: 1; } 45% { transform: translate(34px,-26px) rotate(-12deg) scale(.6); opacity: 0; } 46% { transform: translate(-34px,26px) scale(.6); opacity: 0; } 100% { transform: translate(0,0) rotate(0); opacity: 1; } }
@keyframes fgPop { 0% { transform: scale(.85); opacity: 0; } 60% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); } }
`;

const REVEAL_BASE =
  "transition-[opacity,translate,scale] duration-700 ease-out motion-reduce:transition-none";
const REVEAL = {
  up: `${REVEAL_BASE} translate-y-8 opacity-0 data-in:translate-y-0 data-in:opacity-100`,
  left: `${REVEAL_BASE} -translate-x-10 opacity-0 data-in:translate-x-0 data-in:opacity-100`,
  right: `${REVEAL_BASE} translate-x-10 opacity-0 data-in:translate-x-0 data-in:opacity-100`,
  zoom: `${REVEAL_BASE} scale-90 opacity-0 data-in:scale-100 data-in:opacity-100`,
};

const SWEEP_BLUE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-blue-500 transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

const SWEEP_WHITE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

const SHINE =
  "pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent opacity-0";

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const avatarOf = (player) =>
  AVATAR_GRADIENTS[
    Math.max(
      0,
      PLAYERS.findIndex((p) => p.name === player.name),
    ) % AVATAR_GRADIENTS.length
  ];

const navOffset = () => (window.innerWidth >= 768 ? 90 : 64);

const jumpTo = (e, href) => {
  if (!href.startsWith("#")) return;
  const el = document.getElementById(href.slice(1));
  if (!el) return;
  e.preventDefault();
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - navOffset(),
    behavior: "smooth",
  });
  window.history.replaceState(null, "", `/${href}`);
};

function useMedia(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

function useInView(ref, threshold = 0.2) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return inView;
}

function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => (el.dataset.in = "true"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.dataset.in = "true";
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

function useParallax(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mq = window.matchMedia(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    );
    const els = [...root.querySelectorAll("[data-parallax]")];
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of els) {
        if (!mq.matches) {
          el.style.transform = "";
          continue;
        }
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) continue;
        const speed = Number(el.dataset.parallax) || 0.12;
        const offset = (box.top + box.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(1.18)`;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    mq.addEventListener("change", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mq.removeEventListener("change", schedule);
    };
  }, [rootRef]);
}

function CountUp({ value, run, duration = 1200 }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!run) {
      setShown(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame;
    let start;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min(1, (t - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, run, duration]);
  return String(shown).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function SectionHeading({ kicker, title }) {
  return (
    <div data-reveal className="group/h text-center">
      <div className="flex items-center justify-center gap-3">
        <span className="h-px w-8 origin-right scale-x-0 bg-blue-500 transition-transform duration-700 ease-out group-data-in/h:scale-x-100 md:w-16" />
        <p
          className={`${FONT} text-base uppercase tracking-wider text-blue-500 opacity-0 transition-opacity duration-700 group-data-in/h:opacity-100 md:text-xl`}
        >
          {kicker}
        </p>
        <span className="h-px w-8 origin-left scale-x-0 bg-blue-500 transition-transform duration-700 ease-out group-data-in/h:scale-x-100 md:w-16" />
      </div>
      <h2
        className={`mt-1 overflow-hidden py-[0.1em] ${FONT} text-4xl font-bold uppercase leading-tight text-white md:text-[56px]`}
      >
        <span className="block translate-y-full transition-transform delay-150 duration-900 ease-out motion-reduce:translate-y-0 group-data-in/h:translate-y-0">
          {title}
        </span>
      </h2>
    </div>
  );
}

function TiltCard({ className = "", children }) {
  const ref = useRef(null);
  const onMove = (e) => {
    if (!window.matchMedia("(hover: hover) and (min-width: 1024px)").matches)
      return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateY(-6px)`;
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    ref.current.style.transform = "";
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`group/tilt relative transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}

function DesktopHero({ enabled }) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [textIn, setTextIn] = useState(false);
  const [barFull, setBarFull] = useState(false);
  const touchStartX = useRef(null);

  const goTo = (updater) => {
    setTextIn(false);
    setBarFull(false);
    setIndex(updater);
  };
  const go = (dir) => goTo((i) => (i + dir + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(
      () => goTo((i) => (i + 1) % SLIDES.length),
      AUTOPLAY_MS,
    );
    return () => clearTimeout(id);
  }, [index, enabled]);

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
    if (!enabled) return;
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  const slide = SLIDES[index];
  const subDelay = 200 + slide.lines.length * 200;
  const btnDelay = subDelay + 200;

  return (
    <section
      className="relative z-0 hidden h-197.5 w-full overflow-hidden bg-black md:block"
      onPointerDown={(e) => (touchStartX.current = e.clientX)}
      onPointerUp={(e) => {
        if (touchStartX.current === null) return;
        const diff = e.clientX - touchStartX.current;
        if (Math.abs(diff) > 60) go(diff < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
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
            className={`absolute inset-0 bg-cover bg-center transition-transform duration-8000 ease-out motion-reduce:transition-none ${
              i === index && mounted ? "scale-110" : "scale-100"
            }`}
            style={{ backgroundImage: `url(${s.image}), ${s.fallback}` }}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-linear-to-b from-black/45 via-[#1a0933]/50 to-black/70" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 pb-10 text-center">
        <h2
          className={`${FONT} text-5xl font-bold uppercase leading-[1.05] text-white lg:text-[72px]`}
        >
          {slide.lines.map((line, i) => (
            <span key={line} className="block overflow-hidden pt-[0.12em]">
              <span
                className={`block transition-all ease-out motion-reduce:transition-none ${
                  textIn
                    ? "translate-y-0 opacity-100 duration-900"
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
          className={`mt-4 ${FONT} text-xl uppercase tracking-[0.2em] text-blue-500 transition-all ease-out motion-reduce:transition-none ${
            textIn
              ? "translate-y-0 opacity-100 duration-700"
              : "translate-y-4 opacity-0 duration-0"
          }`}
          style={{ transitionDelay: textIn ? `${subDelay}ms` : "0ms" }}
        >
          {slide.subtitle}
        </p>

        <div
          className={`relative mt-8 inline-block transition-all ease-out motion-reduce:transition-none ${
            textIn
              ? "translate-y-0 scale-100 opacity-100 duration-800"
              : "translate-y-7 scale-90 opacity-0 duration-0"
          }`}
          style={{ transitionDelay: textIn ? `${btnDelay}ms` : "0ms" }}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
              textIn ? "opacity-100 delay-1800" : "opacity-0 duration-0"
            }`}
          >
            <span className="absolute -inset-1.5 animate-pulse bg-blue-500/30 [animation-duration:2.4s]" />
          </span>
          <a
            href={slide.href}
            onClick={(e) => jumpTo(e, slide.href)}
            className={`group/btn relative isolate inline-block overflow-hidden bg-blue-500 px-10 py-3.5 ${FONT} text-base font-bold uppercase tracking-wide text-white transition-colors duration-500 hover:text-blue-500`}
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
        className="pointer-events-none absolute bottom-3 left-1/2 z-20 h-10.5 w-75 -translate-x-1/2"
      >
        <path
          fill="#000"
          d="M0,60 C120,60 170,0 260,0 C350,0 400,60 520,60 Z"
        />
      </svg>

      <div
        aria-hidden="true"
        className={`absolute bottom-0 left-0 z-30 h-0.75 bg-blue-500 transition-[width] ease-linear ${
          barFull ? "w-full" : "w-0 duration-0"
        }`}
        style={barFull ? { transitionDuration: `${AUTOPLAY_MS}ms` } : undefined}
      />

      <button
        onClick={() => go(-1)}
        aria-label="Əvvəlki slayd"
        className="group/btn absolute left-8 top-1/2 z-30 isolate flex h-12 w-12 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-blue-500"
      >
        <span aria-hidden="true" className={SWEEP_BLUE} />
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Növbəti slayd"
        className="group/btn absolute right-8 top-1/2 z-30 isolate flex h-12 w-12 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-blue-500"
      >
        <span aria-hidden="true" className={SWEEP_BLUE} />
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
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
  );
}

function MobileHero() {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.max(0, Math.min(SLIDES.length - 1, i)));
    if (el.scrollLeft > 8) setTouched(true);
  };

  const goTo = (i) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section
      className="relative bg-black md:hidden"
      aria-roledescription="karusel"
      aria-label="Əsas slaydlar"
    >
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((s, i) => (
          <article
            key={i}
            aria-roledescription="slayd"
            aria-label={`${i + 1} / ${SLIDES.length}`}
            className="relative h-[72svh] max-h-150 min-h-110 w-full shrink-0 snap-center snap-always overflow-hidden bg-neutral-900"
          >
            <div
              className={`absolute inset-0 bg-cover bg-center transition-transform duration-6000 ease-out motion-reduce:transition-none ${
                active === i ? "scale-110" : "scale-100"
              }`}
              style={{ backgroundImage: `url(${s.image}), ${s.fallback}` }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-black/20" />
            <span
              className={`absolute right-5 top-5 ${FONT} text-xs font-bold tracking-[0.25em] text-white/70`}
            >
              0{i + 1} / 0{SLIDES.length}
            </span>
            <div
              className={`absolute inset-x-0 bottom-0 px-5 pb-8 transition-all duration-700 ease-out ${
                active === i
                  ? "translate-y-0 opacity-100"
                  : "translate-y-6 opacity-0"
              }`}
            >
              <span className="mb-3 block h-0.5 w-10 bg-blue-500" />
              <h2
                className={`${FONT} text-[38px] font-bold uppercase leading-[1.02] text-white`}
              >
                {s.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h2>
              <p
                className={`mt-3 ${FONT} text-sm uppercase tracking-[0.12em] text-blue-400`}
              >
                {s.subtitle}
              </p>
              <a
                href={s.href}
                onClick={(e) => jumpTo(e, s.href)}
                tabIndex={active === i ? 0 : -1}
                className={`mt-5 inline-flex items-center gap-2 bg-blue-500 px-6 py-3 ${FONT} text-sm font-bold uppercase tracking-wide text-white transition-transform active:scale-95`}
              >
                {s.button}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Slayd ${i + 1}`}
              aria-current={active === i}
              className="flex h-6 items-center"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  active === i ? "w-8 bg-blue-500" : "w-3 bg-white/25"
                }`}
              />
            </button>
          ))}
        </div>
        <div className="relative h-6 w-32">
          <span
            className={`absolute inset-0 flex items-center justify-end gap-1.5 ${FONT} text-xs uppercase tracking-[0.2em] text-neutral-400 transition-opacity duration-500 ${
              touched ? "opacity-0" : "opacity-100"
            }`}
          >
            <ChevronLeft className="h-4 w-4 animate-[fgSwipe_1.4s_ease-in-out_infinite] text-blue-400" />
            Sürüşdür
          </span>
          <span
            className={`absolute inset-0 flex items-center justify-end ${FONT} text-xs font-bold tracking-[0.25em] text-neutral-400 transition-opacity duration-500 ${
              touched ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-white">0{active + 1}</span>&nbsp;/ 0
            {SLIDES.length}
          </span>
        </div>
      </div>
    </section>
  );
}

function AboutCard({ card, index }) {
  const wide = index === 0;
  return (
    <div
      data-reveal
      className={`group/card ${REVEAL.up} ${wide ? "col-span-2 lg:col-span-1" : ""}`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <TiltCard
        className={`overflow-hidden bg-neutral-900 ${
          wide ? "aspect-16/9 lg:aspect-11/10" : "aspect-square lg:aspect-11/10"
        }`}
      >
        <img
          src={card.src}
          alt={card.alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-2000 ease-out group-data-in/card:scale-110 lg:duration-700 lg:group-data-in/card:scale-100 lg:group-hover/tilt:scale-110"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100 lg:block"
          style={{
            background:
              "radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(59,130,246,0.35), transparent 60%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/40 to-transparent px-4 pb-4 pt-12 lg:hidden">
          <span className="mb-2 block h-0.5 w-0 bg-blue-500 transition-all delay-500 duration-700 group-data-in/card:w-8" />
          <h3
            className={`translate-y-3 opacity-0 transition-all delay-300 duration-700 ease-out group-data-in/card:translate-y-0 group-data-in/card:opacity-100 ${FONT} font-bold uppercase leading-tight text-white ${
              wide ? "text-2xl" : "text-lg"
            }`}
          >
            {card.title}
          </h3>
        </div>
        <div className="absolute inset-0 hidden items-center justify-center bg-linear-to-br from-black/70 via-[#1a0933]/65 to-black/70 px-6 opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100 lg:flex">
          <h3
            className={`translate-y-4 text-center ${FONT} text-4xl font-bold uppercase leading-tight text-white/90 transition-transform duration-500 ease-out group-hover/tilt:translate-y-0`}
          >
            {card.title}
          </h3>
        </div>
        <span
          aria-hidden="true"
          className={`${SHINE} group-data-in/card:animate-[fgShine_1.3s_ease-out_0.6s_1_both] lg:group-data-in/card:animate-none lg:group-hover/tilt:animate-[fgShine_0.9s_ease-out_1_both]`}
        />
      </TiltCard>
    </div>
  );
}

function GameCard({ game, featured, index }) {
  return (
    <div
      data-reveal
      className={`group/card h-full ${featured ? `${REVEAL.left} col-span-2 lg:col-span-1 lg:row-span-2` : `${REVEAL.right} col-span-1`}`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <Link
        to={game.href}
        className={`group/game relative flex h-full flex-col justify-end overflow-hidden border border-white/10 bg-neutral-900 transition-[border-color,box-shadow,transform] duration-500 hover:border-blue-500/60 hover:shadow-[0_0_44px_-12px_rgba(59,130,246,0.7)] active:scale-[0.98] ${
          featured
            ? "min-h-95 md:min-h-110 lg:min-h-full"
            : "min-h-60 md:min-h-64"
        }`}
      >
        <img
          src={game.image}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-2000 ease-out group-data-in/card:scale-110 md:duration-700 md:group-data-in/card:scale-100 md:group-hover/game:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/55 to-black/10 transition-opacity duration-500" />
        <span
          aria-hidden="true"
          className={`${SHINE} group-data-in/card:animate-[fgShine_1.3s_ease-out_0.5s_1_both] md:group-data-in/card:animate-none md:group-hover/game:animate-[fgShine_0.9s_ease-out_1_both]`}
        />

        <span
          className={`absolute left-4 top-4 z-10 flex items-center justify-center bg-blue-500 text-white transition-transform duration-300 group-hover/game:scale-110 md:left-6 md:top-6 ${
            featured ? "h-12 w-12 md:h-14 md:w-14" : "h-10 w-10"
          }`}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-[fgPulseRing_2.2s_ease-out_infinite] bg-blue-500/60"
          />
          <Play
            className={`relative fill-white ${featured ? "h-5 w-5" : "h-4 w-4"}`}
          />
        </span>

        <div
          className={`relative z-10 ${featured ? "p-5 md:p-8" : "p-4 md:p-6"}`}
        >
          <div className="flex flex-wrap gap-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className={`border border-white/15 bg-black/40 px-2 py-0.5 ${FONT} text-[10px] uppercase tracking-wider text-neutral-200 backdrop-blur-sm md:text-[11px]`}
              >
                {tag}
              </span>
            ))}
          </div>
          <h3
            className={`mt-2 ${FONT} font-bold uppercase leading-[1.05] text-white ${
              featured ? "text-3xl md:text-[42px]" : "text-lg md:text-2xl"
            }`}
          >
            {game.title}
          </h3>
          <p
            className={`mt-2 ${BODY} leading-relaxed text-neutral-300 ${
              featured
                ? "max-w-md text-sm md:text-base"
                : "hidden text-sm md:line-clamp-2 md:block"
            }`}
          >
            {game.description}
          </p>
          <span
            className={`mt-3 inline-flex items-center gap-2 ${FONT} text-sm font-bold uppercase tracking-wide text-blue-400 md:mt-4`}
          >
            Oyna
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/game:translate-x-1.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}

function PodiumSpot({ player, rank, run }) {
  const s = PODIUM[rank];
  const delay = PODIUM_DELAY[PODIUM_ORDER.indexOf(rank)];
  const first = rank === 0;
  return (
    <div className="flex min-w-0 flex-col items-center">
      <div
        className={`flex w-full min-w-0 flex-col items-center transition-all duration-700 ease-out motion-reduce:transition-none ${
          run ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
        style={{ transitionDelay: `${delay + 350}ms` }}
      >
        {first && (
          <Crown className="mb-1 h-6 w-6 animate-[fgFloat_2.4s_ease-in-out_infinite] text-amber-300 md:h-8 md:w-8" />
        )}
        <span
          className={`rounded-full bg-linear-to-br p-0.75 ${s.ring} ${s.glow}`}
        >
          <span
            className={`flex items-center justify-center rounded-full border-2 border-[#0b0909] bg-linear-to-br ${avatarOf(player)} ${FONT} font-bold text-white ${
              first
                ? "h-16 w-16 text-xl md:h-22 md:w-22 md:text-3xl"
                : "h-12 w-12 text-base md:h-16 md:w-16 md:text-xl"
            }`}
          >
            {initials(player.name)}
          </span>
        </span>
        <p
          className={`mt-2 line-clamp-2 w-full px-1 text-center ${FONT} text-xs font-bold uppercase leading-tight tracking-wide text-white sm:text-sm md:text-lg`}
        >
          {player.name}
        </p>
        <p
          className={`w-full truncate px-1 text-center ${BODY} text-[11px] text-neutral-400 md:text-xs`}
        >
          {player.team}
        </p>
        <p className={`mt-1 ${FONT} text-lg font-bold md:text-2xl ${s.text}`}>
          <CountUp value={player.points.value} run={run} />
        </p>
      </div>
      <div
        className={`mt-3 flex w-full origin-bottom justify-center border-t-2 bg-linear-to-b ${s.block} ${s.height} transition-transform duration-700 ease-out motion-reduce:transition-none ${
          run ? "scale-y-100" : "scale-y-0"
        }`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <span
          className={`mt-1 ${FONT} text-3xl font-bold opacity-80 md:mt-2 md:text-5xl ${s.text}`}
        >
          {rank + 1}
        </span>
      </div>
    </div>
  );
}

function ContactField({
  icon: Icon,
  label,
  textarea = false,
  valid = false,
  ...props
}) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <label className="group/field relative block">
      <Tag
        placeholder=" "
        className={`peer block w-full border-b-2 border-white/10 bg-white/3 pb-3 pl-12 pr-10 pt-7 ${BODY} text-base text-white outline-none transition-colors duration-300 hover:bg-white/5 focus:border-transparent focus:bg-white/6 ${
          textarea ? "min-h-40 resize-none" : ""
        }`}
        {...props}
      />
      <Icon className="pointer-events-none absolute left-4 top-5.5 h-5 w-5 text-neutral-500 transition-colors duration-300 peer-focus:text-blue-400" />
      <span
        className={`pointer-events-none absolute left-12 top-5 ${FONT} text-base tracking-wide text-neutral-500 transition-all duration-200 peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-[0.18em] peer-focus:text-blue-400 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.18em]`}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 top-5.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white transition-all duration-300 ${
          valid ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        <Check className="h-3 w-3" />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-linear-to-r from-blue-500 to-cyan-400 transition-transform duration-500 ease-out peer-focus:scale-x-100"
      />
    </label>
  );
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function ContactForm() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [values, setValues] = useState({ name: "", email: "", message: "" });

  const set = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  const checks = {
    name: values.name.trim().length >= 2,
    email: EMAIL_RE.test(values.email.trim()),
    message: values.message.trim().length >= 10,
  };
  const ready = Object.values(checks).filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    setStatus("sending");
    setError("");
    try {
      const [res] = await Promise.all([
        fetch(CONTACT_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(formEl),
        }),
        wait(1200),
      ]);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.errors?.map((x) => x.message).join(", ") ||
            "Mesaj göndərilmədi.",
        );
      }
      formEl.reset();
      setValues({ name: "", email: "", message: "" });
      setStatus("success");
    } catch (err) {
      setError(
        `${err.message || "Mesaj göndərilmədi."} Bir az sonra yenidən cəhd et və ya birbaşa info@futgrid.az ünvanına yaz.`,
      );
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex h-full animate-[fgPop_0.5s_ease-out_both] flex-col items-center justify-center py-12 text-center"
      >
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-[fgPulseRing_1.8s_ease-out_infinite] rounded-full border-2 border-emerald-400/60"
          />
          <Check className="h-9 w-9" />
        </span>
        <h3
          className={`mt-6 ${FONT} text-3xl font-bold uppercase tracking-wide text-white`}
        >
          Mesajın göndərildi!
        </h3>
        <p
          className={`mt-2 max-w-sm ${BODY} text-[15px] leading-relaxed text-neutral-400`}
        >
          Təşəkkürlər. Mesajını aldıq, ən qısa zamanda e-poçtuna cavab
          yazacağıq.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className={`group/btn relative isolate mt-8 inline-flex items-center gap-2 overflow-hidden border border-blue-500 px-8 py-3 ${FONT} text-sm font-bold uppercase tracking-wide text-white`}
        >
          <span aria-hidden="true" className={SWEEP_BLUE} />
          Yeni mesaj yaz
        </button>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p
            className={`${FONT} text-xs uppercase tracking-[0.25em] text-blue-400`}
          >
            Forma
          </p>
          <h3
            className={`mt-1 ${FONT} text-3xl font-bold uppercase leading-none text-white md:text-4xl`}
          >
            Bizə yaz
          </h3>
        </div>
        <div className="text-right">
          <p
            className={`${FONT} text-[11px] uppercase tracking-[0.2em] text-neutral-500`}
          >
            Hazırdır
          </p>
          <p className={`${FONT} text-xl font-bold text-white`}>
            <span
              className={ready === 3 ? "text-emerald-400" : "text-blue-400"}
            >
              {ready}
            </span>
            <span className="text-neutral-600"> / 3</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1 overflow-hidden bg-white/10">
            <span
              className={`block h-full origin-left transition-transform duration-500 ease-out ${
                ready === 3 ? "bg-emerald-400" : "bg-blue-500"
              } ${i < ready ? "scale-x-100" : "scale-x-0"}`}
            />
          </span>
        ))}
      </div>

      <input type="hidden" name="_subject" value="FutGrid: yeni mesaj" />
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
      />

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ContactField
          icon={User}
          label="Ad və soyad"
          type="text"
          name="name"
          required
          minLength={2}
          autoComplete="name"
          value={values.name}
          onChange={set("name")}
          valid={checks.name}
        />
        <ContactField
          icon={Mail}
          label="E-poçt"
          type="email"
          name="email"
          required
          autoComplete="email"
          value={values.email}
          onChange={set("email")}
          valid={checks.email}
        />
      </div>

      <div className="relative mt-4">
        <ContactField
          icon={MessageSquare}
          label="Mesajın"
          textarea
          name="message"
          required
          minLength={10}
          maxLength={MESSAGE_MAX}
          rows={5}
          value={values.message}
          onChange={set("message")}
          valid={checks.message}
        />
        <span
          className={`pointer-events-none absolute bottom-3 right-3 ${FONT} text-xs tracking-wider ${
            values.message.length > MESSAGE_MAX * 0.9
              ? "text-amber-400"
              : "text-neutral-600"
          }`}
        >
          {values.message.length}/{MESSAGE_MAX}
        </span>
      </div>

      <div className="mt-7 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`max-w-xs ${BODY} text-xs leading-relaxed text-neutral-500`}
        >
          Məlumatların yalnız sənə cavab vermək üçün istifadə olunur.
        </p>
        <button
          type="submit"
          disabled={sending}
          aria-busy={sending}
          className={`group/btn relative isolate inline-flex w-full shrink-0 items-stretch justify-between overflow-hidden bg-blue-500 ${FONT} text-base font-bold uppercase tracking-wide text-white shadow-[0_12px_30px_-12px_rgba(59,130,246,0.9)] transition-[color,transform] duration-500 hover:text-blue-500 active:scale-[0.98] disabled:cursor-wait sm:w-auto sm:min-w-64`}
        >
          <span aria-hidden="true" className={SWEEP_WHITE} />
          <span className="flex items-center whitespace-nowrap px-8 py-4">
            {sending ? "Göndərilir..." : "Mesajı göndər"}
          </span>
          <span className="relative flex w-14 items-center justify-center overflow-hidden border-l border-white/25 bg-black/10">
            <Send
              className={`h-5 w-5 ${
                sending
                  ? "animate-[fgFly_0.9s_ease-in-out_infinite]"
                  : "transition-transform duration-300 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5 group-hover/btn:-rotate-12"
              }`}
            />
          </span>
        </button>
      </div>

      {status === "error" && (
        <p
          role="alert"
          className={`mt-5 border-l-2 border-rose-500 bg-rose-500/10 px-4 py-3 ${BODY} text-sm leading-relaxed text-rose-300`}
        >
          {error}
        </p>
      )}
    </form>
  );
}

export default function Home() {
  const [period, setPeriod] = useState("week");
  const [rowsIn, setRowsIn] = useState(false);

  const rootRef = useRef(null);
  const statsRef = useRef(null);
  const panelRef = useRef(null);
  const isDesktop = useMedia("(min-width: 768px)");
  const statsIn = useInView(statsRef, 0.3);
  const lbInView = useInView(panelRef, 0.15);

  useReveal(rootRef);
  useParallax(rootRef);

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

  const rows = [...PLAYERS]
    .sort((a, b) => b.points[period] - a.points[period])
    .map((p) => ({ ...p, points: { ...p.points, value: p.points[period] } }));
  const periodIndex = PERIODS.findIndex((p) => p.key === period);

  return (
    <div ref={rootRef} lang="az" className="w-full">
      <style>{KEYFRAMES}</style>

      <DesktopHero enabled={isDesktop} />
      <MobileHero />

      <section
        id="about"
        className="relative w-full overflow-hidden bg-[#0b0909] py-16 md:py-24"
      >
        <div
          aria-hidden="true"
          data-parallax="0.12"
          className="absolute inset-0 bg-cover bg-center will-change-transform"
          style={{ backgroundImage: `url(${ABOUT_BACKGROUND})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#0b0909]/80" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{ backgroundImage: NOISE }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-24 h-80 w-80 animate-[fgDrift_14s_ease-in-out_infinite] rounded-full bg-blue-600/20 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 animate-[fgDrift_18s_ease-in-out_infinite_reverse] rounded-full bg-fuchsia-600/15 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-330 px-4 md:px-6">
          <SectionHeading
            kicker="Futbol bilikini sına"
            title="Taktiki oyunlar & strategiya"
          />

          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:mt-14 lg:grid-cols-3 lg:gap-9">
            {CARDS.map((card, i) => (
              <AboutCard key={card.src} card={card} index={i} />
            ))}
          </div>

          <div
            ref={statsRef}
            className="mt-10 grid grid-cols-2 gap-3 md:mt-14 md:grid-cols-4 md:gap-6"
          >
            {STATS.map((s, i) => (
              <div
                key={s.label}
                data-reveal
                className={`${REVEAL.zoom} group relative overflow-hidden border border-white/10 bg-white/3 px-4 py-5 text-center backdrop-blur-sm transition-colors duration-300 hover:border-blue-500/50 md:py-7`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-blue-500 transition-transform delay-300 duration-700 group-data-in:scale-x-100"
                />
                <p
                  className={`${FONT} text-3xl font-bold text-white md:text-5xl`}
                >
                  <CountUp value={s.value} run={statsIn} duration={1600} />
                  <span className="text-blue-500">{s.suffix}</span>
                </p>
                <p
                  className={`mt-1 ${FONT} text-xs uppercase tracking-[0.2em] text-neutral-400 md:text-sm`}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-3xl text-center md:mt-14">
            <div data-reveal className={REVEAL.up}>
              <p
                className={`${FONT} text-base font-light leading-8 text-neutral-400 md:text-lg md:leading-9`}
              >
                FutGrid oyun həvəskarları üçün taktiki oyunların, reytinq
                cədvəllərinin və turnirlərin bir yerdə toplandığı platformadır.
                Burada komandanı qura, rəqiblərinlə yarışa və öz səviyyəni hər
                gün yüksəldə bilərsən. Sadəcə oyna, öyrən və liderlər cədvəlində
                yerini tut.
              </p>
            </div>
            <div
              data-reveal
              className={REVEAL.up}
              style={{ transitionDelay: "150ms" }}
            >
              <a
                href="#games"
                onClick={(e) => jumpTo(e, "#games")}
                className={`group/btn relative isolate mt-8 inline-flex items-center gap-2 overflow-hidden bg-blue-500 px-10 py-3.5 ${FONT} text-sm font-bold uppercase tracking-wide text-white transition-[color,transform] duration-500 hover:-translate-y-0.5 hover:text-blue-500 md:mt-10 md:px-12 md:text-base`}
              >
                <span aria-hidden="true" className={SWEEP_WHITE} />
                Oyunlara bax
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        id="games"
        className="relative w-full overflow-hidden bg-[#05060a] py-14 md:py-20"
      >
        <div
          aria-hidden="true"
          data-parallax="0.1"
          className="absolute inset-0 bg-cover bg-center will-change-transform"
          style={{ backgroundImage: `url(${GAMES_BACKGROUND})` }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#05060a]/85" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 animate-[fgGrid_2.5s_linear_infinite] opacity-25 mask-[linear-gradient(to_top,black,transparent)]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.45) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            transform: "perspective(420px) rotateX(58deg)",
            transformOrigin: "bottom",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-[#0b0909] to-transparent"
        />

        <div className="relative z-10 mx-auto max-w-330 px-4 md:px-6">
          <SectionHeading kicker="İndi kəşf et" title="Populyar oyunlar" />

          <div className="mt-10 grid grid-cols-2 gap-3 md:mt-14 md:gap-6 lg:grid-rows-2">
            {GAMES.map((game, i) => (
              <GameCard
                key={game.key}
                game={game}
                featured={i === 0}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        id="leaderboard"
        className="relative w-full overflow-hidden bg-[#0b0909] py-14 md:py-20"
      >
        <div
          aria-hidden="true"
          data-parallax="0.12"
          className="absolute inset-0 bg-cover bg-center will-change-transform"
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
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 animate-[fgDrift_16s_ease-in-out_infinite] rounded-full bg-amber-500/10 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-5xl px-4 md:px-6">
          <SectionHeading kicker="Ən yaxşılar" title="Reytinq cədvəli" />

          <div
            data-reveal
            className={`${REVEAL.up} mt-8 flex justify-center`}
            style={{ transitionDelay: "200ms" }}
          >
            <div
              className="relative grid grid-cols-3 border border-white/15 bg-black/40 p-1 backdrop-blur-sm"
              role="tablist"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] bg-blue-500 shadow-[0_0_24px_-6px_rgba(59,130,246,0.9)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1.15)]"
                style={{ transform: `translateX(${periodIndex * 100}%)` }}
              />
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={period === p.key}
                  onClick={() => changePeriod(p.key)}
                  className={`relative z-10 px-3 py-2 ${FONT} text-xs font-bold uppercase tracking-wide transition-colors duration-300 sm:px-5 md:px-7 md:text-base ${
                    period === p.key
                      ? "text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={panelRef}
            className="mx-auto mt-10 grid max-w-3xl grid-cols-3 items-end gap-2 sm:gap-4 md:mt-14"
          >
            {PODIUM_ORDER.map((rank) => (
              <PodiumSpot
                key={rank}
                player={rows[rank]}
                rank={rank}
                run={rowsIn}
              />
            ))}
          </div>

          <div className="mt-6 overflow-hidden border border-white/10 bg-[#0b0e14]/85 backdrop-blur-sm">
            <div
              className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3 ${FONT} text-xs font-bold uppercase tracking-[0.15em] text-neutral-400 md:grid-cols-[56px_1.6fr_1.2fr_80px_190px_100px] md:px-6`}
            >
              <span>#</span>
              <span>Oyunçu</span>
              <span className="hidden md:block">Komanda</span>
              <span className="hidden md:block">Matç</span>
              <span className="hidden md:block">Qələbə %</span>
              <span className="text-right">Xal</span>
            </div>

            {rows.slice(3).map((player, j) => {
              const i = j + 3;
              return (
                <div
                  key={player.name}
                  className={`border-b border-white/5 transition-all ease-out last:border-b-0 motion-reduce:transition-none ${
                    rowsIn
                      ? "translate-x-0 opacity-100 duration-500"
                      : "-translate-x-4 opacity-0 duration-0"
                  }`}
                  style={{
                    transitionDelay: rowsIn ? `${700 + j * 70}ms` : "0ms",
                  }}
                >
                  <div className="group grid grid-cols-[36px_1fr_auto] items-center gap-3 border-l-2 border-l-transparent px-4 py-3 transition-colors duration-300 hover:border-l-blue-500 hover:bg-blue-500/10 md:grid-cols-[56px_1.6fr_1.2fr_80px_190px_100px] md:px-6">
                    <span
                      className={`flex h-8 w-8 items-center justify-center bg-white/5 ${FONT} text-sm font-bold text-neutral-400 transition-colors duration-300 group-hover:bg-blue-500 group-hover:text-white`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${FONT} text-sm font-bold text-white md:h-10 md:w-10 ${avatarOf(player)}`}
                      >
                        {initials(player.name)}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`truncate ${FONT} text-base font-bold uppercase tracking-wide text-white md:text-lg`}
                        >
                          {player.name}
                        </p>
                        <p
                          className={`truncate ${BODY} text-xs text-neutral-400 md:hidden`}
                        >
                          {player.team}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`hidden truncate ${FONT} text-base font-light text-neutral-300 md:block`}
                    >
                      {player.team}
                    </span>
                    <span
                      className={`hidden ${FONT} text-base text-neutral-300 md:block`}
                    >
                      {player.matches}
                    </span>
                    <div className="hidden items-center gap-3 md:flex">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full bg-linear-to-r from-blue-600 to-cyan-400 transition-[width] ease-out motion-reduce:transition-none ${rowsIn ? "duration-700" : "duration-0"}`}
                          style={{
                            width: rowsIn ? `${player.winRate}%` : "0%",
                            transitionDelay: rowsIn
                              ? `${900 + j * 70}ms`
                              : "0ms",
                          }}
                        />
                      </div>
                      <span className={`${FONT} text-sm text-neutral-300`}>
                        {player.winRate}%
                      </span>
                    </div>
                    <span
                      className={`text-right ${FONT} text-lg font-bold text-white md:text-xl`}
                    >
                      <CountUp
                        value={player.points.value}
                        run={rowsIn}
                        duration={900}
                      />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p
            className={`mt-4 flex items-center justify-center gap-2 ${BODY} text-xs text-neutral-500`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            Reytinq hər həftə bazar ertəsi yenilənir
          </p>
        </div>
      </section>

      <section
        id="contact"
        className="relative w-full overflow-hidden bg-[#05060a] py-14 md:py-20"
      >
        <div
          aria-hidden="true"
          data-parallax="0.12"
          className="absolute inset-0 bg-cover bg-center will-change-transform"
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
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-1/4 h-96 w-96 animate-[fgDrift_15s_ease-in-out_infinite] rounded-full bg-blue-600/15 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-6">
          <SectionHeading kicker="Bizimlə əlaqə" title="Mesaj göndər" />

          <div
            data-reveal
            className={`${REVEAL.up} mt-10 md:mt-14`}
            style={{ transitionDelay: "150ms" }}
          >
            <div className="grid overflow-hidden border border-white/10 bg-[#0a0d14]/95 shadow-[0_40px_90px_-40px_rgba(59,130,246,0.55)] lg:grid-cols-[0.85fr_1.4fr]">
              <aside className="relative flex flex-col overflow-hidden bg-linear-to-br from-blue-600 via-blue-700 to-[#1a0933] p-6 md:p-10">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 animate-[fgDrift_12s_ease-in-out_infinite] rounded-full border-2 border-white/15"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 animate-[fgDrift_9s_ease-in-out_infinite_reverse] rounded-full bg-white/10"
                />

                <div className="relative">
                  <p
                    className={`${FONT} text-xs uppercase tracking-[0.25em] text-white/70`}
                  >
                    Əlaqə
                  </p>
                  <h3
                    className={`mt-1 ${FONT} text-3xl font-bold uppercase leading-none text-white md:text-4xl`}
                  >
                    Anketini yolla
                  </h3>
                  <p
                    className={`mt-4 ${BODY} text-[15px] leading-7 text-white/80`}
                  >
                    Sualın, təklifin və ya ideyan var? Bizə yaz, hər mesajı
                    oxuyub cavab veririk.
                  </p>

                  <div className="mt-6 flex flex-col gap-2">
                    {CONTACT_INFO.map(({ Icon, label, value, href }) => {
                      const Tag = href ? "a" : "div";
                      return (
                        <Tag
                          key={label}
                          href={href}
                          className="group flex items-center gap-4 p-2 transition-all duration-300 hover:translate-x-1 hover:bg-white/10"
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/25 bg-white/10 text-white transition-colors duration-300 group-hover:bg-white group-hover:text-blue-600">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block ${FONT} text-[11px] uppercase tracking-[0.18em] text-white/60`}
                            >
                              {label}
                            </span>
                            <span
                              className={`block truncate ${FONT} text-lg font-bold text-white`}
                            >
                              {value}
                            </span>
                          </span>
                        </Tag>
                      );
                    })}
                  </div>
                </div>

                <div className="relative mt-8 flex flex-wrap items-center justify-between gap-4 lg:mt-auto lg:pt-10">
                  <div className="inline-flex items-center gap-2.5 bg-black/25 px-3 py-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span
                      className={`${FONT} text-xs uppercase tracking-wider text-white`}
                    >
                      24 saat ərzində cavab
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {SOCIALS.map(({ Icon, href, label }) => (
                      <a
                        key={label}
                        href={href}
                        aria-label={label}
                        className="flex h-9 w-9 items-center justify-center border border-white/25 text-white transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:text-blue-600"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="relative p-6 md:p-10">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl"
                />
                <div className="relative h-full">
                  <ContactForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
