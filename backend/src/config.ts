import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();
loadEnv({ path: "backend/.env" });
loadEnv({ path: "../.env" });

const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ""),
);

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined ? fallback : value === "true" || value === "1"));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z
    .string()
    .default("postgresql://futgrid:futgrid@localhost:5433/futgrid?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6380/0"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  JWT_ACCESS_SECRET: z.string().default("development-access-secret-change-me-32chars"),
  TOKEN_PEPPER: z.string().default("development-token-pepper-change-me"),
  IP_HASH_SALT: z.string().default("development-ip-salt-change-me"),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: bool(false),
  CORS_ORIGINS: z
    .string()
    .default(
      "https://futgrid.az,https://www.futgrid.az,https://staging.futgrid.az,capacitor://localhost,https://localhost,http://localhost:5173",
    ),
  APP_URL: z.string().default("http://localhost:5173"),
  API_URL: z.string().default("http://localhost:3000"),
  DATA_DIR: z.string().default("../packages/game-core/data"),
  DATA_VERSION: z.string().default("v1"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("FutGrid <info@futgrid.az>"),
  CONTACT_TO: z.string().email().default("futgrid.az@gmail.com"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().default("http://localhost:3000/v1/auth/google/callback"),
  SENTRY_DSN: z.string().optional(),
  SWAGGER_ENABLED: bool(true),
  GAME_SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(120),
  DAILY_RANKED_LIMIT: z.coerce.number().int().positive().default(5),
  TEAM_LEADERBOARD_TOP: z.coerce.number().int().positive().default(5),
  TRUST_PROXY: bool(true),
  RATE_LIMIT_ENABLED: bool(true),
  LOG_PRETTY: bool(false),
  CDN_DATA_DIR: z.string().default("../cdn-data"),
  CDN_MEDIA_DIR: z.string().default("../cdn-media"),
  CDN_BASE_URL: z.string().default("http://localhost:3000/cdn-data"),
  MEDIA_BASE_URL: z.string().default("http://localhost:3000/media"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  API_FOOTBALL_KEY: z.string().optional(),
  API_FOOTBALL_BASE_URL: z.string().default("https://v3.football.api-sports.io"),
  TRANSFERMARKT_CSV_URL: z.string().optional(),
  ADMIN_TOTP_ISSUER: z.string().default("FutGrid"),
  MEDIA_MAX_BYTES: z.coerce.number().int().positive().default(10_000_000),
  MEDIA_MAX_WIDTH: z.coerce.number().int().positive().default(640),
  FCM_SERVICE_ACCOUNT_JSON: z.string().optional(),
});

const parsed = envSchema.safeParse(cleanEnv);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const config = {
  ...parsed.data,
  SWAGGER_ENABLED: parsed.data.NODE_ENV === "production" ? false : parsed.data.SWAGGER_ENABLED,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
};

if (config.isProduction) {
  const weak = [
    ["JWT_ACCESS_SECRET", config.JWT_ACCESS_SECRET],
    ["TOKEN_PEPPER", config.TOKEN_PEPPER],
    ["IP_HASH_SALT", config.IP_HASH_SALT],
  ].filter(([, value]) => value.includes("change-me") || value.length < 24);
  if (weak.length) {
    throw new Error(`Production secrets are weak or missing: ${weak.map(([key]) => key).join(", ")}`);
  }
  const r2 = Boolean(
    config.R2_ACCOUNT_ID &&
      config.R2_ACCESS_KEY_ID &&
      config.R2_SECRET_ACCESS_KEY &&
      config.R2_BUCKET,
  );
  if (!r2 && /localhost|127\.0\.0\.1/.test(config.MEDIA_BASE_URL)) {
    throw new Error(
      "Production media is not persistent: configure R2 or set a public MEDIA_BASE_URL with a volume.",
    );
  }
}

export type AppConfig = typeof config;
