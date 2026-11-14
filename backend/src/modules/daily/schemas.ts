import { z } from "zod";
import { bakuDateKey } from "../../lib/time.js";

export const dailyGameSchema = z.object({
  game: z.enum(["xox", "wordle"]),
});

export const dailyQuerySchema = z.object({
  difficulty: z.enum(["easy", "normal", "hard"]).default("normal"),
});

export const dailyStatsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => bakuDateKey()),
  difficulty: z.enum(["easy", "normal", "hard"]).optional(),
});

export const xoxAnswerSchema = z.object({
  cell: z.number().int().min(0).max(8),
  playerId: z.number().int().positive(),
  difficulty: z.enum(["easy", "normal", "hard"]).default("normal"),
});

export const xoxFinishSchema = z.object({
  difficulty: z.enum(["easy", "normal", "hard"]).default("normal"),
});

export const wordleGuessSchema = z.object({
  guess: z.string().min(4).max(8),
  difficulty: z.enum(["easy", "normal", "hard"]).default("normal"),
});
