import admin from "firebase-admin";
import { config } from "../config.js";
import { logger } from "./logger.js";
import { prisma } from "./prisma.js";

let initialized = false;

function app(): admin.app.App | null {
  if (!config.FCM_SERVICE_ACCOUNT_JSON) return null;
  if (!initialized) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(config.FCM_SERVICE_ACCOUNT_JSON) as admin.ServiceAccount,
        ),
      });
      initialized = true;
    } catch (error) {
      logger.error({ err: error }, "failed to initialize Firebase Admin");
      return null;
    }
  }
  return admin.app();
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<number> {
  if (!app()) return 0;
  const tokens = await prisma.pushToken.findMany({
    where: { userId, enabled: true },
    select: { id: true, token: true },
  });
  if (!tokens.length) return 0;
  const response = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map((token) => token.token),
    notification: { title, body },
    data,
  });
  const invalid: string[] = [];
  response.responses.forEach((result, index) => {
    if (!result.success) {
      const code = result.error?.code ?? "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token")
      ) {
        const token = tokens[index];
        if (token) invalid.push(token.id);
      }
    }
  });
  if (invalid.length) {
    await prisma.pushToken.updateMany({ where: { id: { in: invalid } }, data: { enabled: false } });
  }
  return response.successCount;
}
