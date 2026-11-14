import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { publishObject } from "../../lib/storage.js";

export const mediaSchema = z.object({
  entityType: z.enum(["player", "club", "coach", "game", "other"]),
  entityId: z.string().min(1).max(120),
  kind: z.string().min(1).max(40).default("portrait"),
  sourceUrl: z.string().url(),
  license: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
});

export type MediaInput = z.infer<typeof mediaSchema>;

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function processMedia(input: MediaInput) {
  if (input.sourceUrl.includes("wikimedia.org") && (!input.license || !input.author)) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "license", rule: "wikimedia_license_and_author_required" }],
    });
  }
  const response = await fetch(input.sourceUrl, {
    headers: { "User-Agent": "FutGridBot/1.0 (https://futgrid.az)" },
  });
  if (!response.ok) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "sourceUrl", rule: "download_failed" }],
    });
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "sourceUrl", rule: "not_an_image" }],
    });
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > config.MEDIA_MAX_BYTES) {
    throw new AppError("VALIDATION_FAILED", {
      details: [{ field: "sourceUrl", rule: "image_too_large" }],
    });
  }

  const webp = await sharp(buffer)
    .rotate()
    .resize({ width: Math.min(640, Math.max(1, config.MEDIA_MAX_WIDTH)), withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const hash = createHash("sha256").update(webp).digest("hex").slice(0, 16);
  const key = `${safeSegment(input.entityType)}/${safeSegment(input.entityId)}-${hash}.webp`;
  const published = await publishObject("media", key, webp, "image/webp");

  const media = await prisma.media.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      kind: input.kind,
      sourceUrl: input.sourceUrl,
      license: input.license ?? null,
      author: input.author ?? null,
      hash,
      urls: { original: published.url, local: published.localPath },
      status: "ready",
    },
  });

  if (input.entityType === "player") {
    const playerId = Number(input.entityId);
    if (Number.isInteger(playerId)) {
      await prisma.playerRecord.updateMany({
        where: { id: playerId },
        data: { photoUrl: published.url },
      });
    }
  }
  if (input.entityType === "club") {
    const clubId = Number(input.entityId);
    if (Number.isInteger(clubId)) {
      await prisma.clubRecord.updateMany({
        where: { id: clubId },
        data: { logoUrl: published.url },
      });
    }
  }
  if (input.entityType === "coach") {
    await prisma.coachRecord.updateMany({
      where: { id: input.entityId },
      data: { photoUrl: published.url },
    });
  }

  return { ...media, url: published.url };
}
