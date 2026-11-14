import { z } from "zod";

export const createSessionSchema = z.object({
  game: z.string().min(1).max(40),
  mode: z.enum(["ranked", "solo", "daily", "sameScreen", "versus"]).default("ranked"),
  difficulty: z.enum(["easy", "normal", "hard"]).default("normal"),
  settings: z.record(z.unknown()).default({}),
});

export const answerSchema = z.object({
  round: z.number().int().min(0).max(1000).optional(),
  playerId: z.number().int().optional(),
  playerName: z.string().max(120).optional(),
  name: z.string().max(120).optional(),
  clubIds: z.array(z.number().int()).max(30).optional(),
  guess: z.string().max(80).optional(),
  direction: z.enum(["up", "down"]).optional(),
  won: z.boolean().optional(),
  hints: z.number().int().min(0).max(20).optional(),
  ms: z.number().int().min(0).max(2 * 60 * 60 * 1000).optional(),
});

export const finishSessionSchema = z.object({
  answers: z.array(answerSchema).max(1000).default([]),
  durationMs: z.number().int().min(0).max(2 * 60 * 60 * 1000).optional(),
});

export const eventSchema = z.object({
  game: z.string().min(1).max(40),
  mode: z.string().min(1).max(40),
  durationMs: z.number().int().min(0).max(2 * 60 * 60 * 1000),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type FinishSessionInput = z.infer<typeof finishSessionSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
