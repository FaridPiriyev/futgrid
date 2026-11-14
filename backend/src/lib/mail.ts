import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "../config.js";
import type { Locale } from "./i18n.js";
import { logger } from "./logger.js";

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const copy = {
  verify: {
    subject: {
      az: "FutGrid e-poçtunuzu təsdiqləyin",
      en: "Verify your FutGrid email",
      ru: "Подтвердите email FutGrid",
    },
    action: { az: "E-poçtu təsdiqlə", en: "Verify email", ru: "Подтвердить email" },
    intro: {
      az: "FutGrid hesabınızı aktivləşdirmək üçün aşağıdakı keçidə klikləyin.",
      en: "Click the link below to activate your FutGrid account.",
      ru: "Нажмите на ссылку ниже, чтобы активировать аккаунт FutGrid.",
    },
  },
  reset: {
    subject: {
      az: "FutGrid şifrə sıfırlama",
      en: "Reset your FutGrid password",
      ru: "Сброс пароля FutGrid",
    },
    action: { az: "Şifrəni sıfırla", en: "Reset password", ru: "Сбросить пароль" },
    intro: {
      az: "Şifrənizi sıfırlamaq üçün aşağıdakı keçidə klikləyin. Keçid 1 saat etibarlıdır.",
      en: "Click the link below to reset your password. This link is valid for 1 hour.",
      ru: "Нажмите на ссылку ниже, чтобы сбросить пароль. Ссылка действует 1 час.",
    },
  },
};

function template(type: "verify" | "reset", locale: Locale, link: string): MailOptions {
  const data = copy[type];
  const subject = data.subject[locale];
  const intro = data.intro[locale];
  const action = data.action[locale];
  return {
    to: "",
    subject,
    text: `${intro}\n\n${link}\n`,
    html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#0b1430;color:#f5f7ff;padding:32px">
      <h1 style="font-size:20px">FutGrid</h1>
      <p>${intro}</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px">${action}</a></p>
      <p style="color:#9aa4c7;font-size:12px">${link}</p>
    </body></html>`,
  };
}

export async function sendMail(options: MailOptions): Promise<void> {
  if (config.isTest) return;

  if (!config.RESEND_API_KEY) {
    if (config.isProduction) throw new Error("RESEND_API_KEY is required in production");
    const dir = resolve(process.cwd(), ".mail-outbox");
    mkdirSync(dir, { recursive: true });
    const file = resolve(dir, `${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
    writeFileSync(file, `To: ${options.to}\nSubject: ${options.subject}\n\n${options.html}`, "utf8");
    logger.info({ to: options.to, outbox: file }, "development email written to outbox");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });
  if (!response.ok) {
    logger.error({ status: response.status }, "resend email delivery failed");
    throw new Error("EMAIL_DELIVERY_FAILED");
  }
}

export async function sendVerificationEmail(
  email: string,
  locale: Locale,
  token: string,
): Promise<void> {
  const link = `${config.APP_URL}/hesab?verify=${encodeURIComponent(token)}`;
  await sendMail({ ...template("verify", locale, link), to: email });
}

export async function sendPasswordResetEmail(
  email: string,
  locale: Locale,
  token: string,
): Promise<void> {
  const link = `${config.APP_URL}/hesab?reset=${encodeURIComponent(token)}`;
  await sendMail({ ...template("reset", locale, link), to: email });
}
