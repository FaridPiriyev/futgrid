import type { Locale } from "./i18n.js";
import { t } from "./i18n.js";

export type ErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_RESULT"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "EMAIL_TAKEN"
  | "USERNAME_TAKEN"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "SESSION_EXPIRED"
  | "SESSION_FINISHED"
  | "SESSION_FORBIDDEN"
  | "ACCOUNT_BLOCKED"
  | "ACCOUNT_DELETED"
  | "TOKEN_INVALID"
  | "OAUTH_NOT_CONFIGURED"
  | "OAUTH_FAILED"
  | "GUEST_IMPORTED"
  | "AGE_REQUIRED";

const statusByCode: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_VERIFIED: 401,
  TOKEN_INVALID: 401,
  AGE_REQUIRED: 400,
  FORBIDDEN: 403,
  ACCOUNT_BLOCKED: 403,
  ACCOUNT_DELETED: 403,
  SESSION_FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EMAIL_TAKEN: 409,
  USERNAME_TAKEN: 409,
  SESSION_FINISHED: 409,
  GUEST_IMPORTED: 409,
  SESSION_EXPIRED: 410,
  INVALID_RESULT: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  OAUTH_NOT_CONFIGURED: 503,
  OAUTH_FAILED: 502,
};

export interface ErrorDetails {
  field?: string;
  rule?: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: ErrorDetails[];

  constructor(code: ErrorCode, options: { message?: string; details?: ErrorDetails[] } = {}) {
    super(options.message ?? code);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusByCode[code] ?? 500;
    this.details = options.details;
  }
}

export function errorBody(code: ErrorCode, locale: Locale, details?: ErrorDetails[]) {
  return {
    error: {
      code,
      message: t(locale, code),
      ...(details?.length ? { details } : {}),
    },
  };
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
