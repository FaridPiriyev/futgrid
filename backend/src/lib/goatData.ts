import { readGameDataFile } from "./data.js";

export interface GoatPlayer {
  id: string;
  name: string;
  code: string;
  pos: string;
  aliases?: string[];
  photo?: string;
}

let cached: GoatPlayer[] | null = null;

export function goatPlayers(): GoatPlayer[] {
  if (!cached) {
    cached = readGameDataFile<GoatPlayer[]>("goat-players.json");
  }
  return cached;
}

export const GOAT_SIZES = [16, 32, 64, 128] as const;
