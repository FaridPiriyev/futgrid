// Tiny synthesized sound effects (Web Audio) — no audio files to download.
// Muted state is remembered per device; components re-render via useSoundEnabled().
import { useEffect, useState } from "react";

const KEY = "fg-sound";
let ctx = null;
let enabled = (() => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
})();
const listeners = new Set();

export const soundEnabled = () => enabled;

export function setSoundEnabled(value) {
  enabled = Boolean(value);
  try {
    localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    // private mode
  }
  listeners.forEach((fn) => fn(enabled));
  if (enabled) play("pop");
}

export function useSoundEnabled() {
  const [value, setValue] = useState(enabled);
  useEffect(() => {
    listeners.add(setValue);
    return () => listeners.delete(setValue);
  }, []);
  return value;
}

function audio() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  ctx ??= new Ctx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(ac, { freq, to = freq, start = 0, dur = 0.12, type = "sine", gain = 0.12 }) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  correct: (ac) => {
    tone(ac, { freq: 660, dur: 0.09, type: "triangle" });
    tone(ac, { freq: 990, start: 0.08, dur: 0.14, type: "triangle" });
  },
  wrong: (ac) => {
    tone(ac, { freq: 220, to: 140, dur: 0.22, type: "sawtooth", gain: 0.07 });
  },
  turn: (ac) => {
    tone(ac, { freq: 880, dur: 0.08, gain: 0.08 });
  },
  pop: (ac) => {
    tone(ac, { freq: 520, to: 900, dur: 0.07, type: "triangle", gain: 0.09 });
  },
  win: (ac) => {
    [523, 659, 784, 1047].forEach((freq, i) => tone(ac, { freq, start: i * 0.09, dur: 0.18, type: "triangle" }));
  },
  lose: (ac) => {
    [392, 330, 262].forEach((freq, i) => tone(ac, { freq, start: i * 0.12, dur: 0.2, type: "sine", gain: 0.09 }));
  },
  achievement: (ac) => {
    [784, 988, 1175, 1568].forEach((freq, i) => tone(ac, { freq, start: i * 0.07, dur: 0.22, type: "square", gain: 0.05 }));
  },
};

/** Plays one of: correct, wrong, turn, pop, win, lose, achievement. Silent when muted. */
export function play(name) {
  if (!enabled) return;
  try {
    const ac = audio();
    if (ac && SOUNDS[name]) SOUNDS[name](ac);
  } catch {
    // audio is optional
  }
}
