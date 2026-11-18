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
  Gavel,
} from "lucide-react";
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa";
import { GAME_CATALOG } from "../lib/games/catalog";
import { loadClubs, norm, prefetchData } from "../lib/data";
import { api } from "../lib/api";
import slide2 from "../assets/slider2.webp";

import { tr } from "../i18n";
const FONT = "font-['Roboto_Condensed',sans-serif]";
const BODY = "font-['Roboto',sans-serif]";
const HERO_FONT = "font-['Tektur',sans-serif]";

const SLIDES = [
  {
    image: "/images/slider1.webp",
    fallback: "/images/slider1.png",
    get lines() {
      return tr("Futbol|Taktikanı|Göstər").split("|");
    },
    get subtitle() {
      return tr("Klubları və oyunçuları tanı, matçı qazan");
    },
    get button() {
      return tr("Daha ətraflı");
    },
    href: "#games",
  },
  {
    image: slide2,
    fallback: "/images/slider2.png",
    get lines() {
      return tr("Fərqli|oyunları|kəşf et").split("|");
    },
    get subtitle() {
      return tr("Taktiki oyunların yeni formatını kəşf et");
    },
    get button() {
      return tr("Oyunlara bax");
    },
    href: "#games",
  },
  {
    image: "/images/slider3.webp",
    fallback: "/images/slider3.png",
    get lines() {
      return tr("Reytinqdə|zirvəyə|yüksəl").split("|");
    },
    get subtitle() {
      return tr("Xal topla və liderlər cədvəlinə qalx");
    },
    get button() {
      return tr("Reytinqə bax");
    },
    href: "#leaderboard",
  },
];

const AUTOPLAY_MS = 5500;

// Zolaqdakı klublar: ad + datadakı adla uyğunlaşdırmaq üçün açar sözlər (loqo üçün).
const TAPE_CLUBS = [
  { label: "Real Madrid", keys: ["real madrid"] },
  { label: "Barcelona", keys: ["barcelona", "fc barcelona"] },
  { label: "Liverpool", keys: ["liverpool", "liverpool fc"] },
  { label: "Qarabağ", keys: ["qarabag", "qarabag fk", "qarabag agdam"] },
  { label: "Bayern", keys: ["bayern munich", "bayern munchen", "fc bayern munchen", "bayern"] },
  { label: "Inter", keys: ["inter", "internazionale", "inter milan", "fc internazionale milano"] },
  { label: "PSG", keys: ["paris saint germain", "psg", "paris sg"] },
  { label: "Arsenal", keys: ["arsenal", "arsenal fc"] },
  { label: "Man City", keys: ["manchester city", "man city"] },
  { label: "Juventus", keys: ["juventus"] },
  { label: "Milan", keys: ["ac milan", "milan"] },
  { label: "Chelsea", keys: ["chelsea", "chelsea fc"] },
];

