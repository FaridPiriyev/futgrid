import { resolve } from "node:path";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://futgrid:futgrid@localhost:5433/futgrid?schema=test";
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6380/15";
process.env.JWT_ACCESS_SECRET = "test-access-secret-at-least-32-characters-long";
process.env.TOKEN_PEPPER = "test-token-pepper";
process.env.IP_HASH_SALT = "test-ip-salt";
process.env.COOKIE_SECURE = "false";
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.SWAGGER_ENABLED = "false";
process.env.DATA_DIR = resolve(process.cwd(), "../packages/game-core/data");
process.env.DATA_VERSION = "v1";
process.env.LOG_LEVEL = "silent";
process.env.RATE_LIMIT_ENABLED = "false";
