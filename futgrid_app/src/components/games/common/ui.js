import { useEffect, useState } from "react";

export const FONT = "font-['Roboto_Condensed',sans-serif]";

export const SWEEP_BLUE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-accent transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

export const SWEEP_WHITE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

export const BTN_PRIMARY = `group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden bg-accent px-5 py-2.5 md:px-7 md:py-3 ${FONT} text-sm font-bold uppercase tracking-wide text-white transition-colors duration-500 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 md:text-base`;

export const BTN_GHOST = `group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden border border-line/15 px-4 py-2.5 md:px-6 md:py-3 ${FONT} text-sm font-bold uppercase tracking-wide text-soft transition-colors duration-300 hover:border-accent hover:text-white md:text-base`;

const MOBILE = "(max-width: 767px)";
const TOP_GAP = 76;

export function useMobileInput(ref) {
  const [box, setBox] = useState({ maxHeight: null, up: false });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE);
    const vv = window.visualViewport;
    const timers = [];
    const measure = () => {
      if (!mq.matches) {
        // Masaüstü: aşağıda yer azdırsa siyahı yuxarı açılır, hündürlük ekrana sığır
        const r = el.getBoundingClientRect();
        const below = window.innerHeight - r.bottom - 12;
        const above = r.top - TOP_GAP;
        const up = below < 220 && above > below;
        const maxHeight = Math.max(160, Math.min(320, Math.round(up ? above : below)));
        setBox((b) => (b.maxHeight === maxHeight && b.up === up ? b : { maxHeight, up }));
        return;
      }
      const r = el.getBoundingClientRect();
      const top = vv ? vv.offsetTop : 0;
      const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const below = bottom - r.bottom - 10;
      const above = r.top - top - TOP_GAP;
      const up = below < 170 && above > below;
      const maxHeight = Math.max(120, Math.min(320, Math.round(up ? above : below)));
      setBox((b) => (b.maxHeight === maxHeight && b.up === up ? b : { maxHeight, up }));
    };
    let shown = false;
    const keyboardOpen = () => Boolean(vv) && window.innerHeight - vv.height > 140;
    const reveal = () => {
      if (!mq.matches || shown || document.activeElement !== el || !keyboardOpen()) return;
      shown = true;
      const r = el.getBoundingClientRect();
      const top = vv.offsetTop;
      if (r.top < top + TOP_GAP - 4 || r.top > top + vv.height * 0.42)
        window.scrollBy({ top: r.top - top - TOP_GAP, behavior: "smooth" });
    };
    const onFocus = () => {
      shown = false;
      measure();
      timers.push(setTimeout(reveal, 300), setTimeout(reveal, 700), setTimeout(measure, 650), setTimeout(measure, 1000));
    };
    const onBlur = () => {
      shown = false;
    };
    // Yazı zamanı ölçü növbəti kadra qalır: input hadisəsinin içində state dəyişsə,
    // React onChange-dən əvvəl render edir və ilk yazılan hərf itir.
    let frame = 0;
    const onInput = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const onResize = () => {
      measure();
      if (!keyboardOpen()) shown = false;
      else if (document.activeElement === el) timers.push(setTimeout(reveal, 80));
    };
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    el.addEventListener("input", onInput);
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
      el.removeEventListener("input", onInput);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [ref]);
  return box;
}

export const listPlacement = (box) =>
  box.up ? "bottom-full mb-1" : "top-full mt-1";
