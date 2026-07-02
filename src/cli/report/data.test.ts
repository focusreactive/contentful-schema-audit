import { buildReportData } from "./data.js";
import type { ValidationResult } from "../../core/result.js";

function baseResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    source: {
      url: "https://handgadvocates.com",
      cms: "contentful",
      spaceId: "j3e6q038l6io",
      environment: "master",
      acquisition: "sniffed",
    },
    overall: { score: 42, band: "poor", scoredCount: 2, notAssessableCount: 0, notApplicableCount: 1 },
    dimensions: [
      {
        id: "seo",
        title: "SEO Readiness",
        tier: "high",
        weight: 1.5,
        state: "scored",
        score: 0,
        band: "poor",
        checks: [
          {
            id: "seo.title",
            title: "Meta title field present",
            severity: "major",
            status: "fail",
            evidence: { summary: "0 of 2 page types declare a meta-title field", affectedTypes: ["aboutUs", "homePage"] },
            fixHint: "Add a metaTitle field to each page-like type.",
          },
          {
            id: "seo.canonical",
            title: "Canonical URL field present",
            severity: "critical",
            status: "fail",
            evidence: { summary: "0 of 2 page types declare a canonical field" },
            fixHint: "Add a canonicalUrl field.",
          },
        ],
      },
      {
        id: "schemaDebt",
        title: "Schema Debt",
        tier: "situational",
        weight: 0.5,
        state: "scored",
        score: 80,
        band: "good",
        checks: [
          {
            id: "schemaDebt.hiddenFields",
            title: "Few hidden/read-only fields",
            severity: "major",
            status: "pass",
            evidence: { summary: "0 of 10 fields are hidden from editors" },
            fixHint: "Unhide or delete hidden fields.",
          },
          {
            id: "schemaDebt.noDescription",
            title: "Content types have descriptions",
            severity: "minor",
            status: "fail",
            evidence: { summary: "1 of 2 content types lack a description" },
            fixHint: "Fill in type descriptions.",
          },
        ],
      },
      {
        id: "i18n",
        title: "Internationalization",
        tier: "situational",
        weight: 0.5,
        state: "not_applicable",
        reason: "Single-locale space — internationalization does not apply.",
        checks: [],
      },
    ],
    narration: {
      overall: "Overall verdict text.",
      dimensions: { seo: "SEO narration.", i18n: "I18n narration." },
      findings: {
        "seo.canonical": { impact: "Canonical impact.", fix: "Canonical fix from narration." },
      },
    },
    model: {
      cms: "contentful",
      spaceId: "j3e6q038l6io",
      environment: "master",
      contentTypes: [
        { id: "a", name: "A", fields: [{ id: "f1" }, { id: "f2" }] },
        { id: "b", name: "B", fields: [{ id: "f3" }] },
      ],
    } as ValidationResult["model"],
    generatedAt: "2026-07-02T19:44:59.097Z",
    ...overrides,
  };
}

describe("buildReportData — meta and overall", () => {
  it("derives site label, labels, counts, and date", () => {
    const data = buildReportData(baseResult());
    expect(data.siteLabel).toBe("handgadvocates.com");
    expect(data.meta).toEqual({
      cmsLabel: "Contentful",
      spaceId: "j3e6q038l6io",
      environment: "master",
      typeCount: 2,
      fieldCount: 3,
      generatedDate: "2026-07-02",
    });
    expect(data.overall.score).toBe(42);
    expect(data.overall.bandLabel).toBe("Poor");
    expect(data.overall.verdict).toBe("Overall verdict text.");
    expect(data.checkTotals).toEqual({ passed: 1, failed: 3, notAssessable: 0 });
  });

  it("falls back to spaceId when url is absent and nulls when model is absent", () => {
    const result = baseResult({ model: undefined });
    result.source = { ...result.source, url: undefined };
    const data = buildReportData(result);
    expect(data.siteLabel).toBe("j3e6q038l6io");
    expect(data.meta.typeCount).toBeNull();
    expect(data.meta.fieldCount).toBeNull();
  });
});

