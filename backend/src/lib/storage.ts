import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config.js";

export type StorageRoot = "data" | "media";

export function storageDir(root: StorageRoot): string {
  const configured = root === "data" ? config.CDN_DATA_DIR : config.CDN_MEDIA_DIR;
  return resolve(process.cwd(), configured);
}

export function localPath(root: StorageRoot, key: string): string {
  return resolve(storageDir(root), key);
}

export function publicBaseUrl(root: StorageRoot): string {
  return (root === "data" ? config.CDN_BASE_URL : config.MEDIA_BASE_URL).replace(/\/$/, "");
}

function r2Configured(): boolean {
  return Boolean(
    config.R2_ACCOUNT_ID &&
      config.R2_ACCESS_KEY_ID &&
      config.R2_SECRET_ACCESS_KEY &&
      config.R2_BUCKET,
  );
}

let r2Client: S3Client | null = null;

function getR2(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID as string,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return r2Client;
}

export async function publishObject(
  root: StorageRoot,
  key: string,
  body: Buffer | string,
  contentType: string,
): Promise<{ url: string; localPath: string }> {
  const path = localPath(root, key);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);

  if (r2Configured()) {
    await getR2().send(
      new PutObjectCommand({
        Bucket: config.R2_BUCKET as string,
        Key: `${root}/${key}`,
        Body: body,
        ContentType: contentType,
      }),
    );
    const base = (config.R2_PUBLIC_URL ?? publicBaseUrl(root)).replace(/\/$/, "");
    return { url: `${base}/${key}`, localPath: path };
  }

  return { url: `${publicBaseUrl(root)}/${key}`, localPath: path };
}
