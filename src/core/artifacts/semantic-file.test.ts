import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AiInputError } from "../../cli/exit-codes.js";
import type { SemanticDigest } from "../semantic/digest.js";
import { readSemanticFile, validateSemanticData } from "./semantic-file.js";

const digest: SemanticDigest = {
  types: [
    {
      id: "blogPost",
      name: "Blog Post",
      fieldCount: 2,
      inDegree: 0,
      outDegree: 0,
      fields: [
        { id: "title", name: "Title", type: "text", required: true, localized: false, validationKinds: [] },
        { id: "slug", name: "Slug", type: "text", required: true, localized: false, validationKinds: ["unique"] },
      ],
    },
  ],
  orphanCandidates: ["blogPost"],
  godTypeCandidates: [],
};

const valid = {
  typeRoles: [{ typeId: "blogPost", role: "page", confidence: 0.9 }],
  fieldRoles: [{ typeId: "blogPost", fieldId: "slug", role: "slug", confidence: 0.9 }],
  judgments: [
    { kind: "orphanIsDebt", subject: "blogPost", verdict: "refuted", confidence: 0.8, rationale: "Entry point." },
    { kind: "namingIsCryptic", subject: "_dimension", verdict: "refuted", confidence: 0.9, rationale: "Clear names." },
    { kind: "redirectsAreMissing", subject: "_dimension", verdict: "uncertain", confidence: 0.5, rationale: "Unknown." },
  ],
  model: "test-model",
};

describe("validateSemanticData", () => {
  it("accepts a fully valid document", () => {
    const result = validateSemanticData(valid, digest);

    expect(result.issues).toEqual([]);
    expect(result.file?.model).toBe("test-model");
  });

  it("reports zod issues with paths", () => {
    const { issues, file } = validateSemanticData(
      { ...valid, typeRoles: [{ typeId: "blogPost", role: "hero", confidence: 2 }] },
      digest,
    );

    expect(file).toBeUndefined();
    expect(issues.join("\n")).toContain("typeRoles[0].role");
  });

  it("rejects unknown type ids with a closest-match hint", () => {
    const { issues } = validateSemanticData(
      { ...valid, typeRoles: [{ typeId: "blogPostt", role: "page", confidence: 0.9 }] },
      digest,
    );

    expect(issues.join("\n")).toContain('typeRoles[0]: typeId "blogPostt" not in digest — did you mean "blogPost"?');
  });

  it("rejects unknown field ids within a known type", () => {
    const { issues } = validateSemanticData(
      { ...valid, fieldRoles: [{ typeId: "blogPost", fieldId: "slugg", role: "slug", confidence: 0.9 }] },
      digest,
    );

    expect(issues.join("\n")).toContain('fieldRoles[0]: fieldId "slugg" not on type "blogPost" — did you mean "slug"?');
  });

  it("rejects a missing required judgment", () => {
    const { issues } = validateSemanticData({ ...valid, judgments: valid.judgments.slice(1) }, digest);

    expect(issues.join("\n")).toContain('missing judgment orphanIsDebt for subject "blogPost"');
  });

  it("rejects duplicate and unexpected judgments", () => {
    const extra = { kind: "godTypeIsProblem", subject: "blogPost", verdict: "confirmed", confidence: 0.9, rationale: "x" };
    const { issues } = validateSemanticData(
      { ...valid, judgments: [...valid.judgments, valid.judgments[0], extra] },
      digest,
    );

    expect(issues.join("\n")).toContain('duplicate judgment orphanIsDebt for subject "blogPost"');
    expect(issues.join("\n")).toContain('unexpected judgment godTypeIsProblem for subject "blogPost"');
  });
});

describe("readSemanticFile", () => {
  it("throws AiInputError pointing at the brief when the file is missing", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "sem-test-"));

    const failure = readSemanticFile(workDir, digest);

    await expect(failure).rejects.toBeInstanceOf(AiInputError);
    await expect(failure).rejects.toThrow("brief-semantic.md");
  });

  it("throws AiInputError with parse details on invalid JSON", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "sem-test-"));
    await writeFile(join(workDir, "semantic.json"), "```json\n{}\n```", "utf8");

    await expect(readSemanticFile(workDir, digest)).rejects.toThrow(/not valid JSON/);
  });

  it("returns the parsed file when valid", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "sem-test-"));
    await writeFile(join(workDir, "semantic.json"), JSON.stringify(valid), "utf8");

    await expect(readSemanticFile(workDir, digest)).resolves.toMatchObject({ model: "test-model" });
  });
});
