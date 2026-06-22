import { toNarrationInput } from "./input.js";
import type { DimensionResult, OverallGrade } from "../result.js";

const overall: OverallGrade = { score: 50, band: "poor", scoredCount: 1, notAssessableCount: 0, notApplicableCount: 0 };
const dimensions: DimensionResult[] = [{
  id: "seo", title: "SEO Readiness", tier: "high", weight: 1.5, state: "scored", score: 50, band: "poor",
  checks: [
    { id: "seo.title", title: "Meta title", severity: "major", status: "pass", evidence: { summary: "ok" }, fixHint: "" },
    { id: "seo.canonical", title: "Canonical", severity: "critical", status: "fail", evidence: { summary: "missing" }, fixHint: "add it" },
  ],
}];

describe("toNarrationInput", () => {
  it("includes only failed checks per dimension", () => {
    const input = toNarrationInput(overall, dimensions);
    expect(input.dimensions[0]?.failedChecks).toHaveLength(1);
    expect(input.dimensions[0]?.failedChecks[0]?.id).toBe("seo.canonical");
  });
});
