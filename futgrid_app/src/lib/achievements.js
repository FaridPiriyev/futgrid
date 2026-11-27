import { Crown, Flame, Gem, Map as MapIcon, Medal, Sparkles, Star, Swords, Target, Trophy, Users, Zap, Award } from "lucide-react";
import { tr } from "../i18n";

/** Display data for the achievement keys computed by the API. */
export const ACHIEVEMENTS = {
  first_win: { Icon: Star, tone: "from-yellow to-orange-400", title: () => tr("İlk qələbə"), text: () => tr("İstənilən oyunda ilk qələbəni qazan") },
  games_10: { Icon: Zap, tone: "from-sky-400 to-accent", title: () => tr("Isınma"), text: () => tr("10 oyun oyna") },
  games_100: { Icon: Award, tone: "from-accent to-violet-500", title: () => tr("Veteran"), text: () => tr("100 oyun oyna") },
  duel_first: { Icon: Swords, tone: "from-rose-400 to-orange-400", title: () => tr("İlk duel qələbəsi"), text: () => tr("Onlayn duel qazan") },
  duel_10: { Icon: Swords, tone: "from-rose-500 to-red-600", title: () => tr("Duelçi"), text: () => tr("10 onlayn duel qazan") },
  duel_50: { Icon: Crown, tone: "from-yellow to-rose-500", title: () => tr("Arena kralı"), text: () => tr("50 onlayn duel qazan") },
  streak_7: { Icon: Flame, tone: "from-orange-400 to-red-500", title: () => tr("Odlu həftə"), text: () => tr("Günlük oyunu 7 gün ardıcıl oyna") },
  hard_win: { Icon: Target, tone: "from-emerald-400 to-teal-600", title: () => tr("Çətinə meydan oxu"), text: () => tr("Çətin səviyyədə qalib gəl") },
  perfect_5: { Icon: Sparkles, tone: "from-fuchsia-400 to-violet-600", title: () => tr("Mükəmməl"), text: () => tr("5 oyunu 100% nəticə ilə bitir") },
  explorer: { Icon: MapIcon, tone: "from-lime-400 to-emerald-500", title: () => tr("Kəşfiyyatçı"), text: () => tr("8 fərqli oyun oyna") },
  social_5: { Icon: Users, tone: "from-sky-400 to-cyan-500", title: () => tr("Komanda ruhu"), text: () => tr("5 dost əlavə et") },
  silver: { Icon: Medal, tone: "from-slate-300 to-slate-500", title: () => tr("Gümüş liqa"), text: () => tr("Ümumi reytinqi 1100-ə çatdır") },
  gold: { Icon: Gem, tone: "from-yellow to-amber-500", title: () => tr("Qızıl liqa"), text: () => tr("Ümumi reytinqi 1250-yə çatdır") },
};

export const achievementInfo = (key) => ACHIEVEMENTS[key] ?? { Icon: Trophy, tone: "from-accent to-accent", title: () => key, text: () => "" };

/** Ask the watcher to re-check the signed-in user's achievements (after a game ends). */
export function checkAchievements() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("fg:check-achievements"));
}
