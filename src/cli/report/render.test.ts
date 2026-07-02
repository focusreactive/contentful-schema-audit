import { renderReport } from "./render.js";
import type { ReportData } from "./data.js";

function baseData(overrides: Partial<ReportData> = {}): ReportData {
  return {
    siteLabel: "handgadvocates.com",
    meta: {
      cmsLabel: "Contentful",
      spaceId: "j3e6q038l6io",
      environment: "master",
      typeCount: 2,
      fieldCount: 3,
      generatedDate: "2026-07-02",
    },
    overall: {
      score: 42,
      bandLabel: "Poor",
      verdict: "Overall verdict text.",
      scoredCount: 1,
      notAssessableCount: 0,
      notApplicableCount: 1,
    },
    scoreboard: [
      { title: "SEO Readiness", score: 0, bandLabel: "Poor", tierLabel: "HIGH", passed: 0, total: 2 },
      {
        title: "Internationalization",
        score: null,
        bandLabel: "Not applicable",
        tierLabel: "SITUATIONAL",
        passed: null,
        total: null,
      },
    ],
    checkTotals: { passed: 1, failed: 1, notAssessable: 0 },
    priorities: [
      { rank: 1, checkTitle: "Canonical URL field present", severityLabel: "Critical", dimensionTitle: "SEO Readiness" },
    ],
    dimensions: [
      {
        index: 1,
        title: "SEO Readiness",
        score: 0,
        bandLabel: "Poor",
        tierLabel: "HIGH",
        passed: 1,
        total: 2,
        narration: "SEO narration.",
        checks: [
          {
            title: "Canonical URL field present",
            severityLabel: "Critical",
            statusLabel: "Failed",
            failed: true,
            evidence: "0 of 2 page types declare a canonical field",
            affectedTypes: ["aboutUs", "homePage"],
            impact: "Canonical impact.",
            fix: "Canonical fix.",
          },
          {
            title: "Meta title field present",
            severityLabel: "Major",
            statusLabel: "Passed",
            failed: false,
            evidence: "2 of 2 page types declare a meta-title field",
            affectedTypes: [],
            impact: null,
            fix: null,
          },
        ],
      },
      {
        index: 2,
        title: "Internationalization",
        score: null,
        bandLabel: "Not applicable",
        tierLabel: "SITUATIONAL",
        passed: null,
        total: null,
        narration: "Single-locale space — internationalization does not apply.",
        checks: null,
      },
    ],
    ...overrides,
  };
}

describe("renderReport — overview", () => {
  it("renders title, meta table, score heading, gauge line, and verdict", () => {
    const out = renderReport(baseData());
    expect(out).toContain("# CMS Schema Health · handgadvocates.com");
    expect(out).toContain("| Contentful | `j3e6q038l6io` | `master`    |     2 |      3 | 2026-07-02 |");
    expect(out).toContain("## Score: 42 / 100");
    expect(out).toContain("`████████░░░░░░░░░░░░` `Poor`");
    expect(out).toContain("Overall verdict text.");
  });

  it("renders scoreboard rows with gauges and dashes for non-scored dimensions", () => {
    const out = renderReport(baseData());
    expect(out).toContain("### Scoreboard");
    expect(out).toContain("| SEO Readiness        |     0 | `░░░░░░░░░░` | `Poor`           | `HIGH`        |         0 / 2 |");
    expect(out).toContain("| Internationalization |     — |              | `Not applicable` | `SITUATIONAL` |             — |");
  });

  it("renders check totals with distribution bars and empty cell at zero", () => {
    const out = renderReport(baseData());
    expect(out).toContain("### Check totals");
    expect(out).toContain("| `Passed`         |     1 | `█`          |");
    expect(out).toContain("| `Not assessable` |     0 |              |");
  });

  it("renders the priorities table", () => {
    const out = renderReport(baseData());
    expect(out).toContain("### Priorities");
    expect(out).toContain("|   1 | Canonical URL field present | `Critical` | SEO Readiness |");
  });

  it("omits the priorities section when there are no failed checks", () => {
    const out = renderReport(baseData({ priorities: [] }));
    expect(out).not.toContain("### Priorities");
  });

  it("handles a null overall score", () => {
    const data = baseData();
    data.overall = { ...data.overall, score: null, bandLabel: "Not assessed", verdict: null };
    const out = renderReport(data);
    expect(out).toContain("## Score: N/A");
    expect(out).toContain("\n`Not assessed`\n");
    expect(out).toContain("1 of 2 dimensions scored — band Not assessed.");
  });
});

describe("renderReport — dimensions and cards", () => {
  it("renders enumerated dimension with meta table, narration, checks table, and card", () => {
    const out = renderReport(baseData());
    expect(out).toContain("## Dimensions");
    expect(out).toContain("### 1. SEO Readiness");
    expect(out).toContain("| 0     | `░░░░░░░░░░` | `Poor` | `HIGH` |         1 / 2 |");
    expect(out).toContain("SEO narration.");
    expect(out).toContain("#### Checks");
    expect(out).toContain("| Canonical URL field present | `Critical` | `Failed` |");
    expect(out).toContain("| Meta title field present    | `Major`    | `Passed` |");
    expect(out).toContain("##### 1. Canonical URL field present — `Critical`");
    expect(out).toContain("**Evidence** — 0 of 2 page types declare a canonical field");
    expect(out).toContain("**Affects** — `aboutUs` `homePage`");
    expect(out).toContain("**Impact** — Canonical impact.");
    expect(out).toContain("**Fix** — Canonical fix.");
  });

  it("does not render cards for passed checks", () => {
    const out = renderReport(baseData());
    expect(out).not.toContain("##### 2. Meta title field present");
  });

  it("renders non-scored dimensions without a Checks section and ends every dimension with ---", () => {
    const out = renderReport(baseData());
    expect(out).toContain("### 2. Internationalization");
    expect(out).toContain("Single-locale space — internationalization does not apply.");
    expect(out.trimEnd().endsWith("---")).toBe(true);
  });

  it("omits Impact and keeps Fix when narration is missing", () => {
    const data = baseData();
    data.dimensions[0]!.checks![0]!.impact = null;
    data.dimensions[0]!.checks![0]!.fix = "Fallback fix hint.";
    const out = renderReport(data);
    expect(out).not.toContain("**Impact**");
    expect(out).toContain("**Fix** — Fallback fix hint.");
  });
});
