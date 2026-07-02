import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchedPage, stubAdapter } from "../../../test/fixtures/cli.js";
import { AiInputError } from "../exit-codes.js";
import { readScoredFile } from "../../core/artifacts/scored-file.js";
import { readStateFile } from "../../core/artifacts/state.js";
import type { NarrationInput } from "../../core/narration/narrator.js";
import type { SemanticDigest } from "../../core/semantic/digest.js";
import { runDigest } from "./digest.js";
import { runFinalize } from "./finalize.js";
import { runScore } from "./score.js";

const FIXED_NOW = "2026-07-02T00:00:00.000Z";
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

function buildValidNarration(input: NarrationInput): unknown {
  return {
    overall: "Fixture narration overall.",
    dimensions: input.dimensions.map((d) => ({ id: d.id, narration: `About ${d.title}.` })),
    findings: input.dimensions.flatMap((d) => d.failedChecks.map((c) => ({ id: c.id, impact: "Impact.", fix: "Fix." }))),
    model: "test-model",
  };
}

async function seedDigestOnly(): Promise<string> {
  const { workDir } = await runDigest({ spaceId: "space1", token: "secret-token" }, deps);
  return workDir;
}

async function seedScored(): Promise<string> {
  const workDir = await seedDigestOnly();
  const state = await readStateFile(workDir);
  await writeFile(join(workDir, "semantic.json"), JSON.stringify(buildValidSemantic(state.digest)), "utf8");
  await runScore({ workDir, semantic: true });
  return workDir;
}

describe("runFinalize", () => {
  it("assembles a shape-identical ValidationResult with narration", async () => {
    const workDir = await seedScored();
    const { narrationInput } = await readScoredFile(workDir);
    await writeFile(join(workDir, "narration.json"), JSON.stringify(buildValidNarration(narrationInput)), "utf8");

    const result = await runFinalize(
      { workDir, narration: true, includeModel: false, includeRawSchema: false },
      { now: () => FIXED_NOW },
    );

    expect(Object.keys(result).sort()).toEqual(
      ["dimensions", "generatedAt", "model", "narration", "overall", "rawSchema", "source"].sort(),
    );
    expect(result.source).toMatchObject({ cms: "contentful", spaceId: "space1" });
    expect(result.narration?.overall).toBe("Fixture narration overall.");
    expect(result.model).toBeUndefined();
    expect(result.rawSchema).toBeUndefined();
    expect(result.generatedAt).toBe(FIXED_NOW);
  });

  it("--no-narration omits narration; include flags embed model and rawSchema", async () => {
    const workDir = await seedScored();

    const result = await runFinalize(
      { workDir, narration: false, includeModel: true, includeRawSchema: true },
      { now: () => FIXED_NOW },
    );

    expect(result.narration).toBeUndefined();
    expect(result.model).toBeDefined();
    expect(result.rawSchema).toBeDefined();
  });

  it("throws AiInputError on invalid narration.json", async () => {
    const workDir = await seedScored();
    await writeFile(join(workDir, "narration.json"), JSON.stringify({ overall: "" }), "utf8");

    await expect(
      runFinalize({ workDir, narration: true, includeModel: false, includeRawSchema: false }, { now: () => FIXED_NOW }),
    ).rejects.toBeInstanceOf(AiInputError);
  });

  it("fails operationally when scored.json is missing", async () => {
    const workDir = await seedDigestOnly();

    await expect(
      runFinalize({ workDir, narration: false, includeModel: false, includeRawSchema: false }, { now: () => FIXED_NOW }),
    ).rejects.toThrow('Run "cms-validate score" first');
  });
});
