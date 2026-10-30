import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FONT } from "./ui";

export default function GameLayout({ eyebrow, title, description, children }) {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-page pb-16 pt-28 md:pt-32">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--fg-accent)_18%,transparent),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-accent"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 md:px-6">
        <Link
          to="/#games"
          className={`group inline-flex items-center gap-2 ${FONT} text-sm uppercase tracking-[0.15em] text-muted transition-colors duration-300 hover:text-ink`}
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          Oyunlara qayıt
        </Link>

        <header className="mt-6 text-center">
          {eyebrow && (
            <p
              className={`${FONT} text-base uppercase tracking-wider text-accent md:text-xl`}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className={`mt-1 ${FONT} text-4xl font-bold uppercase leading-tight text-ink md:text-[56px]`}
          >
            {title}
          </h1>
          {description && (
            <p
              className={`mx-auto mt-3 max-w-2xl ${FONT} text-base font-light leading-7 text-muted md:text-lg`}
            >
              {description}
            </p>
          )}
        </header>

        <div className="mt-10 md:mt-12">{children}</div>
      </div>
    </section>
  );
}
