import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Footer from "./components/Footer";
import { LanguageProvider, useLang } from "./i18n";

const AllGames = lazy(() => import("./components/AllGames"));
const FutbolX0X = lazy(() => import("./components/games/x0x/FutbolX0X"));
const OrtaqOyuncu = lazy(() => import("./components/games/ortaq/OrtaqOyuncu"));
const YuksekAsagi = lazy(() => import("./components/games/yuksek/YuksekAsagi"));
const Auksion = lazy(() => import("./components/games/auksion/Auksion"));
const FutbolWordle = lazy(() => import("./components/games/wordle/FutbolWordle"));
const KaryeraYolu = lazy(() => import("./components/games/karyera/KaryeraYolu"));
const HeyetXatirla = lazy(() => import("./components/games/heyet/HeyetXatirla"));
const BesKlub = lazy(() => import("./components/games/besklub/BesKlub"));
const Legal = lazy(() => import("./components/Legal"));

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
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}

function AppShell() {
  const { lang } = useLang();
  return (
    <BrowserRouter>
      <ScrollManager />
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
          <Route
            path="/mexfilik-siyaseti"
            element={<Legal page="privacy" lang={lang} />}
          />
          <Route
            path="/istifade-sertleri"
            element={<Legal page="terms" lang={lang} />}
          />
        </Routes>
      </Suspense>
      <Footer />
    </BrowserRouter>
  );
}
