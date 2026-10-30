import { Gavel } from "lucide-react";
import { FONT } from "./ui";

const STYLE = `
@keyframes aaRing { 0% { transform: scale(.55); opacity: .8; } 100% { transform: scale(1.9); opacity: 0; } }
@keyframes aaRise { 0% { transform: translateY(24px); opacity: 0; } 20% { opacity: 1; } 75% { opacity: 1; } 100% { transform: translateY(-56px); opacity: 0; } }
@keyframes aaSwing { 0%,100% { transform: rotate(-22deg); } 35% { transform: rotate(16deg); } 45% { transform: rotate(10deg); } }
`;

const BIDS = [
  { text: "+0.5 ₼", className: "left-[14%] top-[58%]", delay: "0s" },
  { text: "+1 ₼", className: "right-[16%] top-[46%]", delay: "1.1s" },
  { text: "+2 ₼", className: "left-[24%] top-[30%]", delay: "2.2s" },
  { text: "7 ₼", className: "right-[24%] top-[66%]", delay: "3.1s" },
];

export default function AuctionArt({ className = "" }) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_58%,#1e3a8a_0%,#0b1229_45%,#05060a_100%)] ${className}`}
    >
      <style>{STYLE}</style>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30 mask-[radial-gradient(circle_at_50%_55%,black,transparent_70%)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute left-1/2 top-[55%] h-0 w-0">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute -left-20 -top-20 h-40 w-40 rounded-full border border-amber-300/50 animate-[aaRing_3s_ease-out_infinite] motion-reduce:hidden"
            style={{ animationDelay: `${i}s` }}
          />
        ))}
        <span className="absolute -left-10 -top-10 grid h-20 w-20 place-items-center rounded-full bg-amber-400/15 shadow-[0_0_60px_10px_rgba(251,191,36,0.25)] ring-1 ring-amber-300/50">
          <Gavel className="h-10 w-10 origin-[25%_75%] text-amber-300 animate-[aaSwing_2.6s_ease-in-out_infinite] motion-reduce:animate-none" />
        </span>
      </div>
      {BIDS.map((b) => (
        <span
          key={b.text}
          aria-hidden="true"
          className={`absolute ${b.className} border border-amber-300/40 bg-black/50 px-2 py-0.5 ${FONT} text-xs font-bold text-amber-200 opacity-0 backdrop-blur-sm animate-[aaRise_4.4s_ease-in-out_infinite] motion-reduce:hidden`}
          style={{ animationDelay: b.delay }}
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}
