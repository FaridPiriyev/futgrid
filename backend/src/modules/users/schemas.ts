import { RANKED_GAME_KEYS } from "@futgrid/game-core";
import { z } from "zod";
import { LOCALES } from "../../lib/i18n.js";

export const patchMeSchema = z.object({
  displayName: z.string().trim().min(1).max(40).nullable().optional(),
  teamId: z.number().int().positive().nullable().optional(),
  locale: z.enum(LOCALES as [string, ...string[]]).optional(),
});

export const gameKeyParamsSchema = z.object({
  gameKey: z.enum(RANKED_GAME_KEYS as [string, ...string[]]),
});

export const settingsSchema = z.object({
  settings: z.record(z.unknown()),
});

const importedRecordSchema = z.object({
  gameKey: z.enum(RANKED_GAME_KEYS as [string, ...string[]]),
  bestScore: z.number().min(0).max(100).default(0),
  played: z.number().int().min(0).max(1_000_000).default(0),
  wins: z.number().int().min(0).max(1_000_000).default(0),
  bestStreak: z.number().int().min(0).max(1_000_000).default(0),
  lastPlayedAt: z.coerce.date().optional(),
});

export const importGuestSchema = z.object({
  guestId: z.string().uuid().optional(),
  records: z.array(importedRecordSchema).max(50),
});

export const usernameSchema = z.object({
  username: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export const pushTokenSchema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.enum(["web", "ios", "android"]).default("web"),
});

export const deletePushTokenSchema = z.object({
  token: z.string().min(20).max(4096),
});

export type ImportGuestInput = z.infer<typeof importGuestSchema>;
