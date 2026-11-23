import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { config } from "../../config.js";
import {
  clearAuthCookies,
  isMobileClient,
  requireUser,
  setAuthCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from "../../lib/auth.js";
import { AppError } from "../../lib/errors.js";
import { randomToken, signAccessToken } from "../../lib/crypto.js";
import { enforceScopedLimit, rateLimitKey } from "../../lib/rate-limit.js";
import {
  forgotPassword,
  resendVerification,
  findOrCreateGoogleUser,
  login,
  logout,
  logoutAll,
  oauthIssueTokens,
  refresh,
  register,
  resetPassword,
  toPublicUser,
  verifyEmail,
} from "./service.js";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./schemas.js";
import { parseLocale } from "../../lib/i18n.js";
import { prisma } from "../../lib/prisma.js";

const OAUTH_STATE_COOKIE = "futgrid_oauth_state";

export async function registerAuthRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/auth/register",
    {
      schema: {
        tags: ["auth"],
        body: registerSchema,
      },
      ...(config.RATE_LIMIT_ENABLED
        ? { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } }
        : {}),
    },
    async (request, reply) => {
      const user = await register(request.body, request);
      return reply.status(201).send({ user });
    },
  );

  app.post(
    "/auth/login",
    {
      schema: { tags: ["auth"], body: loginSchema },
      ...(config.RATE_LIMIT_ENABLED
        ? { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }
        : {}),
    },
    async (request, reply) => {
      const { user, tokens } = await login(request.body, request);
      if (isMobileClient(request)) {
        return reply.send({
          user: toPublicUser(user),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: config.ACCESS_TOKEN_TTL_MINUTES * 60,
        });
      }
      setAuthCookies(reply, tokens);
      return reply.send({ user: toPublicUser(user) });
    },
  );

  app.post(
    "/auth/refresh",
    {
      schema: { tags: ["auth"], body: refreshSchema },
    },
    async (request, reply) => {
      const body = request.body ?? {};
      const raw = body.refreshToken ?? request.cookies[REFRESH_COOKIE];
      const { user, tokens } = await refresh(raw, request);
      if (isMobileClient(request) || body.refreshToken) {
        return reply.send({
          user: toPublicUser(user),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: config.ACCESS_TOKEN_TTL_MINUTES * 60,
        });
      }
      setAuthCookies(reply, tokens);
      return reply.send({ user: toPublicUser(user) });
    },
  );

  app.post(
    "/auth/logout",
    { schema: { tags: ["auth"], body: refreshSchema } },
    async (request, reply) => {
      const raw = (request.body ?? {}).refreshToken ?? request.cookies[REFRESH_COOKIE];
      await logout(raw);
      clearAuthCookies(reply);
      return reply.send({ ok: true });
    },
  );

  app.post("/auth/logout-all", { schema: { tags: ["auth"] } }, async (request, reply) => {
    const user = requireUser(request);
    await logoutAll(user.id);
    clearAuthCookies(reply);
    return reply.send({ ok: true });
  });

  app.post(
    "/auth/verify-email",
    { schema: { tags: ["auth"], body: verifyEmailSchema } },
    async (request, reply) => {
      await verifyEmail(request.body.token);
      return reply.send({ ok: true });
    },
  );

  app.post(
    "/auth/resend-verification",
    { schema: { tags: ["auth"], body: resendVerificationSchema } },
    async (request, reply) => {
      await enforceScopedLimit(
        rateLimitKey("resend-verify", request.ip, request.body.email),
        5,
        60 * 60,
      );
      await resendVerification(request.body.email);
      return reply.send({ ok: true, message: "If this email needs verification, we sent a link" });
    },
  );

  app.post(
    "/auth/forgot-password",
    { schema: { tags: ["auth"], body: forgotPasswordSchema } },
    async (request, reply) => {
      await enforceScopedLimit(
        rateLimitKey("forgot", request.ip, request.body.email),
        3,
        60 * 60,
      );
      await forgotPassword(request.body.email);
      return reply.send({
        ok: true,
        message: "If this email is registered, we sent a link",
      });
    },
  );

  app.post(
    "/auth/reset-password",
    { schema: { tags: ["auth"], body: resetPasswordSchema } },
    async (request, reply) => {
      await resetPassword(request.body.token, request.body.password);
      return reply.send({ ok: true });
    },
  );

  app.get("/auth/google", { schema: { tags: ["auth"] } }, async (_request, reply) => {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      throw new AppError("OAUTH_NOT_CONFIGURED");
    }
    const state = randomToken(24);
    reply.setCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: "lax",
      path: "/v1/auth/google",
      maxAge: 600,
    });
    const params = new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID,
      redirect_uri: config.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get(
    "/auth/google/callback",
    {
      schema: {
        tags: ["auth"],
        querystring: z.object({
          code: z.string().min(10),
          state: z.string().min(10),
        }),
      },
    },
    async (request, reply) => {
      if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
        throw new AppError("OAUTH_NOT_CONFIGURED");
      }
      const cookieState = request.cookies[OAUTH_STATE_COOKIE];
      if (!cookieState || cookieState !== request.query.state) {
        throw new AppError("OAUTH_FAILED", { message: "Invalid OAuth state" });
      }
      reply.clearCookie(OAUTH_STATE_COOKIE, { path: "/v1/auth/google" });

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: request.query.code,
          client_id: config.GOOGLE_CLIENT_ID,
          client_secret: config.GOOGLE_CLIENT_SECRET,
          redirect_uri: config.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenResponse.ok) throw new AppError("OAUTH_FAILED");
      const tokenData = (await tokenResponse.json()) as { access_token?: string };
      if (!tokenData.access_token) throw new AppError("OAUTH_FAILED");

      const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!profileResponse.ok) throw new AppError("OAUTH_FAILED");
      const profile = (await profileResponse.json()) as {
        sub?: string;
        email?: string;
        name?: string;
        email_verified?: boolean;
      };
      if (!profile.sub || !profile.email) throw new AppError("OAUTH_FAILED");
      if (profile.email_verified !== true) {
        throw new AppError("OAUTH_FAILED", { message: "Google email is not verified" });
      }

      const user = await findOrCreateGoogleUser({
        providerAccountId: profile.sub,
        email: profile.email,
        name: profile.name,
      });
      const tokens = await oauthIssueTokens(user, request);
      setAuthCookies(reply, tokens);
      return reply.redirect(`${config.APP_URL}/hesab?oauth=ok`);
    },
  );

  app.get("/auth/socket-token", async (request) => {
    const user = requireUser(request);
    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    if (!account) throw new AppError("NOT_FOUND");
    return {
      token: await signAccessToken(account.id, user.role),
      expiresIn: config.ACCESS_TOKEN_TTL_MINUTES * 60,
      user: account,
    };
  });

  app.get("/auth/csrf", async (request) => {
    const token = request.cookies[ACCESS_COOKIE] ? "cookie-session" : "none";
    return { mode: token, originRequired: true };
  });

  app.get("/auth/locale", async (request) => ({
    locale: parseLocale(request.headers["accept-language"] as string | undefined),
  }));
}