describe("buildReportData — scoreboard", () => {
  it("maps scored and not-applicable dimensions", () => {
    const rows = buildReportData(baseResult()).scoreboard;
    expect(rows[0]).toEqual({
      title: "SEO Readiness",
      score: 0,
      bandLabel: "Poor",
      tierLabel: "HIGH",
      passed: 0,
      total: 2,
    });
    expect(rows[2]).toEqual({
      title: "Internationalization",
      score: null,
      bandLabel: "Not applicable",
      tierLabel: "SITUATIONAL",
      passed: null,
      total: null,
    });
  });
});

describe("buildReportData — check ordering and cards", () => {
  it("orders failed first, severity descending, then passed", () => {
    const dims = buildReportData(baseResult()).dimensions;
    expect(dims[0]!.checks?.map((c) => c.title)).toEqual([
      "Canonical URL field present", // critical, input order 2nd
      "Meta title field present", // major, input order 1st
    ]);
    expect(dims[1]!.checks?.map((c) => c.statusLabel)).toEqual(["Failed", "Passed"]);
  });

  it("merges narration into failed checks and falls back to fixHint", () => {
    const seoChecks = buildReportData(baseResult()).dimensions[0]!.checks!;
    const canonical = seoChecks[0]!;
    expect(canonical.impact).toBe("Canonical impact.");
    expect(canonical.fix).toBe("Canonical fix from narration.");
    const metaTitle = seoChecks[1]!;
    expect(metaTitle.impact).toBeNull();
    expect(metaTitle.fix).toBe("Add a metaTitle field to each page-like type.");
    expect(metaTitle.affectedTypes).toEqual(["aboutUs", "homePage"]);
    const passed = buildReportData(baseResult()).dimensions[1]!.checks![1]!;
    expect(passed.impact).toBeNull();
    expect(passed.fix).toBeNull();
  });
});

describe("buildReportData — priorities", () => {
  it("ranks by severity weight x dimension weight with deterministic ties", () => {
    const priorities = buildReportData(baseResult()).priorities;
    // seo.canonical: 3 x 1.5 = 4.5; seo.title: 2 x 1.5 = 3; schemaDebt.noDescription: 1 x 0.5 = 0.5
    expect(priorities.map((p) => p.checkTitle)).toEqual([
      "Canonical URL field present",
      "Meta title field present",
      "Content types have descriptions",
    ]);
    expect(priorities[0]).toEqual({
      rank: 1,
      checkTitle: "Canonical URL field present",
      severityLabel: "Critical",
      dimensionTitle: "SEO Readiness",
    });
  });

  it("returns an empty array when nothing failed", () => {
    const result = baseResult();
    result.dimensions = [result.dimensions[2]!];
    expect(buildReportData(result).priorities).toEqual([]);
  });
});

describe("buildReportData — dimensions and narration fallbacks", () => {
  it("indexes dimensions and maps narration per state", () => {
    const dims = buildReportData(baseResult()).dimensions;
    expect(dims.map((d) => d.index)).toEqual([1, 2, 3]);
    expect(dims[0]!.narration).toBe("SEO narration.");
    expect(dims[1]!.narration).toBeNull(); // scored, no narration entry
    expect(dims[2]!.narration).toBe("I18n narration."); // non-scored prefers narration
    expect(dims[2]!.checks).toBeNull();
    expect(dims[2]!.score).toBeNull();
  });

  it("without narration: verdict null, reason used for non-scored dimensions", () => {
    const data = buildReportData(baseResult({ narration: undefined }));
    expect(data.overall.verdict).toBeNull();
    expect(data.dimensions[2]!.narration).toBe(
      "Single-locale space — internationalization does not apply.",
    );
  });
});
