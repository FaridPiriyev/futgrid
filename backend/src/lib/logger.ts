import pino from "pino";
import { config } from "../config.js";

export const logger = pino({
  level: config.isTest ? "silent" : config.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers.set-cookie",
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "tokenHash",
      "emailToken",
    ],
    censor: "[redacted]",
  },
  transport: config.LOG_PRETTY
    ? {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      }
    : undefined,
});
