import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchedPage, stubAdapter } from "../../../test/fixtures/cli.js";
import { AiInputError } from "../exit-codes.js";
import { readScoredFile } from "../../core/artifacts/scored-file.js";
import { readStateFile } from "../../core/artifacts/state.js";
import type { SemanticDigest } from "../../core/semantic/digest.js";
import { runDigest } from "./digest.js";
import { runScore } from "./score.js";

const deps = { fetchPage: async () => fetchedPage, adapter: stubAdapter() };

function buildValidSemantic(digest: SemanticDigest): unknown {
  return {
    typeRoles: [],
    fieldRoles: [],
    judgments: [
      ...digest.orphanCandidates.map((id) => ({
        kind: "orphanIsDebt",
        subject: id,
        verdict: "uncertain",
        confidence: 0.5,
        rationale: "test",
      })),
      ...digest.godTypeCandidates.map((id) => ({
        kind: "godTypeIsProblem",
        subject: id,
        verdict: "uncertain",
        confidence: 0.5,
        rationale: "test",
      })),
      { kind: "namingIsCryptic", subject: "_dimension", verdict: "refuted", confidence: 0.9, rationale: "test" },
      { kind: "redirectsAreMissing", subject: "_dimension", verdict: "uncertain", confidence: 0.5, rationale: "test" },
    ],
    model: "test-model",
  };
}

async function seedDigest(): Promise<string> {
  const { workDir } = await runDigest({ spaceId: "space1", token: "secret-token" }, deps);
  return workDir;
}

async function seedValidSemantic(workDir: string): Promise<void> {
  const state = await readStateFile(workDir);
  await writeFile(join(workDir, "semantic.json"), JSON.stringify(buildValidSemantic(state.digest)), "utf8");
}

describe("runScore", () => {
  it("with a valid semantic.json scores and writes scored.json + narration brief", async () => {
    const workDir = await seedDigest();
    await seedValidSemantic(workDir);

    const { brief } = await runScore({ workDir, semantic: true });

    const scored = await readScoredFile(workDir);
    expect(scored.semantic).toEqual({ model: "test-model" });
    expect(scored.narrationInput.dimensions.length).toBeGreaterThan(0);
    expect(brief).toContain(join(workDir, "narration.json"));
    await expect(readFile(join(workDir, "brief-narration.md"), "utf8")).resolves.toBe(brief);
  });

  it("throws AiInputError on invalid semantic.json", async () => {
    const workDir = await seedDigest();
    await writeFile(join(workDir, "semantic.json"), JSON.stringify({ nope: true }), "utf8");

    await expect(runScore({ workDir, semantic: true })).rejects.toBeInstanceOf(AiInputError);
  });

  it("--no-semantic skips semantic.json even when present and records null provenance", async () => {
    const workDir = await seedDigest();
    await writeFile(join(workDir, "semantic.json"), "INVALID GARBAGE", "utf8");

    await runScore({ workDir, semantic: false });

    const scored = await readScoredFile(workDir);
    expect(scored.semantic).toBeNull();
  });

  it("fails operationally (plain Error, not AiInputError) when state.json is missing", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "score-test-"));

    await expect(runScore({ workDir, semantic: true })).rejects.toThrow('Run "cms-validate digest" first');
    await expect(runScore({ workDir, semantic: true })).rejects.not.toBeInstanceOf(AiInputError);
  });
});
