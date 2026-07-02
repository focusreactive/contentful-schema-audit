import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readScoredFile, SCORED_SCHEMA_VERSION, writeScoredFile, type ScoredFile } from "./scored-file.js";

const overall = { score: 50, band: "poor", scoredCount: 1, notAssessableCount: 0, notApplicableCount: 0 } as const;

const scored: ScoredFile = {
  schemaVersion: SCORED_SCHEMA_VERSION,
  overall,
  dimensions: [],
  semantic: { model: "test-model" },
  narrationInput: { overall, dimensions: [] },
};

describe("scored file round-trip", () => {
  it("writes and reads back the same document", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "scored-test-"));

    await writeScoredFile(workDir, scored);

    await expect(readScoredFile(workDir)).resolves.toEqual(scored);
  });

  it("fails actionably when missing", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "scored-test-"));

    await expect(readScoredFile(workDir)).rejects.toThrow('Run "cms-validate score" first');
  });

  it("fails actionably on corrupt JSON", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "scored-test-"));
    await writeFile(join(workDir, "scored.json"), "{not json", "utf8");

    await expect(readScoredFile(workDir)).rejects.toThrow('Re-run "cms-validate score"');
  });

  it("fails actionably on version mismatch", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "scored-test-"));
    await writeFile(join(workDir, "scored.json"), JSON.stringify({ ...scored, schemaVersion: 999 }), "utf8");

    await expect(readScoredFile(workDir)).rejects.toThrow(/version 999[\s\S]*Re-run "cms-validate score"/);
  });
});
