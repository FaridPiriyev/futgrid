import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FONT } from "./ui";

import { tr } from "../../../i18n";
function BackLink() {
  return (
    <Link
      to="/oyunlar"
      className={`group inline-flex items-center gap-2 ${FONT} text-sm uppercase tracking-[0.15em] text-muted transition-colors duration-300 hover:text-ink`}
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
  return (
    <section
      className={`relative w-full overflow-hidden bg-page ${
        compact
          ? "min-h-[calc(100svh-7rem)] pb-6 pt-4 md:min-h-[calc(100svh-8.75rem)] md:pt-20"
          : "min-h-screen pb-16 pt-28 md:pt-32"
      }`}
    >
      <div
        aria-hidden="true"
        className="fg-pitch absolute inset-x-0 top-0 h-80 opacity-80 [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />

      <div
        className={`relative z-10 mx-auto px-4 md:px-6 ${compact ? "max-w-6xl" : "max-w-5xl"}`}
      >
        {compact ? (
          <div className="flex items-center justify-between gap-4">
            <BackLink />
            <span
              className={`${FONT} text-sm font-bold uppercase tracking-[0.2em] text-accent`}
            >
              {tr(title)}
            </span>
          </div>
        ) : (
          <>
            <BackLink />
            <header className="mt-6 text-center">
              {eyebrow && (
                <p
                  className={`${FONT} text-base uppercase tracking-wider text-accent md:text-xl`}
                >
                  {tr(eyebrow)}
                </p>
              )}
              <h1
                className={`mt-1 ${FONT} text-4xl font-bold uppercase leading-tight text-ink md:text-[56px]`}
              >
                {tr(title)}
              </h1>
              {description && (
                <p
                  className={`mx-auto mt-3 max-w-2xl ${FONT} text-base font-light leading-7 text-muted md:text-lg`}
                >
                  {tr(description)}
                </p>
              )}
            </header>
          </>
        )}

        <div className={compact ? "mt-4" : "mt-10 md:mt-12"}>{children}</div>
      </div>
    </section>
  );
}
