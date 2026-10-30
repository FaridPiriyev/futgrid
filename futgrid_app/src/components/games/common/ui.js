export const FONT = "font-['Roboto_Condensed',sans-serif]";

export const SWEEP_BLUE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-accent transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

export const SWEEP_WHITE =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover/btn:scale-x-100";

export const BTN_PRIMARY = `group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden bg-accent px-7 py-3 ${FONT} text-sm font-bold uppercase tracking-wide text-white transition-colors duration-500 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50 md:text-base`;

export const BTN_GHOST = `group/btn relative isolate inline-flex items-center justify-center gap-2 overflow-hidden border border-line/15 px-6 py-3 ${FONT} text-sm font-bold uppercase tracking-wide text-soft transition-colors duration-300 hover:border-accent hover:text-white md:text-base`;
