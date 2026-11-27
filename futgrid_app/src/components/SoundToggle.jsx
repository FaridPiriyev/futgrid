import { Volume2, VolumeX } from "lucide-react";
import { setSoundEnabled, useSoundEnabled } from "../lib/sound";
import { tr } from "../i18n";

export default function SoundToggle({ className = "h-9 w-9", tabIndex }) {
  const on = useSoundEnabled();
  return (
    <button
      type="button"
      tabIndex={tabIndex}
      onClick={() => setSoundEnabled(!on)}
      aria-pressed={on}
      aria-label={on ? tr("Səsi söndür") : tr("Səsi aç")}
      title={on ? tr("Səsi söndür") : tr("Səsi aç")}
      className={`relative flex items-center justify-center transition-transform duration-300 hover:scale-110 active:scale-95 ${className}`}
    >
      {on ? <Volume2 className="h-5 w-5 text-accent" /> : <VolumeX className="h-5 w-5 text-nav-soft" />}
    </button>
  );
}
