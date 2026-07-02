import { describe, expect, it } from "vitest";
import { z } from "zod";
import { narrationFileSchema } from "../artifacts/narration-file.js";
import type { NarrationInput } from "../narration/narrator.js";
import { renderNarrationBrief } from "./narration-brief.js";

const narrationInput: NarrationInput = {
  overall: { score: 40, band: "poor", scoredCount: 1, notAssessableCount: 0, notApplicableCount: 0 },
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
  ],
};

describe("renderNarrationBrief", () => {
  const brief = renderNarrationBrief({ narrationInput, workDir: "/tmp/wd-123" });

  it("embeds the schema generated from the validator schema", () => {
    expect(brief).toContain(JSON.stringify(z.toJSONSchema(narrationFileSchema), null, 2));
  });

  it("embeds the scored data", () => {
    expect(brief).toContain('"seo.title"');
  });

  it("names the output file, next command, and fallback", () => {
    expect(brief).toContain("/tmp/wd-123/narration.json");
    expect(brief).toContain("cms-validate finalize --work-dir /tmp/wd-123");
    expect(brief).toContain("--no-narration");
  });

  it("carries the grounding and length rules", () => {
    expect(brief).toContain("120 words");
    expect(brief).toContain("Never invent");
  });
});
