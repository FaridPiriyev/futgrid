import { Link, useLocation } from "react-router-dom";
import { Gamepad2, Home, Swords, Trophy, UserRound } from "lucide-react";
import { useAuth } from "../lib/auth";
import { tr } from "../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";

/** Hidden while playing a game (needs the full screen) and in the admin panel. */
export const showTabBar = (pathname) => !pathname.startsWith("/oyunlar/") && !pathname.startsWith("/admin");

/** Bottom navigation for phones — the top menu is hard to reach with a thumb. */
export default function MobileTabBar() {
  const { pathname, hash, search } = useLocation();
  const { user } = useAuth();
  if (!showTabBar(pathname)) return null;

  const items = [
    { to: "/", label: tr("Əsas"), Icon: Home, active: pathname === "/" && hash !== "#leaderboard" },
    { to: "/oyunlar", label: tr("Oyunlar"), Icon: Gamepad2, active: pathname === "/oyunlar" && !search.includes("duo") },
    { to: "/oyunlar?filter=duo", label: tr("Duel"), Icon: Swords, active: pathname === "/oyunlar" && search.includes("duo") },
    { to: "/#leaderboard", label: tr("Reytinq"), Icon: Trophy, active: pathname === "/" && hash === "#leaderboard" },
    { to: "/hesab", label: user ? tr("Profil") : tr("Giriş"), Icon: UserRound, active: pathname === "/hesab" || pathname.startsWith("/oyuncu/") },
  ];

  return (
    <>
      <div aria-hidden="true" className="h-[calc(64px+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label={tr("Əsas menyu")}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line/10 bg-nav/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {items.map(({ to, label, Icon, active }) => (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 ${FONT} text-[11px] font-bold uppercase tracking-[0.06em] transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-ink"
                }`}
              >
                {active ? <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent" /> : null}
                {user && to === "/hesab" && user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className={`h-6 w-6 rounded-full object-cover ${active ? "ring-2 ring-accent" : ""}`} />
                ) : (
                  <Icon className="h-5.5 w-5.5" strokeWidth={active ? 2.4 : 1.8} />
                )}
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
