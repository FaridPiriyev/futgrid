import type { Random } from "./random.js";

export type Locale = "az" | "en" | "ru";
export type Difficulty = "easy" | "normal" | "hard";
export type GameKey =
  | "xox"
  | "orta"
  | "auction"
  | "higherLower"
  | "wordle"
  | "career"
  | "lineups"
  | "fiveClubs"
  | "clubOrder"
  | "pyramid"
  | "twoLetters";

export type GameMode = "solo" | "daily" | "sameScreen" | "ranked" | "versus";

export interface GameSettings {
  difficulty?: Difficulty;
  mode?: GameMode;
  rounds?: number;
  categories?: Record<string, boolean>;
  era?: string;
  [key: string]: unknown;
}

export interface RawPlayer {
  id: number;
  name: string;
  /** Curated FIFA-like rating (player-ratings.json); overrides the market-value formula. */
  rating?: number;
  slug?: string;
  nationality_code?: string;
  position?: string;
  is_active?: boolean;
  birth_date?: string;
  current_club_id?: number;
  current_club_name?: string;
  club_history?: number[];
  club_stints?: { club_id: number; from?: string; to?: string }[];
  international?: { caps?: number; goals?: number };
  coach_ids?: string[];
  market_value?: { amount_eur?: number; highest_eur?: number; updated_at?: string };
  trophies?: { id: string; count?: number }[];
  aliases?: string[];
  [key: string]: unknown;
}

export interface RawClub {
  id: number;
  name: string;
  slug?: string;
  short_name?: string;
  logo_url?: string;
  league?: string;
  [key: string]: unknown;
}

export interface RawTrophy {
  id: string;
  name?: string;
  image_url?: string;
  [key: string]: unknown;
}

export interface RawCountry {
  code: string;
  name?: string;
  name_en?: string;
  flag?: string;
  flag_url?: string;
  [key: string]: unknown;
}

export interface RawCoach {
  id: string;
  name: string;
  slug?: string;
  photo_url?: string;
  [key: string]: unknown;
}

export interface FamousMatchSide {
  name: string;
  score?: number;
  formation?: string;
  players: { name: string; aliases?: string[] }[];
}

export interface FamousMatch {
  id: string;
  competition: string;
  date: string;
  venue?: string;
  home: FamousMatchSide;
  away: FamousMatchSide;
}

export interface RawGameData {
  clubs: RawClub[];
  players: RawPlayer[];
  trophies?: RawTrophy[];
  countries?: RawCountry[];
  coaches?: RawCoach[];
  famousMatches?: FamousMatch[];
}

export interface GameData {
  clubs: RawClub[];
  players: RawPlayer[];
  trophies: RawTrophy[];
  countries: RawCountry[];
  coaches: RawCoach[];
  famousMatches: FamousMatch[];
  clubsById: Map<number, RawClub>;
  playersById: Map<number, RawPlayer>;
  playersByClub: Map<number, Set<number>>;
  trophiesById: Map<string, RawTrophy>;
  countriesByCode: Map<string, RawCountry>;
  coachesById: Map<string, RawCoach>;
  _categoryPool?: CategoryPool;
  _entities?: EntityIndex;
  _career?: RawPlayer[];
  _order?: Record<string, RawPlayer[]>;
  _fiveClubs?: RawClub[];
  _wordle?: WordleIndex;
  _twoLetters?: TwoLettersIndex;
  _clubFameReady?: boolean;
  _fame?: Map<number, number>;
  [key: string]: unknown;
}

export interface Category {
  key: string;
  type: "club" | "country" | "trophy" | "coach";
  label: string;
  ids: Set<number>;
  tier: number;
  club?: RawClub;
  code?: string;
  trophyId?: string;
  min?: number;
  coachId?: string;
  coach?: RawCoach;
  image?: string | null;
  photo?: string | null;
  flag?: string;
  flagUrls?: string[];
}

export interface CategoryPool {
  club: Category[];
  country: Category[];
  trophy: Category[];
  coach: Category[];
}

export interface Entity {
  key: string;
  type: "club" | "country";
  label: string;
  ids: Set<number>;
  club?: RawClub;
  code?: string;
  image?: string | null;
  images?: string[];
  flag?: string;
  short?: string;
}

export interface EntityIndex {
  clubs: Entity[];
  countries: Entity[];
  all: Entity[];
  byKey: Map<string, Entity>;
}

export interface WordleIndex {
  dict: Set<string>;
  targets: RawPlayer[];
}

export interface TwoLettersIndex {
  ranked: RawPlayer[];
  rank: Map<number, number>;
  sets: Map<number, Set<string>>;
}

export interface Answer {
  round?: number;
  playerId?: number;
  playerName?: string;
  name?: string;
  clubIds?: number[];
  guess?: string;
  direction?: "up" | "down";
  won?: boolean;
  hints?: number;
  ms?: number;
  [key: string]: unknown;
}

export interface ScoreBreakdown {
  game: GameKey;
  correct: number;
  wrong: number;
  total: number;
  ratio: number;
  score: number;
  details?: Record<string, unknown>;
}

export interface PuzzleBase {
  game: GameKey;
  seed: number;
  settings: Required<Pick<GameSettings, "difficulty">> & GameSettings;
}

export type Puzzle = PuzzleBase & Record<string, unknown>;

export interface BuildOptions {
  random?: Random;
}
