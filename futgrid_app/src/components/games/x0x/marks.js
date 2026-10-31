import { tr } from "../../../i18n";
export const MARKS = {
  X: {
    text: "text-accent-hi",
    bg: "bg-accent/15",
    border: "border-accent",
    ring: "ring-accent",
    shirt: "text-accent",
    bar: "bg-accent",
    solid: "bg-accent text-white",
    tint: "bg-accent/20",
  },
  O: {
    text: "text-gold-hi",
    bg: "bg-gold/10",
    border: "border-gold",
    ring: "ring-gold",
    shirt: "text-gold",
    bar: "bg-gold",
    solid: "bg-gold text-black",
    tint: "bg-gold/20",
  },
  solo: {
    text: "text-good-hi",
    bg: "bg-good-lo/10",
    border: "border-good-lo",
    ring: "ring-good-lo",
    shirt: "text-good-lo",
    bar: "bg-good-lo",
    solid: "bg-good-lo text-white",
    tint: "bg-good-lo/15",
  },
};

export const other = (mark) => (mark === "X" ? "O" : "X");
