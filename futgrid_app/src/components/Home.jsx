import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Mail,
  MapPin,
  Send,
  Check,
  Crown,
  ArrowRight,
  User,
  MessageSquare,
  Plus,
  CalendarDays,
  Swords,
  TrendingUp,
} from "lucide-react";
import { SOCIAL_LINKS, externalProps } from "../lib/socials";
import { GAME_CATALOG } from "../lib/games/catalog";
import { prefetchData } from "../lib/data";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import heroPhoto from "../assets/slider2.webp";

import { tr } from "../i18n";
import { CONTACT_EMAIL } from "../lib/contact";
const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";
const HERO_FONT = "font-['Tektur',sans-serif]";

const PERIODS = [
  {
    key: "week",
    get label() {
      return tr("Həftəlik");
    },
    get short() {
      return tr("Həftə");
    },
  },
  {
    key: "month",
    get label() {
      return tr("Aylıq");
    },
    get short() {
      return tr("Ay");
    },
  },
  {
    key: "all",
    get label() {
      return tr("Bütün zamanlar");
    },
    get short() {
      return tr("Hamısı");
    },
  },
  {
    key: "elo",
    get label() {
      return tr("Duel Elo");
    },
    get short() {
      return tr("Elo");
    },
  },
];

const AVATAR_COLORS = [
  "bg-accent/12 text-accent",
  "bg-yellow/30 text-ink",
  "bg-navy text-white",
  "bg-good/15 text-good-hi",
];

const PODIUM = [
  {
    card: "border-yellow shadow-[0_26px_50px_-30px_rgba(176,122,0,0.7)]",
    num: "text-gold",
    points: "text-gold-hi",
    avatar: "fg-ping-gold bg-navy text-yellow",
  },
  {
    card: "border-dim/60",
    num: "text-dim",
    points: "text-ink",
    avatar: "bg-page-2 text-ink ring-3 ring-dim/60",
  },
  {
    card: "border-orange-400",
    num: "text-orange-600 dark:text-orange-300",
    points: "text-orange-700 dark:text-orange-300",
    avatar:
      "bg-orange-100 text-orange-800 ring-3 ring-orange-400 dark:bg-orange-400/15 dark:text-orange-200",
  },
];

const CONTACT_INFO = [
  {
    Icon: Mail,
    get label() {
      return tr("E-poçt");
    },
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    Icon: MapPin,
    get label() {
      return tr("Ünvan");
    },
    get value() {
      return tr("Bakı, Azərbaycan");
    },
  },
];

const MESSAGE_MAX = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const KEYFRAMES = `
@keyframes fgPulseRing { 0% { transform: scale(.9); opacity: .8; } 100% { transform: scale(1.7); opacity: 0; } }
@keyframes fgFly { 0% { transform: translate(0,0) rotate(0); opacity: 1; } 45% { transform: translate(34px,-26px) rotate(-12deg) scale(.6); opacity: 0; } 46% { transform: translate(-34px,26px) scale(.6); opacity: 0; } 100% { transform: translate(0,0) rotate(0); opacity: 1; } }
@keyframes fgPop { 0% { transform: scale(.85); opacity: 0; } 60% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); } }
@keyframes fgBallRoll { 0% { transform: translateX(-12vw) rotate(0deg); opacity: 0; } 6% { opacity: 1; } 70% { transform: translateX(104vw) rotate(1080deg); opacity: 1; } 71%,100% { transform: translateX(104vw) rotate(1080deg); opacity: 0; } }
@keyframes fgBallHop { 0%,100% { translate: 0 0; } 50% { translate: 0 -10px; } }
@keyframes fgColon { 0%,100% { opacity: 1; } 50% { opacity: .2; } }
@keyframes fgLive { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.7); } 70% { box-shadow: 0 0 0 7px rgba(239,68,68,0); } }
@keyframes fgFlood { 0%,100% { opacity: .55; } 50% { opacity: .9; } }
`;

const REVEAL_BASE =
  "transition-[opacity,translate,scale] duration-700 ease-out motion-reduce:transition-none";
