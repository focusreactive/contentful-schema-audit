import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AiInputError } from "../../cli/exit-codes.js";
import type { NarrationInput } from "../narration/narrator.js";
import { readNarrationFile, toNarration, validateNarrationData } from "./narration-file.js";

const input: NarrationInput = {
  overall: { score: 40, band: "poor", scoredCount: 2, notAssessableCount: 0, notApplicableCount: 0 },
  dimensions: [
    {
      id: "seo",
      title: "SEO Readiness",
      state: "scored",
      score: 40,
      band: "poor",
      failedChecks: [
        { id: "seo.title", title: "Meta title", severity: "major", evidenceSummary: "0/2 types", fixHint: "Add field" },
      ],
    },
    { id: "modeling", title: "Content Modeling Quality", state: "scored", score: 80, band: "good", failedChecks: [] },
  ],
};

const valid = {
  overall: "The model is in poor shape.",
  dimensions: [
    { id: "seo", narration: "SEO fields are missing." },
    { id: "modeling", narration: "Modeling is solid." },
  ],
  findings: [{ id: "seo.title", impact: "Pages get default titles in search results.", fix: "Add a metaTitle field." }],
  model: "test-model",
};

describe("validateNarrationData", () => {
  it("accepts a document covering every dimension and failed check", () => {
    const { file, issues } = validateNarrationData(valid, input);

    expect(issues).toEqual([]);
    expect(file?.model).toBe("test-model");
  });

  it("rejects missing dimension entries", () => {
    const { issues } = validateNarrationData({ ...valid, dimensions: valid.dimensions.slice(0, 1) }, input);

    expect(issues.join("\n")).toContain('missing dimensions entry for id "modeling"');
  });

  it("rejects unknown dimension ids", () => {
    const { issues } = validateNarrationData(
      { ...valid, dimensions: [...valid.dimensions, { id: "bogus", narration: "x" }] },
      input,
    );

    expect(issues.join("\n")).toContain('unknown dimension id "bogus"');
  });

  it("rejects missing and unknown finding ids", () => {
    const { issues } = validateNarrationData(
      { ...valid, findings: [{ id: "seo.canonical", impact: "x", fix: "y" }] },
      input,
    );

    expect(issues.join("\n")).toContain('unknown finding id "seo.canonical"');
    expect(issues.join("\n")).toContain('missing findings entry for failed check "seo.title"');
  });
});

describe("toNarration", () => {
  it("maps arrays into keyed records", () => {
    const { file } = validateNarrationData(valid, input);
    if (!file) throw new Error("expected valid file");

    expect(toNarration(file)).toEqual({
      overall: "The model is in poor shape.",
      dimensions: { seo: "SEO fields are missing.", modeling: "Modeling is solid." },
      findings: {
        "seo.title": { impact: "Pages get default titles in search results.", fix: "Add a metaTitle field." },
      },
    });
  });
});

describe("readNarrationFile", () => {
  it("throws AiInputError pointing at the brief when the file is missing", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "narr-test-"));

    const failure = readNarrationFile(workDir, input);

    await expect(failure).rejects.toBeInstanceOf(AiInputError);
    await expect(failure).rejects.toThrow("brief-narration.md");
  });

  it("throws AiInputError on invalid JSON", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "narr-test-"));
    await writeFile(join(workDir, "narration.json"), "not json", "utf8");

    await expect(readNarrationFile(workDir, input)).rejects.toThrow(/not valid JSON/);
  });

  it("returns the parsed file when valid", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "narr-test-"));
    await writeFile(join(workDir, "narration.json"), JSON.stringify(valid), "utf8");

    await expect(readNarrationFile(workDir, input)).resolves.toMatchObject({ model: "test-model" });
  });
});
