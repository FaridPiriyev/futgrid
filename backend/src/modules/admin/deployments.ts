import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

const deploymentEntrySchema = z.object({
  id: z.string().min(1).max(100),
  commit: z.string().regex(/^[0-9a-f]{40}$/),
  branch: z.string().min(1).max(100),
  status: z.enum(["building", "deploying", "health_check", "succeeded", "failed"]),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  error: z.string().max(500).nullable(),
  rollbackStatus: z.enum(["succeeded", "failed"]).nullable(),
});

export type DeploymentEntry = z.infer<typeof deploymentEntrySchema>;

export function parseDeploymentHistory(content: string, limit: number): DeploymentEntry[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new RangeError("Deployment history limit must be between 1 and 200.");
  }

  const latestById = new Map<string, DeploymentEntry>();
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;

    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid deployment history JSON on line ${index + 1}.`, {
        cause: error,
      });
    }

    const entry = deploymentEntrySchema.parse(value);
    const previous = latestById.get(entry.id);
    if (!previous || Date.parse(entry.updatedAt) >= Date.parse(previous.updatedAt)) {
      latestById.set(entry.id, entry);
    }
  }

  return [...latestById.values()]
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, limit);
}

export async function listDeploymentHistory(limit: number): Promise<DeploymentEntry[]> {
  const file = resolve(process.cwd(), "storage/deployments.jsonl");
  let content: string;
  try {
    content = await readFile(file, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  return parseDeploymentHistory(content, limit);
}
