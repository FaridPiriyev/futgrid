import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Footer from "./components/Footer";
import ComingSoon from "./components/games/common/ComingSoon";

const FutbolX0X = lazy(() => import("./components/games/x0x/FutbolX0X"));
const OrtaqOyuncu = lazy(() => import("./components/games/ortaq/OrtaqOyuncu"));

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
    <BrowserRouter>
      <ScrollManager />
      <Navbar />
      <Suspense fallback={<div className="min-h-screen bg-[#05060a]" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/oyunlar/futbol-x0x" element={<FutbolX0X />} />
          <Route path="/oyunlar/ortaq-oyuncu" element={<OrtaqOyuncu />} />
          <Route
            path="/oyunlar/yuksek-asagi"
            element={<ComingSoon title="Yüksək yoxsa Aşağı?" />}
          />
        </Routes>
      </Suspense>
      <Footer />
    </BrowserRouter>
  );
}
