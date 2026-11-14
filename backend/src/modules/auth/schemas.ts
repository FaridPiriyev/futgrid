import { z } from "zod";
import { LOCALES } from "../../lib/i18n.js";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(128);
const username = z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/);
const displayName = z.string().trim().min(1).max(40).optional();

export const registerSchema = z.object({
  email,
  password,
  username,
  displayName,
  teamId: z.number().int().positive().optional(),
  locale: z.enum(LOCALES as [string, ...string[]]).default("az"),
  ageConfirmed: z.boolean().refine((value) => value, { message: "age_confirmed_required" }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20).max(500),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(500),
  password,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
