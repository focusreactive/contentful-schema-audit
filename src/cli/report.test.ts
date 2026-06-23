import { renderReport } from "./report.js";
import type { ValidationResult } from "../core/result.js";

function baseResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    source: { url: "https://site.com", cms: "contentful", spaceId: "sp", environment: "master", acquisition: "sniffed" },
    overall: { score: 64, band: "warn", scoredCount: 1, notAssessableCount: 0, notApplicableCount: 1 },
    dimensions: [
      {
        id: "seo", title: "SEO Readiness", tier: "high", weight: 1.5, state: "scored", score: 40, band: "poor",
        checks: [
          { id: "seo.canonical", title: "Canonical URL field present", severity: "critical", status: "fail",
            evidence: { summary: "0 of 3 page-like types declare a canonical field" }, fixHint: "Add a canonicalUrl field." },
          { id: "seo.meta", title: "Meta description present", severity: "minor", status: "fail",
            evidence: { summary: "2 types lack a meta description" }, fixHint: "Add a metaDescription field." },
        ],
      },
      { id: "i18n", title: "Internationalization", tier: "situational", weight: 0.5, state: "not_applicable", reason: "Single-locale space.", checks: [] },
    ],
    generatedAt: "2026-06-22T00:00:00Z",
    ...overrides,
  };
}

describe("renderReport", () => {
  it("renders header, overall line, and a dimension assessments section", () => {
    const out = renderReport(baseResult());
    expect(out).toContain("# CMS Schema Health Report");
    expect(out).toContain("contentful");
    expect(out).toContain("64 / 100");
    expect(out).toContain("warn");
    expect(out).toContain("of 2 dimensions scored");
    expect(out).toContain("## Dimension assessments");
  });

  it("renders a scored dimension with score, checks count, why, skip verdict, and fixes", () => {
    const out = renderReport(baseResult());
    expect(out).toContain("### SEO Readiness — 40 / 100 (poor)");
    expect(out).toContain("**Checks:** 0 of 2 passed");
    expect(out).toContain("**Why it matters:**");
    expect(out).toContain("**Can I skip it?** No — prioritize; high-impact area.");
    expect(out).toContain("- Canonical URL field present — Add a canonicalUrl field.");
    expect(out).toContain("- Meta description present — Add a metaDescription field.");
  });

  it("counts only passing checks toward the success count", () => {
    const out = renderReport(baseResult({
      dimensions: [{
        id: "validation", title: "Validation Discipline", tier: "medium", weight: 1, state: "scored", score: 66, band: "warn",
        checks: [
          { id: "v.req", title: "Types declare required fields", severity: "major", status: "pass", evidence: { summary: "ok" }, fixHint: "n/a" },
          { id: "v.uniq", title: "Identifier fields are unique", severity: "major", status: "pass", evidence: { summary: "ok" }, fixHint: "n/a" },
          { id: "v.val", title: "Fields carry validations", severity: "minor", status: "fail", evidence: { summary: "few" }, fixHint: "Add validations." },
        ],
      }],
    }));
    expect(out).toContain("### Validation Discipline — 66 / 100 (warn)");
    expect(out).toContain("**Checks:** 2 of 3 passed");
    expect(out).toContain("**Can I skip it?** Optional — some gaps.");
    expect(out).toContain("- Fields carry validations — Add validations.");
  });

  it("renders a not-applicable dimension as skippable with no action", () => {
    const out = renderReport(baseResult());
    expect(out).toContain("### Internationalization — not applicable — Single-locale space.");
    expect(out).toContain("**Checks:** —");
    expect(out).toContain("**Can I skip it?** Yes — not applicable for this space.");
    expect(out).toContain("No action needed.");
  });

  it("marks a healthy scored dimension as skippable", () => {
    const out = renderReport(baseResult({
      dimensions: [{
        id: "modeling", title: "Content Modeling Quality", tier: "high", weight: 1.5, state: "scored", score: 95, band: "good",
        checks: [{ id: "m.rt", title: "Body fields use rich text", severity: "major", status: "pass", evidence: { summary: "ok" }, fixHint: "n/a" }],
      }],
    }));
    expect(out).toContain("**Can I skip it?** Yes — healthy.");
    expect(out).toContain("**Checks:** 1 of 1 passed");
    expect(out).toContain("No action needed.");
  });

  it("prefers AI narration for the verdict and per-finding fixes when present", () => {
    const out = renderReport(baseResult({
      narration: {
        overall: "The schema is mostly healthy but SEO needs attention.",
        dimensions: {},
        findings: { "seo.canonical": { impact: "Pages cannot declare a canonical URL.", fix: "Add a canonicalUrl field to page types." } },
      },
    }));
    expect(out).toContain("The schema is mostly healthy but SEO needs attention.");
    expect(out).toContain("- Canonical URL field present — Add a canonicalUrl field to page types.");
  });

  it("renders every dimension present in the result", () => {
    const out = renderReport(baseResult());
    expect(out).toContain("### SEO Readiness");
    expect(out).toContain("### Internationalization");
  });

  it("renders N/A when overall score is null", () => {
    const out = renderReport(baseResult({
      overall: { score: null, band: "not_assessed", scoredCount: 0, notAssessableCount: 2, notApplicableCount: 0 },
    }));
    expect(out).toContain("N/A");
  });
});
