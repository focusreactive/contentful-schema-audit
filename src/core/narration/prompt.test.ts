import { buildNarrationMessages } from "./prompt.js";
import type { NarrationInput } from "./narrator.js";

const input: NarrationInput = {
  overall: { score: 50, band: "poor", scoredCount: 1, notAssessableCount: 0, notApplicableCount: 0 },
  dimensions: [{ id: "seo", title: "SEO Readiness", state: "scored", score: 50, band: "poor",
    failedChecks: [{ id: "seo.canonical", title: "Canonical", severity: "critical", evidenceSummary: "missing", fixHint: "add it" }] }],
};

describe("buildNarrationMessages", () => {
  it("embeds findings and forbids inventing facts", () => {
    const { system, prompt } = buildNarrationMessages(input);
    expect(system).toMatch(/only the findings provided/i);
    expect(prompt).toContain("seo.canonical");
  });
});