const REVEAL = {
  up: `${REVEAL_BASE} translate-y-10 opacity-0 data-in:translate-y-0 data-in:opacity-100`,
  left: `${REVEAL_BASE} -translate-x-12 opacity-0 data-in:translate-x-0 data-in:opacity-100`,
  right: `${REVEAL_BASE} translate-x-12 opacity-0 data-in:translate-x-0 data-in:opacity-100`,
};

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const avatarOf = (player) => {
  const key = String(player.id ?? player.name ?? "");
  let hash = 0;
  for (let index = 0; index < key.length; index++)
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const pad = (n) => String(n).padStart(2, "0");

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
    const show = (el) => el.setAttribute("data-in", "true");
    const pending = () => root.querySelectorAll("[data-reveal]:not([data-in])");
    if (!("IntersectionObserver" in window)) {
      pending().forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          show(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    pending().forEach((el) => io.observe(el));
    let frame = 0;
    const sweep = () => {
      frame = 0;
      const limit = window.innerHeight * 0.96;
      pending().forEach((el) => {
        if (el.getBoundingClientRect().top < limit) {
          show(el);
          io.unobserve(el);
        }
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sweep);
    };
    const late = setTimeout(sweep, 1200);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      io.disconnect();
      clearTimeout(late);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
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

function Kicker({ children, center = true, className = "" }) {
  const line = "fg-ln h-0.5 w-10 bg-accent md:w-14";
  return (
    <p
      className={`flex items-center gap-3.5 ${center ? "justify-center" : ""} ${FONT} text-base font-bold uppercase tracking-widest text-accent md:text-lg ${className}`}
    >
      <span aria-hidden="true" className={line} />
      {children}
      {center && <span aria-hidden="true" className={line} />}
    </p>
  );
}

function SectionHeading({ kicker, children, center = true }) {
  return (
    <div data-reveal className={`${REVEAL.up} ${center ? "text-center" : ""}`}>
      <Kicker center={center}>{kicker}</Kicker>
      <h2
        className={`mt-2 ${FONT} text-4xl font-black uppercase leading-none text-ink sm:text-5xl md:text-6xl`}
      >
        {children}
      </h2>
    </div>
  );
}

function Marquee({ items, className, sep, sepClass, reverse = false }) {
  const row = [...items, ...items];
  return (
    <div
      className={`fg-marquee ${reverse ? "fg-marquee-rev" : ""} ${className}`}
    >
      {row.map((item, i) => (
        <span key={i} className="flex shrink-0 items-center gap-10 pr-10">
          <span>{item}</span>
          <span className={sepClass}>{sep}</span>
        </span>
      ))}
    </div>
  );
}

const roundDown = (n, step = 1000) =>
  `${String(Math.floor(n / step) * step).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}+`;

const HIGHLIGHT = "text-yellow light:text-gold-hi";
const STAR = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 fill-current">
    <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" />
  </svg>
);

function DailyCard() {
  const day = pad(new Date().getDate());
  return (
    <Link
      to="/oyunlar/karyera-yolu"
      aria-label={tr("Günün oyunçusu: Karyera yolu oyunu")}
      className="fg-fade group/daily relative z-10 mx-3.5 -mt-14 flex items-center gap-3.5 rounded-2xl border border-line/10 bg-surface/95 p-4 shadow-[0_24px_48px_-20px_var(--fg-shadow)] backdrop-blur-sm transition-[translate,border-color] duration-300 [animation-delay:.6s] hover:-translate-y-1 hover:border-accent/50 sm:absolute sm:bottom-9 sm:left-0 sm:mx-0 sm:mt-0 sm:block sm:w-75 sm:p-5"
    >
      <span
        aria-hidden="true"
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-current ${HERO_FONT} text-[22px] font-bold sm:hidden ${HIGHLIGHT}`}
      >
        ?
      </span>
      <span className="min-w-0 flex-1 sm:block">
        <span className="flex items-center justify-between gap-3">
          <span
            className={`${FONT} text-[11px] font-bold uppercase tracking-[0.16em] sm:text-xs ${HIGHLIGHT}`}
          >
            {tr("Günün oyunçusu")}
          </span>
          <span
            className={`hidden ${HERO_FONT} text-base font-bold text-accent sm:inline`}
          >
            #{day}
          </span>
        </span>
        <span
          className={`mt-1 block ${FONT} text-lg font-bold text-ink sm:mt-2.5 sm:text-[21px]`}
        >
          {tr("Bu gün kim gizlənib?")}
        </span>
        <span
          aria-hidden="true"
          className="mt-3.5 hidden grid-cols-6 gap-1.5 sm:grid"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className={`grid h-9.5 place-items-center rounded-md border border-line/15 ${HERO_FONT} text-base font-bold text-faint`}
            >
              ?
            </span>
          ))}
        </span>
        <span
          className={`mt-4 hidden items-center gap-2 ${FONT} text-[15px] font-bold tracking-[0.04em] text-accent sm:inline-flex`}
        >
          {tr("Tapmacanı həll et")}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/daily:translate-x-1" />
        </span>
      </span>
      <span
        aria-hidden="true"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-accent/15 text-accent sm:hidden"
      >
        <ArrowRight className="h-4.5 w-4.5" />
      </span>
    </Link>
  );
}

function HeroStat({ value, label, first = false }) {
  return (
    <div
      className={
        first ? "pr-6 sm:pr-8" : "border-l border-line/12 px-6 sm:px-8"
      }
    >
      <p
        className={`${HERO_FONT} text-2xl font-bold leading-none text-ink sm:text-[32px]`}
      >
        {value}
      </p>
      <p
        className={`mt-2 ${FONT} text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:text-[13px]`}
      >
        {label}
      </p>
    </div>
  );
}

function Hero({ stats }) {
  const players = stats?.players ?? 20000;
  const coaches = stats?.coaches ?? 2000;
  return (
    <section aria-label={tr("FutGrid oyunları")} className="relative bg-page">
      <div className="mx-auto grid w-full max-w-330 items-center gap-10 px-4 pb-12 pt-8 sm:pb-14 md:px-6 md:pt-12 lg:grid-cols-2 lg:gap-14 lg:pb-16 lg:pt-14">
        <div className="flex min-w-0 flex-col items-start">
          <p
            className={`fg-fade inline-flex items-center gap-2.5 rounded-full border border-yellow/35 px-3.5 py-2 ${FONT} text-xs font-bold uppercase tracking-[0.14em] light:border-gold/40 sm:text-[13px] ${HIGHLIGHT}`}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-current"
            />
            {tr("{n} futbol oyunu · Pulsuz", { n: GAME_CATALOG.length })}
          </p>

          <h1
            className={`mt-5 ${FONT} text-[44px] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] text-ink sm:mt-6 sm:text-6xl lg:text-[80px]`}
          >
            <span className="fg-mask">
              <span className="fg-rise [animation-delay:.1s]">
                {tr("Fərqli oyunları", null, "hero")}
              </span>
            </span>
            <span className="fg-mask">
              <span className={`fg-rise [animation-delay:.25s] ${HIGHLIGHT}`}>
                {tr("kəşf et", null, "hero")}
              </span>
            </span>
          </h1>

          <p
            className={`fg-fade mt-5 max-w-130 ${BODY} text-base leading-relaxed text-muted [animation-delay:.35s] sm:mt-6 md:text-[19px]`}
          >
            {tr(
              "Futbol Wordle, X0X, Karyera yolu və daha {n} oyun. Tək oyna, dostunla yarış, reytinqdə yüksəl.",
              { n: GAME_CATALOG.length - 3 },
            )}
          </p>

          <div className="fg-fade mt-7 grid w-full grid-cols-2 gap-2.5 [animation-delay:.45s] sm:mt-9 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
            <a
              href="#games"
              onClick={(e) => jumpTo(e, "#games")}
              className={`inline-flex h-13 items-center justify-center gap-3 rounded-[10px] bg-accent-lo px-5 ${FONT} text-[15px] font-bold uppercase tracking-[0.08em] text-white transition-[translate,background-color] duration-200 hover:-translate-y-0.5 hover:bg-accent sm:h-14 sm:px-7 sm:text-base`}
            >
              {tr("İndi oyna")}
              <ArrowRight className="h-4.5 w-4.5" strokeWidth={2.4} />
            </a>
            <Link
              to="/oyunlar"
              className={`inline-flex h-13 items-center justify-center rounded-[10px] border border-line/25 px-5 ${FONT} text-[15px] font-bold uppercase tracking-[0.08em] text-ink transition-colors duration-200 hover:border-line/60 sm:h-14 sm:px-7 sm:text-base`}
            >
              {tr("Bütün oyunlar")}
            </Link>
          </div>

          <div className="fg-fade mt-10 hidden flex-wrap [animation-delay:.55s] sm:flex lg:mt-13">
            <HeroStat first value={GAME_CATALOG.length} label={tr("oyun")} />
            <HeroStat value={roundDown(players)} label={tr("futbolçu")} />
            <HeroStat value={roundDown(coaches)} label={tr("məşqçi")} />
          </div>
        </div>

        <div className="relative min-w-0 sm:h-115 lg:h-140">
          <div
            aria-hidden="true"
            className="absolute left-0 top-4.5 z-10 sm:left-3 sm:top-12"
          >
            <div className="h-27.5 w-2.5 -skew-x-10 sm:h-47.5 sm:w-3.5">
              <div className="fg-bar-in h-full w-full bg-yellow" />
            </div>
          </div>
          <div className="fg-frame-in relative h-57.5 overflow-hidden rounded-2xl bg-surface [animation-delay:.2s] sm:absolute sm:inset-y-0 sm:left-10 sm:right-0 sm:h-auto sm:rounded-none sm:[clip-path:polygon(10%_0,100%_0,100%_100%,0_100%)]">
            <img
              src={heroPhoto}
              alt={tr("Stadionda telefonda FutGrid oynayan azarkeş")}
              fetchPriority="high"
              decoding="async"
              className="fg-kb absolute inset-0 h-full w-full object-cover object-[center_40%]"
            />
          </div>
          <DailyCard />
        </div>
      </div>

      <div className="overflow-hidden border-y border-line/8 bg-navy">
        <Marquee
          items={GAME_CATALOG.map((g) => g.title)}
          sep={STAR}
          sepClass="inline-flex text-yellow"
          className={`py-4 ${FONT} text-sm font-bold uppercase tracking-[0.16em] text-[#dbe4ff]`}
        />
      </div>
    </section>
  );
}

const BTN_PRIMARY = `inline-flex h-13 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-accent-lo px-4 ${FONT} text-sm font-bold uppercase tracking-[0.08em] text-white transition-[translate,background-color] duration-200 hover:-translate-y-0.5 hover:bg-accent sm:h-14 sm:gap-3 sm:px-7 sm:text-base`;
const BTN_GHOST = `inline-flex h-13 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-line/25 px-4 ${FONT} text-sm font-bold uppercase tracking-[0.08em] text-ink transition-colors duration-200 hover:border-line/60 sm:h-14 sm:gap-3 sm:px-7 sm:text-base`;
const CHIP = `rounded-md bg-line/6 px-2.5 py-1 ${FONT} text-xs font-bold uppercase tracking-[0.08em] text-ink-soft`;
const CHIP_HOT = `rounded-md bg-accent/15 px-2.5 py-1 ${FONT} text-xs font-bold uppercase tracking-[0.08em] text-accent`;
const PANEL =
  "rounded-[18px] border border-line/8 bg-surface shadow-[0_30px_60px_-40px_var(--fg-shadow)]";

const swapToPng = (e) => {
  const img = e.currentTarget;
  const png = img.src.replace(/\.webp$/, ".png");
  if (png !== img.src) img.src = png;
};

function SectionIntro({ children }) {
  return (
    <p
      data-reveal
      className={`${REVEAL.up} mx-auto mt-4 max-w-160 text-center ${BODY} text-base leading-relaxed text-muted md:mt-5 md:text-lg`}
    >
      {children}
    </p>
  );
}

function StepCard({ step, index }) {
  const Tag = step.href.startsWith("#") ? "a" : Link;
  const linkProps = step.href.startsWith("#")
    ? { href: step.href, onClick: (e) => jumpTo(e, step.href) }
    : { to: step.href };
  return (
    <li
      data-reveal
      className={`${REVEAL.up} list-none`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <Tag
        {...linkProps}
        className={`group/step flex h-full items-center gap-4 overflow-hidden p-3 transition-[translate,border-color] duration-300 hover:-translate-y-1 hover:border-accent/50 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0 ${PANEL}`}
      >
        <span className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-deep sm:aspect-16/10 sm:h-auto sm:w-full sm:rounded-none">
          <img
            src={step.image}
            alt={step.alt}
            loading="lazy"
            onError={swapToPng}
            className="absolute inset-0 h-full w-full object-cover transition-[scale] duration-700 ease-out group-hover/step:scale-105"
          />
          <span
            className={`absolute left-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-lg bg-yellow ${HERO_FONT} text-sm font-bold text-on-yellow sm:left-4 sm:top-4 sm:h-13 sm:w-13 sm:rounded-[14px] sm:text-[22px]`}
          >
            {pad(index + 1)}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2.5 sm:p-6">
          <span
            className={`${FONT} text-lg font-bold uppercase leading-tight text-ink sm:text-[26px] sm:leading-none`}
          >
            {step.title}
          </span>
          <span
            className={`${BODY} text-sm leading-relaxed text-muted max-sm:line-clamp-3 sm:text-[15px] sm:leading-relaxed`}
          >
            {step.text}
          </span>
          <span className="mt-auto hidden flex-wrap gap-1.5 pt-2 sm:flex">
            {step.chips.map((chip) => (
              <span key={chip.label} className={chip.hot ? CHIP_HOT : CHIP}>
                {chip.label}
              </span>
            ))}
          </span>
        </span>
      </Tag>
    </li>
  );
}

function HowItWorks({ signedIn }) {
  const more = GAME_CATALOG.length - 4;
  const steps = [
    {
      image: "/images/card2.png",
      alt: tr("Soyunma otağında taktika lövhəsi"),
      title: tr("Oyununu seç"),
      text: tr(
        "X0X, Wordle, Karyera yolu, Açıq artırma və daha {n} oyun. Hər birinin öz qaydası və çətinlik səviyyəsi var.",
        { n: more },
      ),
      chips: [
        { label: tr("{n} oyun", { n: GAME_CATALOG.length }) },
        { label: tr("Gündəlik tapmacalar") },
      ],
      href: "/oyunlar",
    },
    {
      image: "/images/card1.png",
      alt: tr("Divanda telefonla oynayan iki dost"),
      title: tr("Tək və ya dostla oyna"),
      text: tr(
        "Bota qarşı məşq et, ya da otaq yaradıb 6 rəqəmli kodu dostuna göndər — eyni anda onlayn yarışın.",
      ),
      chips: [
        { label: tr("Bota qarşı") },
        { label: tr("Onlayn otaq"), hot: true },
      ],
      href: "/oyunlar?filter=duo",
    },
    {
      image: "/images/card3.webp",
      alt: tr("Stadiona çıxan tunel"),
      title: tr("Xal topla, reytinqə qalx"),
      text: tr(
        "Hesabla oynadığın hər oyun xal gətirir. Həftəlik, aylıq və bütün zamanlar cədvəlində yerini tut.",
      ),
      chips: PERIODS.map((p) => ({ label: p.label })),
      href: "#leaderboard",
    },
  ];

  return (
    <section id="about" className="relative w-full bg-page py-16 md:py-24">
      <div className="relative mx-auto max-w-330 px-4 md:px-6">
        <SectionHeading kicker={tr("Necə işləyir")}>
          {tr("3 addımda")}{" "}
          <span className={HIGHLIGHT}>{tr("oyuna başla")}</span>
        </SectionHeading>
        <SectionIntro>
          {tr(
            "Qeydiyyat tələb olunmur — istədiyin oyunu aç və oyna. Hesab yalnız xal toplamaq və reytinqə düşmək üçün lazımdır.",
          )}
        </SectionIntro>

        <ol className="mt-9 grid gap-3 p-0 sm:grid-cols-3 sm:gap-5 md:mt-14 lg:gap-6">
          {steps.map((step, i) => (
            <StepCard key={step.title} step={step} index={i} />
          ))}
        </ol>

        <div
          data-reveal
          className={`${REVEAL.up} mt-9 grid grid-cols-2 gap-2.5 sm:flex sm:justify-center sm:gap-3 md:mt-12`}
        >
          <a
            href="#games"
            onClick={(e) => jumpTo(e, "#games")}
            className={BTN_PRIMARY}
          >
            {tr("Oyunlara bax")}
            <ArrowRight className="h-4.5 w-4.5" strokeWidth={2.4} />
          </a>
          {signedIn ? (
            <Link to="/oyunlar" className={BTN_GHOST}>
              {tr("Bütün oyunlar")}
            </Link>
          ) : (
            <Link to="/hesab" className={BTN_GHOST}>
              {tr("Hesab yarat")}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

const POPULAR = [
  { key: "x0x", badge: () => tr("Günün cədvəli") },
  { key: "ortaq" },
  { key: "auksion" },
];

function ModeChips({ game }) {
  const solo = game.tags.includes(tr("Bota qarşı"))
    ? tr("Bota qarşı")
    : tr("Tək");
  return (
    <span className="flex flex-wrap gap-1.5">
      {game.modes.includes("solo") && (
        <span className={`${CHIP} px-2 text-[11px]`}>{solo}</span>
      )}
      {game.modes.includes("duo") && (
        <span className={`${CHIP_HOT} px-2 text-[11px]`}>{tr("Dostla")}</span>
      )}
    </span>
  );
}

function GameCard({ game, badge, index }) {
  return (
    <li
      data-reveal
      className={`${REVEAL.up} w-65 shrink-0 snap-start list-none sm:w-auto`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <Link
        to={game.href}
        className={`group/game flex h-full flex-col overflow-hidden transition-[translate,border-color] duration-300 hover:-translate-y-1 hover:border-accent/50 ${PANEL}`}
      >
        <span className="relative block aspect-16/10 overflow-hidden bg-deep">
          <img
            src={game.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-[scale] duration-700 ease-out group-hover/game:scale-105"
          />
          {badge && (
            <span
              className={`absolute left-3.5 top-3.5 rounded-md bg-yellow px-2.5 py-1.5 ${FONT} text-xs font-extrabold uppercase tracking-[0.1em] text-on-yellow`}
            >
              {badge}
            </span>
          )}
        </span>
        <span className="flex flex-1 flex-col gap-2 p-5 sm:gap-2.5 sm:px-6 sm:pb-6 sm:pt-5.5">
          <span
            className={`${FONT} text-[11px] font-bold uppercase tracking-[0.16em] text-accent sm:text-xs`}
          >
            {game.genre}
          </span>
          <span
            className={`${FONT} text-[22px] font-bold uppercase leading-none text-ink sm:text-[26px]`}
          >
            {game.title}
          </span>
          <span
            className={`line-clamp-3 ${BODY} text-sm leading-relaxed text-muted sm:text-[15px] sm:leading-relaxed`}
          >
            {game.description}
          </span>
          <span className="mt-auto flex items-center justify-between gap-3 border-t border-line/8 pt-3.5">
            <ModeChips game={game} />
            <span
              className={`inline-flex shrink-0 items-center gap-2 ${FONT} text-sm font-bold uppercase tracking-widest text-accent`}
            >
              {tr("Oyna")}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/game:translate-x-1" />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

const ROOM_CODE = ["4", "8", "2", "9", "1", "3"];

function DuelBanner() {
  const duo = GAME_CATALOG.filter((g) => g.modes.includes("duo"));
  return (
    <div
      data-reveal
      className={`${REVEAL.up} relative mt-6 grid items-center gap-8 overflow-hidden rounded-[22px] border border-accent/20 bg-navy p-6 text-white sm:p-8 md:mt-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:px-11 lg:py-10`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.025)_0_90px,transparent_90px_180px)]"
      />
      <div className="relative min-w-0">
        <p
          className={`inline-flex items-center gap-2 ${FONT} text-xs font-bold uppercase tracking-[0.16em] text-yellow sm:text-[13px]`}
        >
          <span
            aria-hidden="true"
            className="fg-blink h-2 w-2 rounded-full bg-good-hi"
          />
          {tr("Yeni · Onlayn duel")}
        </p>
        <h3
          className={`mt-3 ${FONT} text-[34px] font-extrabold uppercase leading-none sm:text-[44px]`}
        >
          {tr("Dostunu çağır")}
        </h3>
        <p
          className={`mt-3.5 max-w-130 ${BODY} text-[15px] leading-relaxed text-navy-soft sm:text-[17px]`}
        >
          {tr(
            "Otaq yarat, 6 rəqəmli kodu dostuna göndər və eyni anda onlayn yarışın. Hesab açmaq tələb olunmur.",
          )}
        </p>
        <ul className="mt-4.5 hidden flex-wrap gap-1.5 p-0 sm:flex">
          {duo.map((g) => (
            <li key={g.key} className="list-none">
              <Link
                to={g.href}
                className={`block rounded-full border border-white/15 px-2.5 py-1 ${FONT} text-[13px] font-semibold text-[#dbe4ff] transition-colors duration-200 hover:border-yellow hover:text-yellow`}
              >
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-6.5 sm:flex sm:flex-wrap sm:gap-3">
          <Link
            to="/oyunlar?filter=duo"
            className={`inline-flex h-13 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-yellow px-4 ${FONT} text-sm sm:gap-2.5 sm:px-6 sm:text-[15px] font-extrabold uppercase tracking-[0.08em] text-on-yellow transition-[translate,filter] duration-200 hover:-translate-y-0.5 hover:brightness-110`}
          >
            <Plus className="h-4.5 w-4.5" strokeWidth={2.4} />
            {tr("Otaq yarat")}
          </Link>
          <Link
            to="/oyunlar?filter=duo"
            className={`inline-flex h-13 items-center justify-center whitespace-nowrap rounded-[10px] border border-white/25 px-4 ${FONT} text-sm sm:px-6 sm:text-[15px] font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:border-white/60`}
          >
            {tr("Koda qoşul")}
          </Link>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="relative order-first rounded-[18px] border border-white/8 bg-black/35 p-4 sm:p-7 lg:order-none"
      >
        <div
          className={`hidden items-center justify-between ${FONT} text-xs font-bold uppercase tracking-[0.16em] text-navy-soft sm:flex`}
        >
          <span>{tr("Otaq kodu")}</span>
          <span className="text-accent-hi">{GAME_CATALOG[0].title}</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:mt-3.5 sm:gap-2">
          {ROOM_CODE.map((d, i) => (
            <span
              key={i}
              className={`grid h-12 place-items-center rounded-[10px] border border-white/12 bg-white/5 ${HERO_FONT} text-2xl font-bold sm:h-17 sm:text-[34px]`}
            >
              {d}
            </span>
          ))}
        </div>
        <div className="mt-5.5 hidden items-center gap-3.5 sm:flex">
          <span
            className={`grid h-12 w-12 place-items-center rounded-full bg-accent-lo ${FONT} text-base font-extrabold`}
          >
            {tr("SƏN")}
          </span>
          <span className={`${FONT} text-xl font-extrabold text-navy-soft`}>
            VS
          </span>
          <span
            className={`grid h-12 w-12 place-items-center rounded-full border-2 border-dashed border-white/30 ${HERO_FONT} text-xl font-bold text-navy-soft`}
          >
            ?
          </span>
          <span
            className={`ml-auto inline-flex items-center gap-2 ${BODY} text-sm text-navy-soft`}
          >
            <span className="fg-blink h-2 w-2 rounded-full bg-yellow" />
            {tr("Rəqib gözlənilir…")}
          </span>
        </div>
      </div>
    </div>
  );
}

function PopularGames() {
  const games = POPULAR.map((p) => ({
    game: GAME_CATALOG.find((g) => g.key === p.key),
    badge: p.badge?.(),
  })).filter((p) => p.game);
  return (
    <section id="games" className="relative w-full bg-page py-16 md:py-24">
      <div className="relative mx-auto max-w-330 px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          <SectionHeading kicker={tr("İndi kəşf et")} center={false}>
            {tr("Populyar oyunlar")}
          </SectionHeading>
          <div data-reveal className={REVEAL.up}>
            <Link
              to="/oyunlar"
              className={`group/all inline-flex h-12 items-center gap-2.5 ${FONT} text-[15px] font-bold uppercase tracking-[0.08em] text-accent transition-colors hover:text-accent-hi md:text-base`}
            >
              {tr("Bütün {n} oyun", { n: GAME_CATALOG.length })}
              <ArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover/all:translate-x-1" />
            </Link>
          </div>
        </div>

        <ul className="-mx-4 mt-7 flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-10 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-6 [&::-webkit-scrollbar]:hidden">
          {games.map(({ game, badge }, i) => (
            <GameCard key={game.key} game={game} badge={badge} index={i} />
          ))}
        </ul>

        <DuelBanner />
      </div>
    </section>
  );
}

const PEDESTALS = [
  {
    place: 2,
    avatar:
      "h-14 w-14 border-slate-400/60 text-slate-500 dark:text-slate-300 text-[22px]",
    label: "text-muted",
    block:
      "h-24 sm:h-30 border-slate-400/30 bg-linear-to-b from-slate-400/25 to-slate-400/5 text-slate-500 dark:text-slate-300 text-4xl sm:text-[44px]",
  },
  {
    place: 1,
    avatar: `h-15 w-15 sm:h-17 sm:w-17 border-current text-[26px] ${HIGHLIGHT}`,
    label: HIGHLIGHT,
    block: `h-34 sm:h-42.5 border-yellow/40 bg-linear-to-b from-yellow/30 to-yellow/5 text-5xl sm:text-[56px] ${HIGHLIGHT}`,
  },
  {
    place: 3,
    avatar:
      "h-14 w-14 border-orange-400/60 text-orange-600 dark:text-orange-300 text-[22px]",
    label: "text-muted",
    block:
      "h-18 sm:h-22.5 border-orange-400/35 bg-linear-to-b from-orange-400/25 to-orange-400/5 text-orange-600 dark:text-orange-300 text-3xl sm:text-[38px]",
  },
];

const PODIUM_TITLE = {
  week: () => tr("Bu həftənin podiumu"),
  month: () => tr("Bu ayın podiumu"),
  all: () => tr("Bütün zamanların podiumu"),
  elo: () => tr("Duel reytinqi"),
};

function EmptyPodium({ period }) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden px-5 pt-6 sm:px-8 sm:pt-8 ${PANEL}`}
    >
      <p
        className={`${FONT} text-[13px] font-bold uppercase tracking-[0.16em] text-muted`}
      >
        {PODIUM_TITLE[period]()}
      </p>
      <p className={`mt-1.5 ${FONT} text-xl font-bold text-ink sm:text-2xl`}>
        {period === "elo"
          ? tr("Hələ reytinqli duel oyunçusu yoxdur —")
          : tr("Hələ heç kim xal toplamayıb —")}{" "}
        <span className={HIGHLIGHT}>{tr("ilk sən ol")}</span>
      </p>
      <div
        aria-hidden="true"
        className="mt-auto grid grid-cols-3 items-end gap-2.5 pt-8 sm:gap-3 sm:pt-9"
      >
        {PEDESTALS.map((p) => (
          <div
            key={p.place}
            className="flex min-w-0 flex-col items-center gap-2.5"
          >
            {p.place === 1 && (
              <Crown className={`h-7 w-7 ${HIGHLIGHT}`} strokeWidth={2} />
            )}
            <span
              className={`grid place-items-center rounded-full border-2 border-dashed ${HERO_FONT} font-bold ${p.avatar}`}
            >
              ?
            </span>
            <span
              className={`text-center ${FONT} text-xs font-bold uppercase tracking-[0.08em] sm:text-sm ${p.label}`}
            >
              {p.place === 1 ? tr("Sən ola bilərsən") : tr("Boş yer")}
            </span>
            <div
              className={`flex w-full justify-center rounded-t-xl border border-b-0 pt-3 ${HERO_FONT} font-bold leading-none sm:pt-3.5 ${p.block}`}
            >
              {p.place}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowElo({ signedIn }) {
  const rows = [
    {
      Icon: Swords,
      tone: "bg-accent/15 text-accent",
      title: tr("Dostunla və ya rəqiblə duel et"),
      text: tr("Hamı 1000 Elo ilə başlayır. Hər qələbə reytinqini artırır, məğlubiyyət azaldır."),
    },
    {
      Icon: TrendingUp,
      tone: `bg-yellow/15 ${HIGHLIGHT}`,
      title: tr("Güclünü ud — çox qazan"),
      text: tr(
        "Şahmatdakı kimi: özündən güclünü udanda çox, zəifi udanda az xal alırsan. Zəifə uduzmaq isə çox xal aparır.",
      ),
    },
    {
      Icon: Trophy,
      tone: "bg-accent/15 text-accent",
      title: tr("Cədvələ düş"),
      text: tr("Ən azı 5 reytinqli duel oynayan hesablar cədvəldə görünür."),
    },
  ];
  return (
    <div className={`flex flex-col p-5 sm:p-8 ${PANEL}`}>
      <p
        className={`${FONT} text-[13px] font-bold uppercase tracking-[0.16em] text-muted`}
      >
        {tr("Elo necə işləyir?")}
      </p>
      <ul className="mt-3 flex flex-col p-0 sm:mt-5">
        {rows.map(({ Icon, tone, title, text }) => (
          <li
            key={title}
            className="flex list-none gap-4 border-b border-line/6 py-3.5 last:border-b-0"
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span
                className={`block ${FONT} text-[17px] font-bold uppercase text-ink sm:text-[19px]`}
              >
                {title}
              </span>
              <span
                className={`mt-1 block ${BODY} text-sm leading-normal text-muted sm:text-[15px]`}
              >
                {text}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto grid grid-cols-2 gap-2.5 pt-5 sm:flex sm:gap-3 sm:pt-6">
        <Link to={signedIn ? "/oyunlar" : "/hesab"} className={BTN_PRIMARY}>
          {signedIn ? tr("Duel oyunları") : tr("Hesab yarat")}
        </Link>
      </div>
    </div>
  );
}

function HowToScore({ signedIn }) {
  const rows = [
    {
      Icon: User,
      tone: "bg-accent/15 text-accent",
      title: tr("Pulsuz hesab aç"),
      text: tr(
        "Daxil olmadan da oynaya bilərsən, amma xal yalnız hesaba yazılır.",
      ),
    },
    {
      Icon: Trophy,
      tone: "bg-accent/15 text-accent",
      title: tr("Oyna və qazan"),
      text: tr(
        "Hesabla oynadığın oyunların nəticəsi avtomatik olaraq xal kimi cədvələ düşür.",
      ),
    },
    {
      Icon: CalendarDays,
      tone: `bg-yellow/15 ${HIGHLIGHT}`,
      title: tr("Hər həftə yeni şans"),
      text: tr(
        "Həftəlik cədvəl hər bazar ertəsi yenilənir — hər həftə liderliyə qalxmaq olar.",
      ),
    },
  ];
  return (
    <div className={`flex flex-col p-5 sm:p-8 ${PANEL}`}>
      <p
        className={`${FONT} text-[13px] font-bold uppercase tracking-[0.16em] text-muted`}
      >
        {tr("Necə xal toplamaq olar?")}
      </p>
      <ul className="mt-3 flex flex-col p-0 sm:mt-5">
        {rows.map(({ Icon, tone, title, text }) => (
          <li
            key={title}
            className="flex list-none gap-4 border-b border-line/6 py-3.5 last:border-b-0"
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span
                className={`block ${FONT} text-[17px] font-bold uppercase text-ink sm:text-[19px]`}
              >
                {title}
              </span>
              <span
                className={`mt-1 block ${BODY} text-sm leading-normal text-muted sm:text-[15px]`}
              >
                {text}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto grid grid-cols-2 gap-2.5 pt-5 sm:flex sm:gap-3 sm:pt-6">
        {signedIn ? (
          <Link to="/oyunlar" className={BTN_PRIMARY}>
            {tr("Bütün oyunlar")}
          </Link>
        ) : (
          <Link to="/hesab" className={BTN_PRIMARY}>
            {tr("Hesab yarat")}
          </Link>
        )}
        <a
          href="#games"
          onClick={(e) => jumpTo(e, "#games")}
          className={BTN_GHOST}
        >
          {tr("İndi oyna")}
        </a>
      </div>
    </div>
  );
}

function TopCard({ player, rank, run }) {
  const s = PODIUM[rank];
  const first = rank === 0;
  return (
    <div
      className={`transition-[opacity,translate] duration-700 ease-out motion-reduce:transition-none ${
        run ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"
      }`}
      style={{ transitionDelay: `${rank * 120}ms` }}
    >
      <div
        className={`relative flex items-center gap-3 overflow-hidden border-3 bg-surface px-4 transition-[translate] duration-300 hover:translate-x-2 sm:gap-4 md:px-5.5 ${s.card} ${
          first ? "py-5" : "py-4"
        }`}
      >
        {first && (
          <>
            <span
              aria-hidden="true"
              className="fg-shine-gold pointer-events-none absolute inset-y-0 -left-22 w-17.5 -skew-x-20 bg-yellow/35"
            />
            <span
              className={`absolute right-3 top-2 flex items-center gap-1 ${FONT} text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-hi`}
            >
              <Crown className="h-3.5 w-3.5" />
              {tr("Lider")}
            </span>
          </>
        )}
        <span
          className={`relative w-9 shrink-0 text-center ${FONT} font-black leading-[0.8] ${s.num} ${
            first ? "fg-hop text-5xl md:text-[64px]" : "text-4xl md:text-[56px]"
          }`}
        >
          {rank + 1}
        </span>
        <span
          className={`relative grid shrink-0 place-items-center rounded-full ${FONT} font-black ${s.avatar} ${
            first
              ? "h-11 w-11 text-base sm:h-13 sm:w-13 sm:text-lg md:h-14.5 md:w-14.5 md:text-xl"
              : "h-11 w-11 text-base md:h-13 md:w-13 md:text-lg"
          }`}
        >
          {initials(player.name)}
        </span>
        <span className="relative min-w-0 flex-1">
          <span
            className={`block truncate ${FONT} font-black uppercase text-ink ${
              first
                ? "text-base sm:text-lg md:text-2xl"
                : "text-base md:text-[22px]"
            }`}
          >
            {player.name}
          </span>
          <span className={`block truncate ${BODY} text-[13px] text-muted`}>
            {player.team} · {player.winRate}
            {tr("% qələbə")}
          </span>
        </span>
        <span
          className={`relative shrink-0 ${FONT} font-black ${s.points} ${
            first ? "text-2xl md:text-[40px]" : "text-xl md:text-[34px]"
          }`}
        >
          <CountUp value={player.points.value} run={run} />
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
        className={`peer block w-full border-b-2 border-edge bg-page pb-3 pl-12 pr-10 pt-7 ${BODY} text-base text-ink outline-none transition-colors duration-300 hover:bg-page-2 focus:bg-surface focus:shadow-[0_0_0_1px_var(--fg-edge)] ${
          textarea ? "min-h-40 resize-none" : ""
        }`}
        {...props}
      />
      <Icon className="pointer-events-none absolute left-4 top-5.5 h-5 w-5 text-faint transition-colors duration-300 peer-focus:text-accent" />
      <span
        className={`pointer-events-none absolute left-12 top-5 ${FONT} text-base tracking-wide text-faint transition-all duration-200 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-[0.18em] peer-focus:text-accent peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-[0.18em]`}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 top-5.5 flex h-5 w-5 items-center justify-center rounded-full bg-good-lo text-white transition-all duration-300 ${
          valid ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        <Check className="h-3 w-3" />
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-500 ease-out peer-focus:scale-x-100"
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
      await Promise.all([
        api.post("/contact", {
          name: values.name,
          email: values.email,
          message: values.message,
          honeypot: formEl.querySelector('[name="_gotcha"]')?.value || "",
        }),
        wait(1200),
      ]);
      formEl.reset();
      setValues({ name: "", email: "", message: "" });
      setStatus("success");
    } catch (err) {
      setError(
        tr(
          "{v1} Bir az sonra yenidən cəhd et və ya birbaşa {email} ünvanına yaz.",
          { v1: err.message || "Mesaj göndərilmədi.", email: CONTACT_EMAIL },
        ),
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
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-good-lo/15 text-good">
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-[fgPulseRing_1.8s_ease-out_infinite] rounded-full border-2 border-good/60"
          />
          <Check className="h-9 w-9" />
        </span>
        <h3
          className={`mt-6 ${FONT} text-3xl font-black uppercase tracking-wide text-ink`}
        >
          {tr("Mesajın göndərildi!")}
        </h3>
        <p
          className={`mt-2 max-w-sm ${BODY} text-[15px] leading-relaxed text-muted`}
        >
          {tr(
            "Təşəkkürlər. Mesajını aldıq, ən qısa zamanda e-poçtuna cavab yazacağıq.",
          )}
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className={`mt-8 inline-flex items-center gap-2 border-2 border-ink px-8 py-3 ${FONT} text-sm font-extrabold uppercase tracking-wide text-ink transition-colors duration-300 hover:border-accent hover:bg-accent hover:text-white`}
        >
          {tr("Yeni mesaj yaz")}
        </button>
      </div>
    );
  }

  const sending = status === "sending";

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex items-end justify-between gap-4">
        <p
          className={`max-w-sm ${BODY} text-[15px] leading-relaxed text-muted`}
        >
          {tr("Ad, e-poçt və mesajını yaz — ən qısa zamanda cavab verəcəyik.")}
        </p>
        <div className="shrink-0 text-right">
          <p
            className={`${FONT} text-[11px] font-bold uppercase tracking-[0.2em] text-faint`}
          >
            {tr("Hazırdır")}
          </p>
          <p className={`${FONT} text-[22px] font-black text-ink`}>
            <span className={ready === 3 ? "text-good" : "text-accent"}>
              {ready}
            </span>
            <span className="text-dim"> / 3</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1 overflow-hidden bg-page-2">
            <span
              className={`block h-full origin-left transition-transform duration-500 ease-out ${
                ready === 3 ? "bg-good" : "bg-accent"
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
          label={tr("Ad və soyad")}
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
          label={tr("E-poçt")}
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
          label={tr("Mesajın")}
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
              ? "text-gold"
              : "text-faint"
          }`}
        >
          {values.message.length}/{MESSAGE_MAX}
        </span>
      </div>

      <div className="mt-7 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`max-w-xs ${BODY} text-xs leading-relaxed text-muted`}>
          {tr("Məlumatların yalnız sənə cavab vermək üçün istifadə olunur.")}
        </p>
        <button
          type="submit"
          disabled={sending}
          aria-busy={sending}
          className={`group/btn inline-flex w-full shrink-0 items-stretch justify-between bg-navy ${FONT} text-base font-extrabold uppercase tracking-[0.1em] text-white shadow-[0_16px_30px_-16px_var(--fg-shadow)] transition-[translate,background-color] duration-300 hover:-translate-y-0.5 hover:bg-accent active:translate-y-0 disabled:cursor-wait sm:w-auto sm:min-w-64`}
        >
          <span className="flex items-center whitespace-nowrap px-7 py-4">
            {sending ? tr("Göndərilir...") : tr("Mesajı göndər")}
          </span>
          <span className="relative flex w-14 items-center justify-center overflow-hidden bg-yellow text-on-yellow">
            <Send
              className={`h-5 w-5 ${
                sending
                  ? "animate-[fgFly_0.9s_ease-in-out_infinite]"
                  : "group-hover/btn:animate-[fgFly_0.7s_ease-in-out_1]"
              }`}
            />
          </span>
        </button>
      </div>

      {status === "error" && (
        <p
          role="alert"
          className={`mt-5 border-l-2 border-bad-lo bg-bad-lo/10 px-4 py-3 ${BODY} text-sm leading-relaxed text-bad-hi`}
        >
          {error}
        </p>
      )}
    </form>
  );
}

export default function Home() {
  useEffect(() => prefetchData(), []);
  const [period, setPeriod] = useState("week");
  const [rowsIn, setRowsIn] = useState(false);
  const [homeStats, setHomeStats] = useState(null);
  const [livePlayers, setLivePlayers] = useState(null);

  useEffect(() => {
    api
      .get("/stats")
      .then(setHomeStats)
      .catch(() => {});
    Promise.all(
      ["week", "month", "all"].map((key) =>
        api
          .get(`/leaderboard?period=${key}&limit=10`)
          .then((data) => [key, data.entries ?? []])
          .catch(() => [key, []]),
      ),
    ).then(async (results) => {
      const boards = {};
      const elo = await api
        .get("/leaderboard/elo?limit=10")
        .then((data) => data.entries ?? [])
        .catch(() => []);
      boards.elo = elo.map((entry) => ({
        id: entry.userId,
        name: entry.displayName,
        username: entry.username,
        avatarUrl: entry.avatarUrl,
        team: tr("{n} duel", { n: entry.games }),
        record: `${entry.wins}–${entry.losses}–${entry.draws}`,
        matches: entry.games ?? 0,
        winRate: entry.winRate ?? 0,
        points: { value: entry.rating },
      }));
      for (const [key, entries] of results) {
        boards[key] = entries
          .filter((e) => (e.points ?? 0) > 0)
          .sort((a, b) => b.points - a.points)
          .slice(0, 10)
          .map((entry) => ({
            id: entry.userId,
            name: entry.displayName,
            username: entry.username,
            avatarUrl: entry.avatarUrl,
            team: entry.team?.name ?? entry.team?.slug ?? "—",
            matches: entry.games ?? 0,
            winRate: entry.winRate ?? 0,
            points: { value: entry.points },
          }));
      }
      setLivePlayers(boards);
    });
  }, []);

  const { user } = useAuth();
  const signedIn = Boolean(user);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const lbInView = useInView(panelRef, 0.15);

  useReveal(rootRef);

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

  const rows = livePlayers?.[period] ?? [];
  return (
    <div ref={rootRef} className="w-full overflow-x-clip bg-page">
      <style>{KEYFRAMES}</style>

      <Hero stats={homeStats} />

      <HowItWorks signedIn={signedIn} />

      <PopularGames />

      <section
        id="leaderboard"
        className="relative w-full overflow-hidden bg-page py-20 md:py-28"
      >
        <div className="relative mx-auto max-w-330 px-4 md:px-6">
          <SectionHeading kicker={tr("Ən yaxşılar")}>
            {tr("Reytinq cədvəli")}
          </SectionHeading>

          <div
            data-reveal
            className={`${REVEAL.up} mt-7 flex justify-center`}
            style={{ transitionDelay: "150ms" }}
          >
            <div
              className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-line/8 bg-surface p-1 [scrollbar-width:none]"
              role="tablist"
              aria-label={tr("Dövr")}
            >
              {PERIODS.map((p) => {
                const on = period === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => changePeriod(p.key)}
                    className={`h-10 shrink-0 whitespace-nowrap rounded-full px-3 ${FONT} text-[12px] font-bold uppercase tracking-[0.06em] transition-colors duration-300 sm:h-11 sm:px-5.5 sm:text-sm ${
                      on
                        ? "bg-accent-lo text-white"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    <span className="sm:hidden">{p.short}</span>
                    <span className="hidden sm:inline">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {rows.length === 0 ? (
            <div
              ref={panelRef}
              data-reveal
              className={`${REVEAL.up} mt-8 grid gap-4 md:mt-10 lg:grid-cols-[1.1fr_1fr] lg:gap-6`}
            >
              <EmptyPodium period={period} />
              {period === "elo" ? <HowElo signedIn={signedIn} /> : <HowToScore signedIn={signedIn} />}
            </div>
          ) : (
            <div
              ref={panelRef}
              className="mt-10 grid gap-6 md:mt-11 lg:grid-cols-[1fr_1.3fr] lg:items-start"
            >
              <div className="flex flex-col gap-4">
                {rows.slice(0, 3).map((player, rank) => (
                  <TopCard
                    key={player.id ?? player.name}
                    player={player}
                    rank={rank}
                    run={rowsIn}
                  />
                ))}
              </div>

              <div className="overflow-hidden border border-edge bg-surface">
                <div
                  className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b-2 border-ink px-4 py-3.5 ${FONT} text-xs font-extrabold uppercase tracking-[0.16em] text-muted md:grid-cols-[44px_1fr_140px_80px] md:px-5.5`}
                >
                  <span>#</span>
                  <span>{tr("Oyunçu")}</span>
                  <span className="hidden md:block">
                    {period === "elo" ? tr("Q–M–H") : tr("Komanda")}
                  </span>
                  <span className="text-right">{period === "elo" ? "Elo" : tr("Xal")}</span>
                </div>

                {rows.slice(3).map((player, j) => {
                  const i = j + 3;
                  return (
                    <div
                      key={player.id ?? player.name}
                      className={`border-b border-page-2 transition-all ease-out last:border-b-0 motion-reduce:transition-none ${
                        rowsIn
                          ? "translate-x-0 opacity-100 duration-500"
                          : "translate-x-6 opacity-0 duration-0"
                      }`}
                      style={{
                        transitionDelay: rowsIn ? `${400 + j * 70}ms` : "0ms",
                      }}
                    >
                      <div className="group grid grid-cols-[32px_1fr_auto] items-center gap-3 px-4 py-3 transition-[background-color,box-shadow] duration-200 hover:bg-accent/5 hover:shadow-[inset_4px_0_0_var(--fg-accent)] md:grid-cols-[44px_1fr_140px_80px] md:px-5.5">
                        <span
                          className={`${FONT} text-sm font-black text-muted transition-colors duration-200 group-hover:text-accent`}
                        >
                          {pad(i + 1)}
                        </span>
                        <div className="flex min-w-0 items-center gap-3">
                          {player.avatarUrl ? (
                            <img
                              src={player.avatarUrl}
                              alt=""
                              className="h-8.5 w-8.5 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <span
                              className={`grid h-8.5 w-8.5 shrink-0 place-items-center rounded-full ${FONT} text-[13px] font-black ${avatarOf(player)}`}
                            >
                              {initials(player.name)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p
                              className={`truncate ${FONT} text-base font-extrabold uppercase text-ink md:text-[17px]`}
                            >
                              {player.name}
                            </p>
                            <p
                              className={`truncate ${BODY} text-xs text-muted md:hidden`}
                            >
                              {player.team}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`hidden truncate ${BODY} text-sm text-muted md:block`}
                        >
                          {player.record ?? player.team}
                        </span>
                        <span
                          className={`text-right ${FONT} text-lg font-black text-ink md:text-[19px]`}
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
            </div>
          )}

          {rows.length > 0 && (
            <p
              className={`mt-5 flex items-center justify-center gap-2 ${BODY} text-xs text-muted`}
            >
              <Trophy className="h-3.5 w-3.5 text-gold" />
              {period === "elo"
                ? tr("Elo hər duel bitəndə yenilənir · cədvəldə ən azı 5 duel oynayanlar görünür")
                : tr("Reytinq hər həftə bazar ertəsi yenilənir")}
            </p>
          )}
        </div>
      </section>

      <section
        id="contact"
        className="relative w-full overflow-hidden bg-page pb-24 pt-8 md:pb-28 md:pt-10"
      >
        <div className="relative mx-auto max-w-330 px-4 md:px-6">
          <SectionHeading kicker={tr("Bizimlə əlaqə")}>
            {tr("Bizə yaz")}
          </SectionHeading>

          <div
            data-reveal
            className={`${REVEAL.up} mt-10 md:mt-11`}
            style={{ transitionDelay: "150ms" }}
          >
            <div className="grid bg-surface shadow-[0_40px_80px_-50px_var(--fg-shadow)] lg:grid-cols-[0.85fr_1.4fr]">
              <aside className="relative flex flex-col overflow-hidden bg-accent p-7 text-white md:p-10 lg:pr-16 lg:[clip-path:polygon(0_0,100%_0,92%_100%,0_100%)]">
                <span
                  aria-hidden="true"
                  className="fg-halftone-w fg-drift absolute bottom-0 right-0 h-3/5 w-[70%]"
                />

                <div className="relative">
                  <p
                    className={`${FONT} text-[13px] font-extrabold uppercase tracking-[0.2em] text-yellow`}
                  >
                    {tr("Əlaqə məlumatları")}
                  </p>
                  <p
                    className={`mt-3 max-w-xs ${BODY} text-[15px] leading-relaxed text-white/85`}
                  >
                    {tr(
                      "Sualın, təklifin və ya ideyan var? Bizə yaz, hər mesajı oxuyub cavab veririk.",
                    )}
                  </p>

                  <div className="mt-7 flex flex-col gap-3">
                    {CONTACT_INFO.map(({ Icon, label, value, href }) => {
                      const Tag = href ? "a" : "div";
                      return (
                        <Tag
                          key={label}
                          href={href}
                          target={
                            href?.startsWith("http") ? "_blank" : undefined
                          }
                          rel={
                            href?.startsWith("http")
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className="group flex items-center gap-3.5"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center bg-white/15 transition-[background-color,color,rotate] duration-300 group-hover:-rotate-8 group-hover:bg-yellow group-hover:text-on-yellow">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block ${FONT} text-[11px] uppercase tracking-[0.2em] text-white/70`}
                            >
                              {label}
                            </span>
                            <span
                              className={`block truncate ${BODY} font-bold`}
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
                  <div className="inline-flex items-center gap-2.5 bg-black/20 px-3 py-1.5">
                    <span className="fg-blink h-2 w-2 rounded-full bg-good-hi" />
                    <span
                      className={`${FONT} text-xs font-bold uppercase tracking-wider`}
                    >
                      {tr("24 saat ərzində cavab")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {SOCIAL_LINKS.map(({ key, Icon, href, label }) => (
                      <a
                        key={key}
                        href={href}
                        {...externalProps(href)}
                        aria-label={label}
                        className="grid h-9 w-9 place-items-center border border-white/30 transition-[translate,background-color,color] duration-300 hover:-translate-y-1 hover:bg-yellow hover:text-on-yellow"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="relative p-6 md:p-10">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
