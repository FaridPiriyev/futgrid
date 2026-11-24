import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createGameData, type GameData, type RawPlayer } from "@futgrid/game-core";
import { config } from "../config.js";

function readJson<T>(path: string, optional = false): T {
  if (!existsSync(path)) {
    if (optional) return undefined as T;
    throw new Error(`Missing data file: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function resolveDataDir(): string {
  const candidates = [
    resolve(config.DATA_DIR),
    resolve(process.cwd(), config.DATA_DIR),
    resolve(process.cwd(), "packages/game-core/data"),
    resolve(process.cwd(), "../packages/game-core/data"),
    resolve(process.cwd(), "../../packages/game-core/data"),
  ];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, "players.json"))) return candidate;
  }
  throw new Error(`Unable to locate FutGrid game data. Tried: ${candidates.join(", ")}`);
}

let cached: GameData | null = null;

export function getGameData(): GameData {
  if (cached) return cached;
  const dir = resolveDataDir();
  cached = createGameData({
    clubs: readJson(resolve(dir, "clubs.json")),
    players: readJson<RawPlayer[]>(resolve(dir, "players.json")),
    trophies: readJson(resolve(dir, "trophies.json"), true),
    countries: readJson(resolve(dir, "countries.json"), true),
    coaches: readJson(resolve(dir, "coaches.json"), true),
    famousMatches: readJson(resolve(dir, "famous-matches.json"), true),
  });
  return cached;
}

export function dataVersion(): string {
  return config.DATA_VERSION;
}

export function readGameDataFile<T>(name: string, optional = false): T {
  return readJson<T>(resolve(resolveDataDir(), name), optional);
}

export function gameDataDir(): string {
  return resolveDataDir();
}

let winners: Record<string, any> | null = null;
export function getTrophyWinners(): Record<string, any> {
  if (winners) return winners;
  winners = readJson<Record<string, any>>(
    resolve(resolveDataDir(), "trophy-winners.json"),
    true,
  ) ?? { trophies: {} };
  return winners;
}