function useTapeLogos() {
  const [logos, setLogos] = useState({});
  useEffect(() => {
    let alive = true;
    loadClubs()
      .then((clubs) => {
        const byName = new Map();
        for (const c of clubs ?? [])
          if (c.logo_url && !byName.has(norm(c.name))) byName.set(norm(c.name), c.logo_url);
        const out = {};
        for (const t of TAPE_CLUBS) {
          const hit = t.keys.map((k) => byName.get(k)).find(Boolean);
          if (hit) out[t.label] = hit;
        }
        if (alive) setLogos(out);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return logos;
}

// Loqo şəkillərinin ətrafındakı boş (şəffaf) sahə müxtəlifdir, ona görə dairədə
// mərkəzdə dayanmırlar. Şəkli kəsib real konturuna görə mərkəzləyirik (CORS icazə versə).
const trimmedLogos = new Map();
const logoTone = new Map();
function useTrimmedLogo(url) {
  const [src, setSrc] = useState(() => (url ? trimmedLogos.get(url) ?? url : url));
  const [tone, setTone] = useState(() => logoTone.get(url));
  useEffect(() => {
    if (!url) return;
    if (trimmedLogos.has(url)) {
      setSrc(trimmedLogos.get(url));
      setTone(logoTone.get(url));
      return;
    }
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, w, h);
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const solid = data[i + 3] > 12 && !(data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245);
            if (solid) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        if (x1 < 0) return;
        // Loqonun ümumi parlaqlığı: tünd loqolar ağ dairədə, açıq/ağ loqolar tünd dairədə göstərilir.
        let lum = 0, n = 0;
        for (let i = 0; i < data.length; i += 16)
          if (data[i + 3] > 12) {
            lum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            n++;
          }
        logoTone.set(url, n && lum / n < 70 ? "dark" : "light");
        const side = Math.max(x1 - x0 + 1, y1 - y0 + 1);
        const out = document.createElement("canvas");
        out.width = out.height = side;
        out
          .getContext("2d")
          .drawImage(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1, (side - (x1 - x0 + 1)) / 2, (side - (y1 - y0 + 1)) / 2, x1 - x0 + 1, y1 - y0 + 1);
        const result = out.toDataURL("image/png");
        trimmedLogos.set(url, result);
        if (alive) {
          setSrc(result);
          setTone(logoTone.get(url));
        }
      } catch {
        trimmedLogos.set(url, url);
      }
    };
    img.onerror = () => trimmedLogos.set(url, url);
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return { src, tone };
}

function TapeClub({ label, logo }) {
  const [broken, setBroken] = useState(false);
  const { src, tone } = useTrimmedLogo(logo);
  return (
    <span className="inline-flex items-center gap-2.5 md:gap-3.5">
      {logo && !broken && (
        <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ${tone === "dark" ? "bg-white" : "bg-[radial-gradient(circle_at_35%_30%,#1d2c5c,#0b1430)]"} shadow-[0_6px_14px_-6px_rgba(0,0,0,.6)] ring-2 ring-yellow/80 animate-[fgPop_0.5s_ease-out_both] md:h-11 md:w-11`}>
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setBroken(true)}
            className="block h-6 max-h-6 w-6 max-w-6 object-contain object-center md:h-7.5 md:max-h-7.5 md:w-7.5 md:max-w-7.5"
          />
        </span>
      )}
      {label}
    </span>
  );
}

const CARDS = [
  {
    src: "/images/card1.webp",
    fallback: "/images/card1.png",
    get alt() {
      return tr("Oyun zalı 1");
    },
    get title() {
      return tr("Oyun studiyası");
    },
  },
  {
    src: "/images/card2.webp",
    fallback: "/images/card2.png",
    get alt() {
      return tr("Oyun zalı 2");
    },
    get title() {
      return tr("Taktika zalı");
    },
  },
  {
    src: "/images/card3.webp",
    fallback: "/images/card3.png",
    get alt() {
      return tr("Oyun zalı 3");
    },
    get title() {
      return tr("Turnir arenası");
    },
  },
];

const CARD_TILT = ["-rotate-2", "rotate-[1.5deg]", "-rotate-1"];

const CARD_TAPE = [
  "-rotate-3 bg-[var(--fg-tape)]",
  "rotate-2 bg-[var(--fg-tape-2)]",
  "rotate-4 bg-[var(--fg-tape)]",
];

const STATS = [
  {
    value: 15900,
    suffix: "+",
    get label() {
      return tr("Oyunçu");
    },
  },
  {
    value: 433,
    suffix: "",
    get label() {
      return tr("Klub");
    },
  },
  {
    value: 220,
    suffix: "",
    get label() {
      return tr("Ölkə");
    },
  },
  {
    value: 1800,
    suffix: "+",
    get label() {
      return tr("Məşqçi");
    },
  },
];

const GAMES = [
  {
    key: "x0x",
    get title() {
      return tr("Futbol X0X");
    },
    get description() {
      return tr(
        "Sətir və sütundakı klub, ölkə, məşqçi və kubokların kəsişməsində oynamış futbolçunu tap. Üç xananı bir xətdə tutan qalib olur.",
      );
    },
    get tags() {
      return ["2 oyunçu", "Tək oyunçu", "3 səviyyə"].map((s) => tr(s));
    },
    href: "/oyunlar/futbol-x0x",
  },
  {
    key: "ortaq",
    get title() {
      return tr("Ortaq Oyunçu");
    },
    get description() {
      return tr("Kartları gizli seç, açılanda ortaq futbolçunu birinci tap.");
    },
    get tags() {
      return ["Kart dueli", "2 oyunçu"].map((s) => tr(s));
    },
    href: "/oyunlar/ortaq-oyuncu",
  },
  {
    key: "auksion",
    get title() {
      return tr("Açıq Artırma");
    },
    get description() {
      return tr(
        "20 ₼ büdcə ilə hərraca gir, 5 oyunçuluq komanda yığ. Ən güclü heyəti quran qalib olur.",
      );
    },
    get tags() {
      return ["Hərrac", "20 ₼ büdcə"].map((s) => tr(s));
    },
    href: "/oyunlar/auksion",
  },
];

const PERIODS = [
  {
    key: "week",
    get label() {
      return tr("Həftəlik");
    },
  },
  {
    key: "month",
    get label() {
      return tr("Aylıq");
    },
  },
  {
    key: "all",
    get label() {
      return tr("Bütün zamanlar");
    },
  },
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
    get name() {
      return tr("İsfendiyare memmedova");
    },
    team: "Efqanistan",
    matches: 110,
    winRate: 69,
    points: { week: 2050, month: 7430, all: 29870 },
  },
  {
    get name() {
      return tr("Elcin İbrahmov");
    },
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
    get name() {
      return tr("İdris Muellim");
    },
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
    value: "info@futgrid.az",
    href: "mailto:info@futgrid.az",
  },
  {
    Icon: Phone,
    get label() {
      return tr("Telefon");
    },
    value: "+994 50 000 00 00",
    href: "tel:+994500000000",
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

const SOCIALS = [
  {
    Icon: FaInstagram,
    href: "https://www.instagram.com/futgrid.az",
    get label() {
      return tr("Instagram");
    },
  },
  {
    Icon: FaTiktok,
    href: "#",
    get label() {
      return tr("TikTok");
    },
  },
  {
    Icon: FaYoutube,
    href: "#",
    get label() {
      return tr("YouTube");
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

// Klassik futbol topu (SVG)
function SoccerBall({ className = "" }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <circle cx="32" cy="32" r="30" fill="#fff" stroke="#0b1430" strokeWidth="3" />
      <path d="M32 19 L43 27 L39 40 L25 40 L21 27 Z" fill="#0b1430" />
      <path d="M32 19 L32 6 M43 27 L55 22 M39 40 L47 51 M25 40 L17 51 M21 27 L9 22" stroke="#0b1430" strokeWidth="2.5" />
      <path d="M26 4.5 L32 6 L38 4.5 M57.5 18 L55 22 L59 28 M50 52 L47 51 L42 58 M22 58 L17 51 L14 52 M5 28 L9 22 L6.5 18" fill="#0b1430" stroke="#0b1430" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

// Meydança xətləri (şəkil üzərində)
function PitchOverlay() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 300"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-30 mix-blend-screen"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
    >
      <line x1="200" y1="0" x2="200" y2="300" />
      <circle cx="200" cy="150" r="48" />
      <circle cx="200" cy="150" r="3" fill="#fff" />
      <rect x="0" y="80" width="62" height="140" />
      <rect x="0" y="118" width="22" height="64" />
      <path d="M62 122 A 34 34 0 0 1 62 178" />
      <rect x="338" y="80" width="62" height="140" />
      <rect x="378" y="118" width="22" height="64" />
      <path d="M338 122 A 34 34 0 0 0 338 178" />
    </svg>
  );
}

// LED tablo: canlı matç hissi
function Scoreboard() {
  return (
    <div className="fg-pop-float absolute left-2 top-2 z-10 -rotate-3 [--d:.8s] [--f:5.2s] sm:left-6 sm:top-6">
      <div className="overflow-hidden rounded-xl border-2 border-[#2a3557] bg-[#070b16] shadow-[0_22px_44px_-24px_rgba(0,0,0,.9)]">
        <div className="flex items-center justify-between gap-3 bg-[#0f1830] px-2.5 py-1">
          <span className={`flex items-center gap-1.5 ${FONT} text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/80 sm:text-[10px]`}>
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-[fgLive_1.4s_ease-out_infinite]" />
            {tr("Canlı")}
          </span>
          <span className={`${FONT} text-[10px] font-black text-yellow sm:text-xs`}>90+2&apos;</span>
        </div>
        <div className={`flex items-center gap-2 px-2.5 py-1.5 ${FONT} font-black uppercase sm:gap-3 sm:px-3.5 sm:py-2`}>
          <span className="text-[11px] tracking-wide text-white sm:text-sm">FutGrid</span>
          <span className="flex items-center gap-1 rounded-md bg-black px-2 py-0.5 font-mono text-base text-[#ffd23d] [text-shadow:0_0_8px_#ffb300] sm:text-xl">
            3<span className="animate-[fgColon_1s_steps(1)_infinite]">:</span>1
          </span>
          <span className="text-[11px] tracking-wide text-white/70 sm:text-sm">{tr("Rəqib")}</span>
        </div>
      </div>
    </div>
  );
}

const REVEAL_BASE =
  "transition-[opacity,translate,scale] duration-700 ease-out motion-reduce:transition-none";
const REVEAL = {
  up: `${REVEAL_BASE} translate-y-10 opacity-0 data-in:translate-y-0 data-in:opacity-100`,
  left: `${REVEAL_BASE} -translate-x-12 opacity-0 data-in:translate-x-0 data-in:opacity-100`,
  right: `${REVEAL_BASE} translate-x-12 opacity-0 data-in:translate-x-0 data-in:opacity-100`,
};

const CARD_SHADOW = "shadow-[0_30px_60px_-36px_var(--fg-shadow)]";
const CARD_HOVER =
  "transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-30px_color-mix(in_srgb,var(--fg-accent)_55%,transparent)]";

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const avatarOf = (player) =>
  AVATAR_COLORS[
    Math.max(
      0,
      PLAYERS.findIndex((p) => p.name === player.name),
    ) % AVATAR_COLORS.length
  ];

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
    const els = root.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.setAttribute("data-in", "true"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-in", "true");
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
        const speed = Number(el.dataset.parallax) || 0.15;
        const offset = (box.top + box.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
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

function BigNumber({ n, side }) {
  return (
    <span
      aria-hidden="true"
      data-parallax="0.15"
      className={`fg-outline-soft pointer-events-none absolute top-10 hidden select-none ${side} ${FONT} text-[300px] font-black leading-[0.8] md:block`}
    >
      {n}
    </span>
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

// İki zolaq paralel düzülür (bir-birinin üstünə düşmür):
// yuxarıda klub loqoları olan əsas zolaq, altında stadion LED lövhəsi kimi oyun adları.
const CLUB_TAPE_BG = {
  backgroundColor: "var(--fg-accent)",
  backgroundImage: [
    // üst və alt ağ-sarı haşiyə (forma kanti kimi)
    "linear-gradient(180deg, var(--fg-yellow) 0 3px, #fff 3px 5px, transparent 5px calc(100% - 5px), #fff calc(100% - 5px) calc(100% - 3px), var(--fg-yellow) calc(100% - 3px))",
    // çəmən biçimi kimi zolaqlar
    "repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 70px, transparent 70px 140px)",
    // nöqtəli tekstura
    "radial-gradient(rgba(255,255,255,.14) 1px, transparent 1.4px)",
    // dərinlik
    "linear-gradient(180deg, rgba(255,255,255,.18), transparent 45%, rgba(0,0,0,.28))",
  ].join(","),
  backgroundSize: "100% 100%, auto, 9px 9px, 100% 100%",
};

const LED_TAPE_BG = {
  backgroundColor: "#05070d",
  backgroundImage:
    "radial-gradient(rgba(255,194,61,.10) 1px, transparent 1.3px), linear-gradient(180deg, rgba(255,255,255,.06), transparent 40%, rgba(0,0,0,.4))",
  backgroundSize: "5px 5px, 100% 100%",
};

function Tapes() {
  const logos = useTapeLogos();
  return (
    <div aria-hidden="true" className="relative h-40 shrink-0 md:h-44 lg:h-40">
      <div
        className="absolute -inset-x-10 top-5 z-2 -rotate-[2.2deg] overflow-hidden py-2.5 shadow-[0_24px_44px_-24px_color-mix(in_srgb,var(--fg-accent)_85%,transparent)] sm:-rotate-[1.8deg] md:top-6 md:-rotate-[1.4deg] md:py-3"
        style={CLUB_TAPE_BG}
      >
        <Marquee
          items={TAPE_CLUBS.map((c) => (
            <TapeClub key={c.label} label={c.label} logo={logos[c.label]} />
          ))}
          sep={<SoccerBall className="h-4 w-4 md:h-5 md:w-5" />}
          sepClass="inline-flex opacity-90"
          className={`${FONT} text-lg font-black uppercase tracking-[0.06em] text-white [text-shadow:0_2px_0_rgba(0,0,0,.25)] sm:text-xl md:text-[26px]`}
        />
      </div>
      <div
        className="absolute -inset-x-10 top-[6.3rem] z-1 -rotate-[2.2deg] overflow-hidden border-y-2 border-[#1d2742] py-1.5 sm:-rotate-[1.8deg] md:top-[7.4rem] md:-rotate-[1.4deg] md:py-2 lg:top-[7.1rem]"
        style={LED_TAPE_BG}
      >
        <Marquee
          reverse
          items={GAME_CATALOG.map((g) => g.title)}
          sep="★"
          sepClass="text-accent"
          className={`${FONT} text-xs font-extrabold uppercase tracking-[0.2em] text-yellow [text-shadow:0_0_8px_rgba(255,194,61,.55)] sm:text-sm md:text-base`}
        />
      </div>
    </div>
  );
}

function HeroCollage({ index }) {
  const [loaded, setLoaded] = useState(() => new Set([0]));
  const [failed, setFailed] = useState(() => new Set());
  useEffect(() => {
    const next = (index + 1) % SLIDES.length;
    const t = setTimeout(
      () =>
        setLoaded((s) =>
          s.has(index) && s.has(next) ? s : new Set([...s, index, next]),
        ),
      index === 0 ? 2500 : 0,
    );
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div className="relative mx-auto h-85 w-full max-w-140 sm:h-115 lg:h-full lg:max-h-140 lg:min-h-[20rem]">
      <div
        className="fg-frame-in absolute inset-[12px_16px_36px_36px] overflow-hidden bg-navy [animation-delay:.25s] sm:inset-[20px_30px_40px_60px]"
        style={{ clipPath: "polygon(10% 0, 100% 0, 92% 100%, 0 100%)" }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.image}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            {(i === index || loaded.has(i)) && (
              <img
                src={failed.has(i) ? s.fallback : s.image}
                alt=""
                decoding="async"
                onError={() =>
                  setFailed((f) => (f.has(i) ? f : new Set([...f, i])))
                }
                fetchpriority={i === 0 ? "high" : "low"}
                className="fg-kb absolute inset-0 h-full w-full bg-navy object-cover"
              />
            )}
          </div>
        ))}
        <PitchOverlay />
        <div className="fg-halftone-w fg-drift absolute inset-y-0 left-0 w-2/5" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.55),transparent_65%)] animate-[fgFlood_3.2s_ease-in-out_infinite]" />
      </div>

      <Scoreboard />

      <div
        aria-hidden="true"
        className="fg-bar-in absolute left-4 top-16 h-[55%] w-4 -skew-x-10 bg-yellow sm:left-7.5 sm:top-22 sm:w-5.5"
      />

      <Link
        to="/oyunlar/karyera-yolu"
        aria-label={tr("Günün oyunçusu: Karyera yolu oyunu")}
        className="fg-pop-float absolute bottom-3 left-0 w-40 -rotate-4 rounded-2xl border-3 border-yellow bg-surface p-2.5 shadow-[0_22px_44px_-24px_var(--fg-shadow)] [--d:.95s] sm:bottom-5 sm:w-52 sm:p-3"
      >
        <span className="flex items-center justify-between">
          <span
            className={`${FONT} text-lg font-black text-accent sm:text-[22px]`}
          >
            #07
          </span>
          <span
            className={`whitespace-nowrap ${FONT} text-[9px] font-extrabold uppercase tracking-[0.04em] text-gold-hi sm:text-[11px] sm:tracking-[0.14em]`}
          >
            {tr("Günün oyunçusu")}
          </span>
        </span>
        <span className="fg-halftone mt-2 grid h-20 place-items-center rounded-[10px] bg-page-2 sm:h-30">
          <span
            className={`fg-ping-y grid h-12 w-12 place-items-center rounded-full bg-navy ${FONT} text-2xl font-black text-yellow sm:h-17.5 sm:w-17.5 sm:text-[34px]`}
          >
            ?
          </span>
        </span>
        <span
          className={`fg-qblink mt-2 block text-center ${FONT} text-base font-black tracking-[0.1em] text-ink sm:mt-2.5 sm:text-xl`}
        >
          ? ? ? ? ? ?
        </span>
      </Link>

      <Link
        to="/oyunlar/futbol-wordle"
        aria-label={tr("Futbol Wordle oyununa keç")}
        className="fg-pop-float absolute right-0 top-0 rotate-5 rounded-2xl bg-surface px-3 py-2.5 shadow-[0_22px_44px_-24px_var(--fg-shadow)] [--d:1.1s] [--f:6s] sm:px-3.5 sm:py-3"
      >
        <span
          className={`block ${FONT} text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted sm:text-[11px]`}
        >
          {tr("Wordle · 4/6")}
        </span>
        <span
          className={`mt-2 flex gap-1.5 [perspective:300px] ${FONT} text-base font-black sm:text-xl`}
        >
          {[
            ["S", "var(--fg-good-lo)"],
            ["A", "var(--fg-good-lo)"],
            ["K", "var(--fg-good-lo)"],
            ["A", "var(--fg-good-lo)"],
          ].map(([letter, color], i) => (
            <span
              key={i}
              className="fg-tile fg-flip grid h-7 w-7 place-items-center rounded-md sm:h-8.5 sm:w-8.5"
              style={{ "--c": color, animationDelay: `${1.6 + i * 0.25}s` }}
            >
              {letter}
            </span>
          ))}
        </span>
      </Link>

      <Link
        to="/oyunlar"
        aria-label={tr("Bütün oyunlar: {n}", { n: GAME_CATALOG.length })}
        className="fg-pop-float absolute bottom-0 right-2 grid h-24 w-24 place-items-center rounded-full bg-yellow text-center text-on-yellow shadow-[0_20px_40px_-20px_var(--fg-shadow)] [--d:1.25s] [--f:4.6s] sm:right-2.5 sm:h-30 sm:w-30"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 160 160"
          className="fg-spin pointer-events-none absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)] overflow-visible sm:-inset-5 sm:h-[calc(100%+2.5rem)] sm:w-[calc(100%+2.5rem)]"
        >
          <defs>
            <path
              id="fg-ring"
              d="M80,80 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"
            />
          </defs>
          <text
            fontFamily="Roboto Condensed, sans-serif"
            fontWeight="800"
            fontSize="11"
            letterSpacing="2.6"
            fill="currentColor"
            className="text-ink"
          >
            <textPath href="#fg-ring">
              {tr("FUTGRID · OYNA · QAZAN · FUTGRID · OYNA · QAZAN ·")}
            </textPath>
          </text>
        </svg>
        <span className={`relative ${FONT} font-black leading-[0.9]`}>
          <span className="block text-4xl sm:text-[46px]">
            {GAME_CATALOG.length}
          </span>
          <span className="block text-xs tracking-[0.12em] sm:text-sm">
            {tr("OYUN")}
          </span>
        </span>
      </Link>
    </div>
  );
}

function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef(null);

  const go = (dir) =>
    setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => go(1), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [index, paused]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea")) return;
      if (window.scrollY > window.innerHeight) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const slide = SLIDES[index];
  const [first, middle, last] = slide.lines;
  const longest = Math.max(first.length, middle.length);
  // Ölçülər ekran hündürlüyünə görə də kiçilir ki, bölmə (lentlər daxil) 100%-də tam görünsün.
  const titleSize =
    longest <= 8
      ? "text-[44px] sm:text-[64px] lg:text-[clamp(52px,10vh,100px)]"
      : longest <= 10
        ? "text-[38px] sm:text-[56px] lg:text-[clamp(46px,8.6vh,86px)]"
        : "text-[32px] sm:text-[46px] lg:text-[clamp(40px,7.2vh,72px)]";
  const boardSize =
    last.length <= 8
      ? "text-[36px] sm:text-[52px] lg:text-[clamp(40px,7.8vh,80px)]"
      : "text-[30px] sm:text-[42px] lg:text-[clamp(34px,6.4vh,64px)]";

  return (
    <section
      className="relative flex flex-col overflow-hidden bg-page pt-6 md:pt-10 lg:h-[calc(100svh-140px)] lg:min-h-[540px] lg:max-h-[980px] lg:pt-[clamp(0.75rem,3vh,2.5rem)]"
      aria-roledescription="karusel"
      aria-label={tr("Əsas slaydlar")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const diff = e.clientX - startX.current;
        if (Math.abs(diff) > 60) go(diff < 0 ? 1 : -1);
        startX.current = null;
      }}
    >
      <div
        aria-hidden="true"
        className="fg-pitch fg-stripes-move absolute right-0 top-0 hidden h-[calc(100%-9.5rem)] w-[56%] lg:block"
        style={{ clipPath: "polygon(14% 0, 100% 0, 100% 100%, 0 100%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-[70%] w-full lg:w-1/2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, color-mix(in srgb, var(--fg-line) 7%, transparent) 0 1.5px, transparent 1.5px 24px), repeating-linear-gradient(-45deg, color-mix(in srgb, var(--fg-line) 7%, transparent) 0 1.5px, transparent 1.5px 24px)",
          maskImage: "radial-gradient(ellipse at 25% 35%, #000 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 25% 35%, #000 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-330 items-center gap-8 px-4 pb-4 md:px-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:gap-10 lg:pb-2">
        <div key={index} className="relative z-10 min-w-0">
          <div className={`fg-fade flex flex-wrap items-center gap-3 ${HERO_FONT} text-xs font-semibold uppercase tracking-[0.16em] sm:text-[13px]`}>
            <span className="inline-flex items-center gap-2 bg-bad px-3 py-1.5 text-white">
              <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,.3)] animate-[fgLive_1.4s_ease-out_infinite]" />
              {tr("Matç günü")}
            </span>
            <span className="text-muted">
              {tr("Raund")} <span className="text-accent">{pad(index + 1)}</span> / {pad(SLIDES.length)}
            </span>
            <span className="relative h-0.75 w-20 bg-edge">
              <span
                className="fg-prog absolute inset-y-0 left-0 bg-accent"
                style={{
                  animationDuration: `${AUTOPLAY_MS}ms`,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            </span>
          </div>

          <h1
            className={`mt-5 ${HERO_FONT} ${titleSize} font-bold uppercase leading-[0.92] text-ink lg:mt-[clamp(0.75rem,2.4vh,1.5rem)]`}
          >
            <span className="fg-mask">
              <span className="fg-rise [animation-delay:.15s]">{first}</span>
            </span>
            <span className="fg-mask">
              <span className="fg-rise text-accent [animation-delay:.3s]">{middle}</span>
            </span>
            <span className="fg-mask mt-3 pb-2 lg:mt-[clamp(0.5rem,1.8vh,1rem)]">
              <span className="fg-rise inline-flex items-center gap-3 rounded-2xl border-3 border-[#2a3557] bg-[#070b16] py-1.5 pl-2.5 pr-5 shadow-[0_0_0_6px_#0b1225,0_30px_60px_-30px_#000] [animation-delay:.45s] sm:gap-4 sm:py-2 sm:pl-3 sm:pr-6">
                <span
                  aria-hidden="true"
                  className={`${HERO_FONT} text-[11px] font-semibold tracking-[0.18em] text-[#8b93a7] [writing-mode:vertical-rl] rotate-180 sm:text-sm`}
                >
                  90+2&apos;
                </span>
                <span className={`${boardSize} leading-none text-[#ffd23d] [text-shadow:0_0_18px_rgba(255,180,0,.6)]`}>
                  {last}
                </span>
              </span>
            </span>
          </h1>

          <p
            className={`fg-fade mt-5 ${HERO_FONT} text-sm font-medium uppercase tracking-[0.14em] text-accent [animation-delay:.65s] md:text-lg lg:mt-[clamp(0.75rem,2.6vh,1.5rem)]`}
          >
            {slide.subtitle}
          </p>

          <div className="fg-fade mt-7 flex flex-wrap items-center gap-2.5 [animation-delay:.8s] sm:gap-3.5 lg:mt-[clamp(1rem,3vh,2rem)]">
            <a
              href={slide.href}
              onClick={(e) => jumpTo(e, slide.href)}
              className={`inline-flex h-12 items-stretch bg-accent ${HERO_FONT} text-sm font-semibold sm:h-14 sm:text-base uppercase tracking-[0.12em] text-white shadow-[0_16px_30px_-14px_color-mix(in_srgb,var(--fg-accent)_70%,transparent)] transition-transform duration-200 hover:-translate-y-0.5`}
            >
              <span className="flex items-center px-5 sm:px-7">
                {slide.button}
              </span>
              <span className="grid w-12 place-items-center bg-yellow text-on-yellow sm:w-14">
                <ArrowRight className="fg-nudge h-5 w-5" strokeWidth={2.6} />
              </span>
            </a>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={tr("Əvvəlki slayd")}
              className="grid h-12 w-12 place-items-center border-2 border-ink text-ink sm:h-14 sm:w-14 transition-colors duration-200 hover:border-accent hover:bg-accent hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={tr("Növbəti slayd")}
              className="grid h-12 w-12 place-items-center border-2 border-ink bg-ink sm:h-14 sm:w-14 text-page transition-colors duration-200 hover:border-accent hover:bg-accent hover:text-white"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </div>
        </div>

        <HeroCollage index={index} />
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-40 z-20 h-9 overflow-hidden md:bottom-44 lg:bottom-40 motion-reduce:hidden">
        <span className="absolute left-0 top-0 block h-9 w-9 animate-[fgBallRoll_9s_linear_2s_infinite]">
          <SoccerBall className="h-full w-full animate-[fgBallHop_0.45s_ease-in-out_infinite] drop-shadow-[0_6px_6px_rgba(0,0,0,.45)]" />
        </span>
      </div>

      <Tapes />
    </section>
  );
}

function Polaroid({ card, index }) {
  return (
    <div
      data-reveal
      className={`${REVEAL.up} w-[74%] shrink-0 snap-center sm:w-auto ${index === 1 ? "sm:mt-6" : ""}`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      <figure
        className={`group/pol relative m-0 bg-surface p-3 pb-4 shadow-[0_24px_50px_-30px_var(--fg-shadow)] transition-[rotate,translate,box-shadow] duration-500 ease-out hover:-translate-y-3 hover:rotate-0 hover:shadow-[0_40px_60px_-30px_color-mix(in_srgb,var(--fg-accent)_55%,transparent)] ${CARD_TILT[index]}`}
      >
        <span
          aria-hidden="true"
          className={`absolute -top-3.5 left-1/2 z-10 h-7 w-28 -translate-x-1/2 ${CARD_TAPE[index]}`}
        />
        <div className="aspect-4/3 overflow-hidden bg-deep">
          <img
            src={card.src}
            alt={card.alt}
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (card.fallback && !img.src.endsWith(card.fallback))
                img.src = card.fallback;
            }}
            className="h-full w-full object-cover saturate-[.85] transition-[filter,scale] duration-500 group-hover/pol:scale-105 group-hover/pol:saturate-[1.2]"
          />
        </div>
        <figcaption
          className={`mt-3 flex items-center justify-between ${FONT} text-[15px] font-extrabold uppercase tracking-[0.08em] text-ink`}
        >
          <span>№ {pad(index + 1)}</span>
          <span className="text-accent">{card.title}</span>
        </figcaption>
      </figure>
    </div>
  );
}

function StatCard({ stat, index, run }) {
  const dark = index === 2;
  return (
    <div
      data-reveal
      className={REVEAL.up}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div
        className={`group relative h-full overflow-hidden border-t-5 px-5 pb-4.5 pt-5.5 transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_40px_-26px_var(--fg-shadow)] ${
          dark
            ? "border-yellow bg-navy text-white"
            : "border-accent bg-surface text-ink"
        }`}
      >
        {dark ? (
          <span
            aria-hidden="true"
            className="fg-halftone-w fg-drift absolute inset-y-0 right-0 w-1/2"
          />
        ) : (
          <span
            aria-hidden="true"
            className={`absolute -right-1.5 -top-3.5 ${FONT} text-[92px] font-black leading-none text-page transition-[translate,color] duration-500 group-hover:-translate-x-3 group-hover:translate-y-2.5 group-hover:text-accent/10`}
          >
            {stat.label[0]}
          </span>
        )}
        <p
          className={`relative whitespace-nowrap ${FONT} text-[28px] font-black leading-none sm:text-4xl md:text-5xl lg:text-6xl`}
        >
          <CountUp value={stat.value} run={run} duration={1800} />
          <span className={dark ? "text-yellow" : "text-accent"}>
            {stat.suffix}
          </span>
        </p>
        <p
          className={`relative mt-1.5 ${FONT} text-xs font-bold uppercase tracking-[0.24em] md:text-[13px] ${
            dark ? "text-yellow" : "text-muted"
          }`}
        >
          {stat.label}
        </p>
      </div>
    </div>
  );
}

const coverOf = (key) => GAME_CATALOG.find((g) => g.key === key)?.image;

function PitchLines() {
  return (
    <svg
      aria-hidden="true"
      data-reveal
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <g fill="none" stroke="var(--fg-pitch-line)" strokeWidth="3">
        <line
          className="fg-draw"
          pathLength="1"
          x1="720"
          y1="0"
          x2="720"
          y2="900"
        />
        <circle className="fg-draw" pathLength="1" cx="720" cy="450" r="130" />
        <rect
          className="fg-draw"
          pathLength="1"
          x="-2"
          y="250"
          width="180"
          height="400"
        />
        <rect
          className="fg-draw"
          pathLength="1"
          x="1262"
          y="250"
          width="180"
          height="400"
        />
      </g>
    </svg>
  );
}

function PlayLabel({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${FONT} text-base font-black uppercase tracking-[0.1em] ${className}`}
    >
      {tr("Oyna")}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/game:translate-x-1.5" />
    </span>
  );
}

function FeatureCard({ game }) {
  return (
    <div data-reveal className={`${REVEAL.left} h-full`}>
      <Link
        to={game.href}
        className={`fg-sheen group/game flex h-full flex-col bg-surface text-ink ${CARD_SHADOW} ${CARD_HOVER}`}
      >
        <div
          className="relative h-60 shrink-0 overflow-hidden bg-deep sm:h-80 lg:h-auto lg:min-h-0 lg:flex-1 lg:shrink"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 86%, 0 100%)" }}
        >
          <img
            src={coverOf(game.key)}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-[scale] duration-700 ease-out group-hover/game:scale-106"
          />
          <span
            className={`fg-bob absolute left-4 top-4 bg-yellow px-3 py-1.5 ${FONT} text-sm font-black uppercase text-on-yellow md:left-5 md:top-5 md:text-base`}
          >
            {tr("#01 · Ən populyar")}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 px-5 pb-6 pt-2.5 md:px-7.5 lg:flex-none">
          <div className="flex flex-wrap gap-2">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className={`border-[1.5px] border-ink px-2.5 py-1 ${FONT} text-[11px] font-bold uppercase tracking-[0.1em] md:text-xs`}
              >
                {tag}
              </span>
            ))}
          </div>
          <h3
            className={`${FONT} text-4xl font-black uppercase leading-none md:text-5xl`}
          >
            {game.title}
          </h3>
          <p
            className={`max-w-lg ${BODY} text-[15px] leading-relaxed text-muted md:text-base`}
          >
            {game.description}
          </p>
          <span className="mt-auto flex items-center gap-3 pt-1 text-accent">
            <span className="fg-ping-b grid h-10 w-10 place-items-center bg-accent text-white">
              <Play className="h-4 w-4 fill-current" />
            </span>
            <PlayLabel />
          </span>
        </div>
      </Link>
    </div>
  );
}

function RowCard({ game, index }) {
  return (
    <div
      data-reveal
      className={`${REVEAL.right} lg:min-h-0 lg:flex-1`}
      style={{ transitionDelay: "120ms" }}
    >
      <Link
        to={game.href}
        className={`fg-sheen group/game flex h-full min-h-56 bg-surface text-ink md:min-h-60 lg:min-h-0 ${CARD_SHADOW} ${CARD_HOVER}`}
      >
        <div
          className="relative w-[42%] shrink-0 overflow-hidden bg-deep sm:w-[46%]"
          style={{ clipPath: "polygon(0 0, 100% 0, 84% 100%, 0 100%)" }}
        >
          <img
            src={coverOf(game.key)}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-[scale] duration-700 ease-out group-hover/game:scale-106"
          />
          <span
            className={`absolute left-3 top-3 bg-surface px-2.5 py-1 ${FONT} text-sm font-black text-ink`}
          >
            #{pad(index + 1)}
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2 py-5 pl-2 pr-5 md:pr-6">
          <span
            className={`${FONT} text-[11px] font-bold uppercase tracking-[0.14em] text-accent md:text-xs`}
          >
            {game.tags.join(" · ")}
          </span>
          <h3
            className={`${FONT} text-2xl font-black uppercase leading-none md:text-[32px]`}
          >
            {game.title}
          </h3>
          <p
            className={`${BODY} text-sm leading-relaxed text-muted md:text-[15px]`}
          >
            {game.description}
          </p>
          <PlayLabel className="text-accent" />
        </div>
      </Link>
    </div>
  );
}

function AuctionCard({ game }) {
  const [broken, setBroken] = useState(false);
  const image = coverOf(game.key);
  const hasImage = image && !broken;
  return (
    <div
      data-reveal
      className={`${REVEAL.right} lg:min-h-0 lg:flex-1`}
      style={{ transitionDelay: "240ms" }}
    >
      <Link
        to={game.href}
        className={`fg-sheen group/game flex h-full min-h-56 flex-col bg-navy text-white sm:flex-row md:min-h-60 lg:min-h-0 ${CARD_SHADOW} ${CARD_HOVER}`}
      >
        {hasImage ? (
          <div className="relative aspect-16/10 w-full shrink-0 overflow-hidden bg-navy sm:aspect-auto sm:w-[56%] sm:[clip-path:polygon(0_0,100%_0,90%_100%,0_100%)]">
            <img
              src={image}
              alt=""
              loading="lazy"
              onError={() => setBroken(true)}
              className="absolute inset-0 h-full w-full object-cover object-[70%_50%] transition-[scale] duration-700 ease-out group-hover/game:scale-105"
            />
            <span
              className={`absolute left-3 top-3 bg-yellow px-2.5 py-1 ${FONT} text-sm font-black text-on-yellow`}
            >
              #03
            </span>
          </div>
        ) : (
          <div className="relative grid h-48 shrink-0 place-items-center sm:h-auto sm:w-[42%]">
            <span className="fg-ping-y grid h-24 w-24 place-items-center rounded-full border-3 border-yellow md:h-30 md:w-30">
              <Gavel
                className="fg-gavel h-11 w-11 text-yellow md:h-14 md:w-14"
                strokeWidth={1.8}
              />
            </span>
          </div>
        )}
        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-2 border-t-4 border-yellow px-5 py-5 sm:border-t-0 sm:py-5 sm:pl-2 sm:pr-5 md:pr-6">
          <span
            aria-hidden="true"
            className="fg-halftone-w fg-drift pointer-events-none absolute inset-y-0 right-0 w-[45%]"
          />
          <span
            className={`relative ${FONT} text-[11px] font-bold uppercase tracking-[0.14em] text-yellow md:text-xs`}
          >
            {game.tags.join(" · ")}
          </span>
          <h3
            className={`relative ${FONT} text-2xl font-black uppercase leading-none md:text-[28px] xl:text-[32px]`}
          >
            {game.title}
          </h3>
          <p
            className={`relative ${BODY} text-sm leading-relaxed text-navy-soft sm:line-clamp-3 md:text-[15px]`}
          >
            {game.description}
          </p>
          <PlayLabel className="relative text-yellow" />
        </div>
      </Link>
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
          "{v1} Bir az sonra yenidən cəhd et və ya birbaşa info@futgrid.az ünvanına yaz.",
          { v1: err.message || "Mesaj göndərilmədi." },
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
        <div>
          <p
            className={`${FONT} text-xs font-extrabold uppercase tracking-[0.2em] text-accent`}
          >
            {tr("Forma")}
          </p>
          <h3
            className={`mt-1 ${FONT} text-3xl font-black uppercase leading-none text-ink md:text-[34px]`}
          >
            {tr("Bizə yaz")}
          </h3>
        </div>
        <div className="text-right">
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
          .then((data) => [key, data.entries ?? []]),
      ),
    )
      .then((results) => {
        const byId = new Map();
        for (const [key, entries] of results) {
          for (const entry of entries) {
            const current = byId.get(entry.userId) ?? {
              id: entry.userId,
              name: entry.displayName,
              team: entry.team?.name ?? entry.team?.slug ?? "—",
              matches: entry.games ?? 0,
              winRate: entry.winRate ?? 0,
              points: { week: 0, month: 0, all: 0 },
            };
            current.points[key] = entry.points;
            current.matches = Math.max(current.matches, entry.games ?? 0);
            current.winRate = Math.max(current.winRate, entry.winRate ?? 0);
            byId.set(entry.userId, current);
          }
        }
        const merged = [...byId.values()].sort(
          (a, b) =>
            b.points.all - a.points.all || b.points.week - a.points.week,
        );
        if (merged.length) setLivePlayers(merged);
      })
      .catch(() => {});
  }, []);

  const rootRef = useRef(null);
  const statsRef = useRef(null);
  const panelRef = useRef(null);
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

  const rows = [...(livePlayers ?? PLAYERS)]
    .sort((a, b) => b.points[period] - a.points[period])
    .map((p) => ({ ...p, points: { ...p.points, value: p.points[period] } }));
  const periodIndex = PERIODS.findIndex((p) => p.key === period);
  const statValues = homeStats
    ? [
        homeStats.players,
        homeStats.clubs,
        homeStats.countries,
        homeStats.coaches,
      ]
    : null;
  const displayStats = STATS.map((stat, index) => ({
    ...stat,
    value: statValues?.[index] ?? stat.value,
  }));

  return (
    <div ref={rootRef} className="w-full overflow-x-clip bg-page">
      <style>{KEYFRAMES}</style>

      <Hero />

      <section
        id="about"
        className="relative w-full overflow-hidden bg-page py-20 md:py-28"
      >
        <BigNumber n="01" side="-left-2.5" />

        <div className="relative mx-auto max-w-330 px-4 md:px-6">
          <SectionHeading kicker={tr("Futbol bilikini sına")}>
            {tr("Taktiki oyunlar")} <span className="text-accent">&amp;</span>{" "}
            {tr("strategiya")}
          </SectionHeading>

          <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-8 pt-5 [scrollbar-width:none] sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 sm:pt-0 md:mt-14 lg:gap-7 [&::-webkit-scrollbar]:hidden">
            {CARDS.map((card, i) => (
              <Polaroid key={card.src} card={card} index={i} />
            ))}
          </div>

          <div
            ref={statsRef}
            className="mt-16 grid grid-cols-2 gap-3 md:mt-20 md:grid-cols-4 md:gap-4.5"
          >
            {displayStats.map((s, i) => (
              <StatCard key={s.label} stat={s} index={i} run={statsIn} />
            ))}
          </div>

          <div
            data-reveal
            className={`${REVEAL.up} mx-auto mt-12 max-w-3xl text-center md:mt-14`}
          >
            <p
              className={`${BODY} text-base leading-8 text-muted md:text-[19px] md:leading-9`}
            >
              {tr(
                "FutGrid oyun həvəskarları üçün taktiki oyunların, reytinq cədvəllərinin və turnirlərin bir yerdə toplandığı platformadır. Komandanı qur, rəqiblərinlə yarış və səviyyəni hər gün yüksəlt.",
              )}
            </p>
            <a
              href="#games"
              onClick={(e) => jumpTo(e, "#games")}
              className={`group/btn mt-7 inline-flex h-13.5 items-center gap-2.5 bg-navy px-8 ${FONT} text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-[translate,background-color] duration-300 hover:-translate-y-0.5 hover:bg-accent md:px-9 md:text-base`}
            >
              {tr("Oyunlara bax")}
              <ArrowRight className="h-4 w-4 text-yellow transition-transform duration-300 group-hover/btn:translate-x-1.5" />
            </a>
          </div>
        </div>
      </section>

      <section
        id="games"
        className="fg-pitch relative w-full overflow-hidden py-16 md:py-20"
      >
        <PitchLines />
        <BigNumber n="02" side="-right-2.5" />

        <div className="relative mx-auto max-w-330 px-4 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <SectionHeading kicker={tr("İndi kəşf et")} center={false}>
              {tr("Populyar oyunlar")}
            </SectionHeading>
            <div data-reveal className={REVEAL.up}>
              <Link
                to="/oyunlar"
                className={`group/btn inline-flex h-13.5 items-center gap-3 bg-navy pl-6 pr-2.5 ${FONT} text-sm font-extrabold uppercase tracking-[0.08em] text-white transition-[translate,background-color] duration-300 hover:-translate-y-0.5 hover:bg-accent md:text-base`}
              >
                {tr("Daha çox oyun")}
                <span className="fg-ping-y grid h-8.5 min-w-8.5 place-items-center bg-yellow px-1 font-black text-on-yellow">
                  {GAME_CATALOG.length}
                </span>
              </Link>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <FeatureCard game={GAMES[0]} />
            <div className="flex min-w-0 flex-col gap-6 lg:h-140">
              <RowCard game={GAMES[1]} index={1} />
              <AuctionCard game={GAMES[2]} />
            </div>
          </div>
        </div>
      </section>

      <section
        id="leaderboard"
        className="relative w-full overflow-hidden bg-page py-20 md:py-28"
      >
        <BigNumber n="03" side="-left-2.5" />

        <div className="relative mx-auto max-w-330 px-4 md:px-6">
          <SectionHeading kicker={tr("Ən yaxşılar")}>
            {tr("Reytinq cədvəli")}
          </SectionHeading>

          <div
            data-reveal
            className={`${REVEAL.up} mt-7 flex justify-center`}
            style={{ transitionDelay: "200ms" }}
          >
            <div
              className="relative grid grid-cols-3 border border-edge bg-surface p-1"
              role="tablist"
              aria-label={tr("Dövr")}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] bg-navy transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1.15)]"
                style={{ transform: `translateX(${periodIndex * 100}%)` }}
              />
              {PERIODS.map((p) => {
                const on = period === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => changePeriod(p.key)}
                    className={`relative z-10 flex items-center justify-center gap-2 px-3 py-2.5 ${FONT} text-xs font-extrabold uppercase tracking-[0.08em] transition-colors duration-300 sm:px-5 md:px-6 md:text-base ${
                      on ? "text-white" : "text-ink hover:bg-page"
                    }`}
                  >
                    {on && (
                      <span
                        aria-hidden="true"
                        className="fg-blink h-2 w-2 rounded-full bg-good"
                      />
                    )}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            ref={panelRef}
            className="mt-10 grid gap-6 md:mt-11 lg:grid-cols-[1fr_1.3fr] lg:items-start"
          >
            <div className="flex flex-col gap-4">
              {rows.slice(0, 3).map((player, rank) => (
                <TopCard
                  key={player.name}
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
                <span className="hidden md:block">{tr("Komanda")}</span>
                <span className="text-right">{tr("Xal")}</span>
              </div>

              {rows.slice(3).map((player, j) => {
                const i = j + 3;
                return (
                  <div
                    key={player.name}
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
                        <span
                          className={`grid h-8.5 w-8.5 shrink-0 place-items-center rounded-full ${FONT} text-[13px] font-black ${avatarOf(player)}`}
                        >
                          {initials(player.name)}
                        </span>
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
                        {player.team}
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

          <p
            className={`mt-5 flex items-center justify-center gap-2 ${BODY} text-xs text-muted`}
          >
            <Trophy className="h-3.5 w-3.5 text-gold" />
            {tr("Reytinq hər həftə bazar ertəsi yenilənir")}
          </p>
        </div>
      </section>

      <section
        id="contact"
        className="relative w-full overflow-hidden bg-page pb-24 pt-8 md:pb-28 md:pt-10"
      >
        <div className="relative mx-auto max-w-330 px-4 md:px-6">
          <SectionHeading kicker={tr("Bizimlə əlaqə")}>
            {tr("Mesaj göndər")}
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
                    {tr("Əlaqə")}
                  </p>
                  <h3
                    className={`mt-2 ${FONT} text-3xl font-black uppercase leading-none md:text-[40px]`}
                  >
                    {tr("Anketini yolla")}
                  </h3>
                  <p
                    className={`mt-3 max-w-xs ${BODY} text-[15px] leading-relaxed text-white/80`}
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
                          target={href?.startsWith("http") ? "_blank" : undefined}
                          rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
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
                    {SOCIALS.map(({ Icon, href, label }) => (
                      <a
                        key={label}
                        href={href}
                        target={href?.startsWith("http") ? "_blank" : undefined}
                        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
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
