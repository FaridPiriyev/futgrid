const BAKU_OFFSET_HOURS = 4;

function bakuDate(date = new Date()): Date {
  return new Date(date.getTime() + BAKU_OFFSET_HOURS * 60 * 60 * 1000);
}

export function bakuDateKey(date = new Date()): string {
  return bakuDate(date).toISOString().slice(0, 10);
}

export function isoWeekKey(date = new Date()): string {
  const value = bakuDate(date);
  const utc = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(date = new Date()): string {
  return bakuDate(date).toISOString().slice(0, 7);
}

export function dayStartBaku(date = new Date()): Date {
  const baku = bakuDate(date);
  const start = new Date(Date.UTC(baku.getUTCFullYear(), baku.getUTCMonth(), baku.getUTCDate()));
  return new Date(start.getTime() - BAKU_OFFSET_HOURS * 60 * 60 * 1000);
}

export function weekStartBaku(date = new Date()): Date {
  const start = dayStartBaku(date);
  const day = bakuDate(start).getUTCDay() || 7;
  return new Date(start.getTime() - (day - 1) * 24 * 60 * 60 * 1000);
}

export function monthStartBaku(date = new Date()): Date {
  const baku = bakuDate(date);
  const start = new Date(Date.UTC(baku.getUTCFullYear(), baku.getUTCMonth(), 1));
  return new Date(start.getTime() - BAKU_OFFSET_HOURS * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
