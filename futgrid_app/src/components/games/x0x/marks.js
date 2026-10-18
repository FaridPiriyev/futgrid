export const MARKS = {
  X: {
    text: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500",
    ring: "ring-blue-500",
    shirt: "text-blue-500",
    bar: "bg-blue-500",
    solid: "bg-blue-500 text-white",
    tint: "bg-blue-500/20",
  },
  O: {
    text: "text-amber-300",
    bg: "bg-amber-400/10",
    border: "border-amber-400",
    ring: "ring-amber-400",
    shirt: "text-amber-400",
    bar: "bg-amber-400",
    solid: "bg-amber-400 text-black",
    tint: "bg-amber-400/20",
  },
  solo: {
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500",
    ring: "ring-emerald-500",
    shirt: "text-emerald-500",
    bar: "bg-emerald-500",
    solid: "bg-emerald-500 text-white",
    tint: "bg-emerald-500/15",
  },
};

export const other = (mark) => (mark === "X" ? "O" : "X");
