import { describe, expect, it } from "vitest";
import { parseDeploymentHistory } from "../src/modules/admin/deployments.js";

const commitA = "a".repeat(40);
const commitB = "b".repeat(40);

function entry(id: string, commit: string, status: string, startedAt: string, updatedAt: string) {
  return JSON.stringify({
    id,
    commit,
    branch: "main",
    status,
    startedAt,
    updatedAt,
    finishedAt: status === "succeeded" ? updatedAt : null,
    error: null,
    rollbackStatus: null,
  });
}

describe("deployment history", () => {
  it("returns the latest status per deployment in newest-first order", () => {
    const history = [
      entry("a-1", commitA, "building", "2026-11-28T10:00:00.000Z", "2026-11-28T10:00:00.000Z"),
      entry("b-1", commitB, "succeeded", "2026-11-28T10:02:00.000Z", "2026-11-28T10:03:00.000Z"),
      entry("a-1", commitA, "succeeded", "2026-11-28T10:00:00.000Z", "2026-11-28T10:01:00.000Z"),
    ].join("\n");

    expect(parseDeploymentHistory(history, 10).map(({ id, status }) => [id, status])).toEqual([
      ["b-1", "succeeded"],
      ["a-1", "succeeded"],
    ]);
  });

  it("rejects malformed entries and invalid limits", () => {
    expect(() => parseDeploymentHistory("{broken}", 10)).toThrow(
      "Invalid deployment history JSON on line 1.",
    );
    expect(() => parseDeploymentHistory("", 0)).toThrow(RangeError);
  });
});
