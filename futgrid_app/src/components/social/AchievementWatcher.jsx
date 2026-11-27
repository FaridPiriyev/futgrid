import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { achievementInfo } from "../../lib/achievements";
import { play } from "../../lib/sound";
import { tr } from "../../i18n";

const FONT = "font-['Roboto_Condensed',sans-serif]";
const seenKey = (userId) => `fg-achievements:${userId}`;

/**
 * After each game the app fires "fg:check-achievements"; this compares the user's achievements
 * with the ones already seen on this device and celebrates the new ones.
 */
export default function AchievementWatcher() {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    const check = async () => {
      try {
        const { entries } = await api.get("/me/achievements");
        const unlocked = entries.filter((a) => a.unlocked).map((a) => a.key);
        let seen = null;
        try {
          seen = JSON.parse(localStorage.getItem(seenKey(user.id)) ?? "null");
        } catch {
          seen = null;
        }
        localStorage.setItem(seenKey(user.id), JSON.stringify(unlocked));
        if (!seen) return; // first visit on this device: just remember
        const fresh = unlocked.filter((key) => !seen.includes(key));
        if (!fresh.length) return;
        play("achievement");
        setToast(fresh);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(null), 6000);
      } catch {
        // not critical
      }
    };
    void check();
    const onCheck = () => setTimeout(() => void check(), 800);
    window.addEventListener("fg:check-achievements", onCheck);
    return () => {
      window.removeEventListener("fg:check-achievements", onCheck);
      clearTimeout(timer.current);
    };
  }, [user]);

  if (!toast) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-20 z-[75] mx-auto flex max-w-sm flex-col gap-2">
      <style>{"@keyframes fgBadge { 0% { transform: scale(.6) rotate(-12deg); opacity: 0 } 60% { transform: scale(1.1) rotate(4deg); opacity: 1 } 100% { transform: none } }"}</style>
      {toast.map((key) => {
        const info = achievementInfo(key);
        const Icon = info.Icon;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setToast(null)}
            className="flex items-center gap-3 rounded-[16px] border border-yellow/50 bg-surface p-3 text-left shadow-2xl"
          >
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br ${info.tone} text-white animate-[fgBadge_0.6s_ease-out]`}>
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className={`block ${FONT} text-[11px] font-bold uppercase tracking-[0.16em] text-yellow`}>{tr("Yeni nişan!")}</span>
              <span className={`block truncate ${FONT} text-lg font-black uppercase text-ink`}>{info.title()}</span>
              <span className={`block truncate ${FONT} text-xs text-muted`}>{info.text()}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
