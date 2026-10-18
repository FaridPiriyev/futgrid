import EntityBadge from "../common/EntityBadge";
import { FONT } from "../common/ui";

export const CARD_KEYFRAMES = `
@keyframes ortaqDeal {
  0% { opacity: 0; transform: translateY(-70px) rotate(-14deg) scale(0.85); }
  60% { opacity: 1; transform: translateY(6px) rotate(2deg) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
}
@keyframes ortaqFlip {
  0% { transform: rotateY(0deg) translateY(0) scale(1); }
  35% { transform: rotateY(25deg) translateY(-26px) rotateZ(-3deg) scale(1.06); }
  70% { transform: rotateY(160deg) translateY(-14px) rotateZ(1deg) scale(1.05); }
  100% { transform: rotateY(180deg) translateY(0) rotateZ(0) scale(1); }
}
@keyframes ortaqShine {
  0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateX(230%) skewX(-18deg); opacity: 0; }
}
@keyframes ortaqGlow {
  0%, 100% { box-shadow: 0 0 0 1px var(--glow), 0 0 22px -4px var(--glow); }
  50% { box-shadow: 0 0 0 2px var(--glow), 0 0 44px 2px var(--glow); }
}
@keyframes ortaqFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`;

const SIZE = "w-36 sm:w-44 md:w-52 xl:w-56";
const RATIO = { aspectRatio: "5 / 7" };
const FACE = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

function Back({ owner, side }) {
  return (
    <div style={FACE} className={`overflow-hidden rounded-2xl border-2 ${side.border} bg-[#0c1426] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)]`}>
      <div
        className="absolute inset-2.5 rounded-xl border border-white/10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px), radial-gradient(circle at 50% 50%, rgba(59,130,246,0.25), transparent 65%)",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span
          className={`flex h-16 w-16 rotate-45 items-center justify-center rounded-xl ${side.solid} shadow-[0_0_30px_-4px_currentColor] md:h-20 md:w-20`}
        >
          <span className={`-rotate-45 ${FONT} text-3xl font-bold md:text-4xl`}>?</span>
        </span>
      </div>
      <span className={`absolute left-3 top-2.5 ${FONT} text-[10px] font-bold uppercase tracking-[0.2em] text-white/50`}>FutGrid</span>
      <span className={`absolute bottom-2.5 right-3 rotate-180 ${FONT} text-[10px] font-bold uppercase tracking-[0.2em] text-white/50`}>FutGrid</span>
      <span className={`absolute inset-x-0 bottom-8 text-center ${FONT} text-xs font-bold uppercase tracking-[0.2em] ${side.text}`}>{owner}</span>
    </div>
  );
}

function Front({ entity, owner, side, shineDelay }) {
  const corner = entity.type === "club" ? entity.short : entity.code;
  return (
    <div
      style={{ ...FACE, transform: "rotateY(180deg)" }}
      className={`overflow-hidden rounded-2xl border-2 ${side.border} bg-[linear-gradient(160deg,#141c2e,#0a0d14)] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)]`}
    >
      <div className="absolute left-3 top-2.5 hidden text-left leading-none sm:block">
        <span className={`block ${FONT} text-sm font-bold text-white`}>{corner}</span>
        <span className={`block ${FONT} text-[9px] uppercase tracking-wider text-neutral-500`}>{entity.type === "club" ? "klub" : "ölkə"}</span>
      </div>
      <div className="absolute bottom-2.5 right-3 hidden rotate-180 text-left leading-none sm:block">
        <span className={`block ${FONT} text-sm font-bold text-white`}>{corner}</span>
        <span className={`block ${FONT} text-[9px] uppercase tracking-wider text-neutral-500`}>{entity.type === "club" ? "klub" : "ölkə"}</span>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-3 text-center">
        <EntityBadge entity={entity} size="h-14 w-14 sm:h-20 sm:w-20 md:h-24 md:w-24" flagSize="w-20 sm:w-24 md:w-28" />
        <span className={`${FONT} text-sm font-bold uppercase leading-tight tracking-wide text-white sm:text-base md:text-lg`}>{entity.label}</span>
        <span className={`px-2 py-0.5 ${side.solid} ${FONT} text-[10px] font-bold uppercase tracking-wider`}>{owner}</span>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)]"
        style={{ animation: `ortaqShine 900ms ease-out ${shineDelay}ms both` }}
      />
    </div>
  );
}

export default function PokerCard({ entity, state, owner, side, delay = 0, glow }) {
  if (!entity) {
    const waiting = state === "waiting";
    return (
      <div
        className={`${SIZE} relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition-all duration-500 ${
          waiting ? `${side.border} bg-white/[0.04]` : "border-white/10 bg-white/[0.015] opacity-40"
        }`}
        style={{
          ...RATIO,
          ...(waiting ? { "--glow": glow, animation: "ortaqGlow 1.8s ease-in-out infinite" } : {}),
        }}
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full border ${waiting ? `${side.border} ${side.text}` : "border-white/15 text-white/20"} ${FONT} text-2xl font-bold`}
          style={waiting ? { animation: "ortaqFloat 1.8s ease-in-out infinite" } : undefined}
        >
          ?
        </span>
        <span className={`${FONT} text-xs font-bold uppercase tracking-[0.2em] ${waiting ? "text-white" : "text-neutral-500"}`}>
          {waiting ? `${owner} seçir` : owner}
        </span>
        {waiting && (
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${side.dot}`} style={{ animation: `ortaqFloat 1s ease-in-out ${i * 150}ms infinite` }} />
            ))}
          </span>
        )}
      </div>
    );
  }

  const revealed = state === "revealed";
  return (
    <div className={`${SIZE} relative`} style={{ ...RATIO, perspective: "1400px", animation: "ortaqDeal 550ms cubic-bezier(.2,.9,.3,1.2) both" }}>
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: revealed ? undefined : "rotateY(0deg)",
          animation: revealed ? `ortaqFlip 950ms cubic-bezier(.25,.8,.25,1) ${delay}ms both` : undefined,
        }}
      >
        <Back owner={owner} side={side} />
        <Front entity={entity} owner={owner} side={side} shineDelay={delay + 900} />
      </div>
    </div>
  );
}
