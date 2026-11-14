import type { Locale } from "./lib/i18n.js";

export interface Identity {
  userId?: string;
  guestId?: string;
  role?: string;
  locale: Locale;
  transport: "cookie" | "bearer" | "guest" | "anonymous";
}

declare module "fastify" {
  interface FastifyRequest {
    identity: Identity;
  }
}
