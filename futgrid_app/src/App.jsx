import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Footer from "./components/Footer";
import BetaNotice from "./components/BetaNotice";
import ResumeDuelBanner from "./components/ResumeDuelBanner";
import NoticeToast from "./components/NoticeToast";
import MobileTabBar from "./components/MobileTabBar";
import AchievementWatcher from "./components/social/AchievementWatcher";
import InstallPrompt from "./components/InstallPrompt";
import { LanguageProvider, tr, useLang } from "./i18n";
import { AuthProvider } from "./lib/auth";
import { SocialProvider } from "./lib/social";
import { GAME_CATALOG } from "./lib/games/catalog";
import ogImage from "./assets/og-image.jpg";
import { NOINDEX_PATHS } from "./seo/routes";

const AllGames = lazy(() => import("./components/AllGames"));
const FutbolX0X = lazy(() => import("./components/games/x0x/FutbolX0X"));
const OrtaqOyuncu = lazy(() => import("./components/games/ortaq/OrtaqOyuncu"));
const YuksekAsagi = lazy(() => import("./components/games/yuksek/YuksekAsagi"));
const Auksion = lazy(() => import("./components/games/auksion/Auksion"));
const FutbolWordle = lazy(
  () => import("./components/games/wordle/FutbolWordle"),
);
const KaryeraYolu = lazy(
  () => import("./components/games/karyera/KaryeraYolu"),
);
const HeyetXatirla = lazy(
  () => import("./components/games/heyet/HeyetXatirla"),
);
const BesKlub = lazy(() => import("./components/games/besklub/BesKlub"));
const KlublariSirala = lazy(
  () => import("./components/games/sirala/KlublariSirala"),
);
const Piramida = lazy(() => import("./components/games/piramida/Piramida"));
const TarixinEnYaxsisi = lazy(
  () => import("./components/games/goat/TarixinEnYaxsisi"),
);
const IkiHerf = lazy(() => import("./components/games/ikiherf/IkiHerf"));
const YirmiSual = lazy(() => import("./components/games/sual/YirmiSual"));
const KimdirBu = lazy(() => import("./components/games/sekil/KimdirBu"));
const Ultimate = lazy(() => import("./components/games/ultimate/Ultimate"));
const Legal = lazy(() => import("./components/Legal"));
const Account = lazy(() => import("./components/Account"));
const Admin = lazy(() => import("./components/Admin"));
const NotFound = lazy(() => import("./components/NotFound"));
const PlayerPage = lazy(() => import("./components/social/PlayerPage"));

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      const t = setTimeout(
        () =>
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
      return () => clearTimeout(t);
    }
    const top = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    top();
    const frame = requestAnimationFrame(top);
    const t = setTimeout(top, 120);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t);
    };
  }, [pathname, hash]);

  useEffect(() => {
    if ("scrollRestoration" in window.history)
      window.history.scrollRestoration = "manual";
  }, []);

  return null;
}

const SITE = "https://futgrid.az";
const LOCALES = { az: "az_AZ", en: "en_US", ru: "ru_RU" };

const PAGES = {
  "/": () => [
    tr("FutGrid — futbol bilik oyunları"),
    tr(
      "Futbol X0X, Futbol Wordle, Karyera yolu, Heyəti xatırla və daha çox futbol bilik oyunu. Pulsuz oyna, dostunla yarış, reytinqdə yüksəl.",
    ),
  ],
  "/oyunlar": () => [
    tr("Bütün oyunlar"),
    tr(
      "FutGrid-in bütün futbol oyunları bir yerdə: tək oyna və ya dostunla eyni ekranda yarış.",
    ),
  ],
  "/mexfilik-siyaseti": () => [
    tr("Məxfilik siyasəti"),
    tr("FutGrid hansı məlumatları toplayır və onlardan necə istifadə edir."),
  ],
  "/istifade-sertleri": () => [
    tr("İstifadə şərtləri"),
    tr("FutGrid saytından istifadə qaydaları."),
  ],
  "/hesab": () => [
    tr("Hesab"),
    tr("FutGrid hesabınız, statistikanız və reytinq nəticələriniz."),
  ],
  "/admin": () => [tr("Admin panel"), tr("FutGrid idarəetmə paneli.")],
};

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function RouteMeta() {
  const { pathname } = useLocation();
  const { lang } = useLang();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, "") || "/";
    const game = GAME_CATALOG.find((g) => g.href === path);
    const [title, description] = game
      ? [game.title, game.description]
      : (PAGES[path] ?? PAGES["/"])();
    const full = path === "/" ? title : `${title} | FutGrid`;
    const url = SITE + (path === "/" ? "/" : path);

    const known = Boolean(game) || Object.hasOwn(PAGES, path);
    const indexable = known && !NOINDEX_PATHS.has(path);

    document.title = full;
    setMeta(
      "name",
      "robots",
      indexable ? "index,follow,max-image-preview:large" : "noindex,nofollow",
    );
    setMeta("name", "description", description);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", "FutGrid");
    setMeta(
      "property",
      "og:image",
      game
        ? `${SITE}/og/${game.href.split("/").pop()}.jpg`
        : new URL(ogImage, window.location.origin).href,
    );
    setMeta("property", "og:locale", LOCALES[lang] ?? LOCALES.az);
    setMeta("name", "twitter:card", "summary_large_image");

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [pathname, lang]);

  return null;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </LanguageProvider>
  );
}

function AppShell() {
  const { lang } = useLang();
  return (
    <BrowserRouter>
      <SocialProvider>
      <ScrollManager />
      <RouteMeta />
      <Navbar />
      <Suspense fallback={<div className="min-h-screen bg-page" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/oyunlar" element={<AllGames />} />
          <Route path="/oyunlar/futbol-x0x" element={<FutbolX0X />} />
          <Route path="/oyunlar/ortaq-oyuncu" element={<OrtaqOyuncu />} />
          <Route path="/oyunlar/yuksek-asagi" element={<YuksekAsagi />} />
          <Route path="/oyunlar/auksion" element={<Auksion />} />
          <Route path="/oyunlar/futbol-wordle" element={<FutbolWordle />} />
          <Route path="/oyunlar/karyera-yolu" element={<KaryeraYolu />} />
          <Route path="/oyunlar/heyeti-xatirla" element={<HeyetXatirla />} />
          <Route path="/oyunlar/5-klub" element={<BesKlub />} />
          <Route path="/oyunlar/klublari-sirala" element={<KlublariSirala />} />
          <Route path="/oyunlar/piramida" element={<Piramida />} />
          <Route
            path="/oyunlar/tarixin-en-yaxsisi"
            element={<TarixinEnYaxsisi />}
          />
          <Route path="/oyunlar/iki-herf" element={<IkiHerf />} />
          <Route path="/oyunlar/20-sual" element={<YirmiSual />} />
          <Route path="/oyunlar/kimdir-bu" element={<KimdirBu />} />
          <Route path="/oyunlar/ultimate-11" element={<Ultimate />} />
          <Route path="/hesab" element={<Account />} />
          <Route path="/oyuncu/:username" element={<PlayerPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="/mexfilik-siyaseti"
            element={<Legal page="privacy" lang={lang} />}
          />
          <Route
            path="/istifade-sertleri"
            element={<Legal page="terms" lang={lang} />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Footer />
      <BetaNotice />
      <ResumeDuelBanner />
      <MobileTabBar />
      <AchievementWatcher />
      <InstallPrompt />
      <NoticeToast />
      </SocialProvider>
    </BrowserRouter>
  );
}
