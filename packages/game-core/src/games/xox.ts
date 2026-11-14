import { buildCategoryPool, conflicts, type Category } from "../categories.js";
import { shuffle, type Random } from "../random.js";
import type { Answer, GameData, Puzzle, ScoreBreakdown } from "../types.js";

export const XOX_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

const DIFFICULTY = {
  easy: { minAnswers: 6, rowTier: 1, colTier: 1 },
  normal: { minAnswers: 4, rowTier: 1, colTier: 2 },
  hard: { minAnswers: 1, rowTier: 3, colTier: 3 },
} as const;

export interface XoxGrid {
  rows: Category[];
  cols: Category[];
  answers: number[];
}

const intersectCount = (a: Set<number>, b: Set<number>): number => {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let count = 0;
  for (const id of small) if (large.has(id)) count++;
  return count;
};

function attempt(
  data: GameData,
  rowTier: number,
  colTier: number,
  minAnswers: number,
  extraTypes: string[],
  random: Random,
  tries: number,
): XoxGrid | null {
  const pool = buildCategoryPool(data);
  const within = (list: Category[]) => list.filter((category) => category.tier <= colTier);
  const rowClubs = pool.club.filter((category) => category.tier <= rowTier);
  const clubs = within(pool.club);
  if (clubs.length < 6 || rowClubs.length < 3) return null;

  const extras: Record<string, Category[]> = {};
  for (const type of extraTypes) {
    extras[type] = within(pool[type as keyof typeof pool] ?? []);
  }
  const types = extraTypes.filter((type) => extras[type]?.length);

  for (let attemptIndex = 0; attemptIndex < tries; attemptIndex++) {
    const rows = shuffle(rowClubs, random).slice(0, 3);
    const wanted = types.length ? Math.min(3, 1 + Math.floor(random() * 3)) : 0;
    const slots = shuffle(
      ["club", "club", "club"].map((slot, index) =>
        index < wanted ? (shuffle(types, random)[0] ?? "club") : slot,
      ),
      random,
    );

    const cols: Category[] = [];
    let ok = true;
    for (const type of slots) {
      const source = type === "club" ? clubs : extras[type] ?? [];
      const picked = shuffle(source, random).find(
        (category) =>
          !rows.some((row) => conflicts(row, category)) &&
          !cols.some((column) => conflicts(column, category)) &&
          (category.type === "club" ||
            cols.filter((column) => column.type === category.type).length < 2) &&
          rows.every((row) => intersectCount(row.ids, category.ids) >= minAnswers),
      );
      if (!picked) {
        ok = false;
        break;
      }
      cols.push(picked);
    }
    if (!ok) continue;

    const answers = rows.flatMap((row) =>
      cols.map((column) => intersectCount(row.ids, column.ids)),
    );
    return { rows, cols, answers };
  }
  return null;
}

export function generateGrid(
  data: GameData,
  options: {
    difficulty?: string;
    categories?: Record<string, boolean>;
    random: Random;
    tries?: number;
  },
): XoxGrid | null {
  const difficulty = options.difficulty ?? "normal";
  const rule = DIFFICULTY[difficulty as keyof typeof DIFFICULTY] ?? DIFFICULTY.normal;
  const pool = buildCategoryPool(data);
  const extraTypes = ["country", "trophy", "coach"].filter(
    (type) => options.categories?.[type] && pool[type as keyof typeof pool]?.length,
  );
  for (let step = 0; step <= 2; step++) {
    const grid = attempt(
      data,
      Math.min(3, rule.rowTier + step),
      Math.min(3, rule.colTier + step),
      Math.max(1, rule.minAnswers - step),
      extraTypes,
      options.random,
      options.tries ?? 400,
    );
    if (grid) return grid;
  }
  return null;
}

export function buildXoxPuzzle(seed: number, settings: Record<string, unknown>, data: GameData, random: Random): Puzzle {
  const grid = generateGrid(data, {
    difficulty: String(settings.difficulty ?? "normal"),
    categories: (settings.categories as Record<string, boolean> | undefined) ?? {},
    random,
  });
  if (!grid) throw new Error("XOX_GRID_UNAVAILABLE");
  return {
    game: "xox",
    seed,
    settings: settings as Puzzle["settings"],
    grid,
  };
}

const cellCategories = (grid: XoxGrid, cell: number): [Category, Category] => {
  const row = grid.rows[Math.floor(cell / 3)];
  const column = grid.cols[cell % 3];
  if (!row || !column) throw new Error("INVALID_CELL");
  return [row, column];
};

export function verifyXoxAnswer(puzzle: Puzzle, answer: Answer): boolean {
  const grid = puzzle.grid as XoxGrid;
  const cell = Number(answer.round);
  const playerId = Number(answer.playerId);
  if (!Number.isInteger(cell) || cell < 0 || cell > 8 || !Number.isInteger(playerId)) return false;
  const [row, column] = cellCategories(grid, cell);
  return row.ids.has(playerId) && column.ids.has(playerId);
}

export function scoreXox(puzzle: Puzzle, answers: Answer[]): ScoreBreakdown {
  const grid = puzzle.grid as XoxGrid;
  const used = new Set<number>();
  let correct = 0;
  let wrong = 0;
  for (const answer of answers) {
    const playerId = Number(answer.playerId);
    if (used.has(playerId) || !verifyXoxAnswer(puzzle, answer)) {
      wrong++;
      continue;
    }
    used.add(playerId);
    correct++;
  }
  const ratio = correct / 9;
  return {
    game: "xox",
    correct,
    wrong,
    total: 9,
    ratio,
    score: Math.round(ratio * 1000) / 1000,
    details: { rarity: 0, gridAnswers: grid.answers },
  };
}
