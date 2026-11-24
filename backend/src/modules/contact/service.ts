import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { hashIp } from "../../lib/crypto.js";
import { enforceScopedLimit, rateLimitKey } from "../../lib/rate-limit.js";
import { sendMail } from "../../lib/mail.js";
import { logger } from "../../lib/logger.js";
import { parseLocale } from "../../lib/i18n.js";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config.js";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  message: z.string().trim().min(1).max(1000),
  honeypot: z.string().max(200).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

export async function submitContact(input: ContactInput, request: FastifyRequest) {
  await enforceScopedLimit(rateLimitKey("contact", request.ip), 3, 60 * 60);
  if (input.honeypot) return { ok: true };

  const locale = parseLocale(request.headers["accept-language"] as string | undefined);
  const message = await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      message: input.message,
      locale,
      ipHash: hashIp(request.ip),
    },
  });

  try {
    await sendMail({
      to: config.CONTACT_TO,
      replyTo: input.email,
      subject: `FutGrid contact: ${input.name}`,
      text: `From: ${input.name} <${input.email}>\nLocale: ${locale}\n\n${input.message}`,
      html: `<p><strong>From:</strong> ${input.name} &lt;${input.email}&gt;</p>
        <p><strong>Locale:</strong> ${locale}</p>
        <p style="white-space:pre-wrap">${input.message.replace(/[<>&]/g, (char) =>
          char === "<" ? "&lt;" : char === ">" ? "&gt;" : "&amp;",
        )}</p>`,
    });
  } catch (error) {
    logger.error({ err: error, contactId: message.id }, "contact notification email failed");
  }

  return { ok: true };
}
