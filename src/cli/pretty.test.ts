import { renderPretty } from "./pretty.js";
import type { ValidationResult } from "../core/result.js";

const result: ValidationResult = {
  source: { url: "https://site.com", cms: "contentful", spaceId: "sp", environment: "master", acquisition: "sniffed" },
  overall: { score: 64, band: "warn", scoredCount: 1, notAssessableCount: 0, notApplicableCount: 1 },
  dimensions: [
    { id: "seo", title: "SEO Readiness", tier: "high", weight: 1.5, state: "scored", score: 40, band: "poor",
      checks: [{ id: "seo.canonical", title: "Canonical URL field present", severity: "critical", status: "fail",
        evidence: { summary: "0 of 3 page-like types declare a canonical field" }, fixHint: "Add a canonicalUrl field." }] },
    { id: "i18n", title: "Internationalization", tier: "situational", weight: 0.5, state: "not_applicable",
      reason: "Single-locale space.", checks: [] },
  ],
  generatedAt: "2026-06-22T00:00:00Z",
};

describe("renderPretty", () => {
  it("renders the overall grade, dimension count, and a failed check line", () => {
    const out = renderPretty(result);
    expect(out).toContain("64");
    expect(out).toContain("of 2 dimensions scored");
    expect(out).toContain("SEO Readiness");
    expect(out).toContain("Canonical URL field present");
    expect(out).toContain("not applicable");
  });
});
