import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FONT } from "./ui";

import { tr } from "../../../i18n";
function BackLink() {
  return (
    <Link
      to="/oyunlar"
      className={`group inline-flex shrink-0 items-center gap-2 whitespace-nowrap ${FONT} text-sm uppercase tracking-[0.15em] text-muted transition-colors duration-300 hover:text-ink`}
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
      {tr("Oyunlara qayıt")}
    </Link>
  );
}

export default function GameLayout({
  eyebrow,
  title,
  description,
  compact = false,
  children,
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [compact]);

  return (
    <section
      className={`fg-game relative w-full overflow-x-clip bg-page ${
        compact
          ? "min-h-[calc(100svh-7rem)] pb-24 pt-3 md:min-h-[calc(100svh-8.75rem)] md:pb-6 md:pt-20"
          : "min-h-screen pb-24 pt-6 md:pb-16 md:pt-32"
      }`}
    >
      <div
        aria-hidden="true"
        className="fg-pitch absolute inset-x-0 top-0 h-96 opacity-80 [mask-image:linear-gradient(to_bottom,transparent_0,transparent_9rem,black_14rem,transparent)] lg:[mask-image:linear-gradient(to_bottom,transparent_0,transparent_4rem,black_10rem,transparent)]"
      />

      <div
        className={`relative z-10 mx-auto px-4 md:px-6 ${compact ? "max-w-6xl" : "max-w-5xl"}`}
      >
        {compact ? (
          <div className="flex items-center justify-between gap-4">
            <BackLink />
            <span
              className={`min-w-0 truncate ${FONT} text-xs font-bold uppercase tracking-[0.2em] text-accent md:text-sm`}
            >
              {tr(title)}
            </span>
          </div>
        ) : (
          <>
            <BackLink />
            <header className="mt-4 text-center md:mt-6">
              {eyebrow && (
                <p
                  className={`${FONT} text-xs uppercase tracking-wider text-accent md:text-xl`}
                >
                  {tr(eyebrow)}
                </p>
              )}
              <h1
                className={`mt-1 ${FONT} text-[1.9rem] font-bold uppercase leading-none text-ink md:text-[56px] md:leading-tight`}
              >
                {tr(title)}
              </h1>
              {description && (
                <p
                  className={`mx-auto mt-2 max-w-2xl ${FONT} text-sm font-light leading-6 text-muted md:mt-3 md:text-lg md:leading-7`}
                >
                  {tr(description)}
                </p>
              )}
            </header>
          </>
        )}

        <div className={compact ? "mt-3 md:mt-4" : "mt-6 md:mt-12"}>{children}</div>
      </div>
    </section>
  );
}
