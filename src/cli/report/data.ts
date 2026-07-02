import type { DimensionResult, ValidationResult } from "../../core/result.js";
import type { CheckResult } from "../../core/checks/index.js";
import { SEVERITY_WEIGHT } from "../../core/checks/index.js";

export interface ReportData {
  siteLabel: string;
  meta: {
    cmsLabel: string;
    spaceId: string;
    environment: string;
    typeCount: number | null;
    fieldCount: number | null;
    generatedDate: string;
  };
  overall: {
    score: number | null;
    bandLabel: string;
    verdict: string | null;
    scoredCount: number;
    notAssessableCount: number;
    notApplicableCount: number;
  };
  scoreboard: ScoreboardRow[];
  checkTotals: {
    passed: number;
    failed: number;
    notAssessable: number;
  };
  priorities: PriorityRow[];
  dimensions: ReportDimension[];
}

export interface ScoreboardRow {
  title: string;
  score: number | null;
  bandLabel: string;
  tierLabel: string;
  passed: number | null;
  total: number | null;
}

export interface PriorityRow {
  rank: number;
  checkTitle: string;
  severityLabel: string;
  dimensionTitle: string;
}

export interface ReportDimension {
  index: number;
  title: string;
  score: number | null;
  bandLabel: string;
  tierLabel: string;
  passed: number | null;
  total: number | null;
  narration: string | null;
  checks: ReportCheck[] | null;
}

export interface ReportCheck {
  title: string;
  severityLabel: string;
  statusLabel: string;
  failed: boolean;
  evidence: string;
  affectedTypes: string[];
  impact: string | null;
  fix: string | null;
}

const BAND_LABEL = {
  good: "Good",
  warn: "Warn",
  poor: "Poor",
} as const;

const STATUS_LABEL = {
  pass: "Passed",
  fail: "Failed",
  not_assessable: "Not assessable",
} as const;

const SEVERITY_LABEL = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
} as const;

const TIER_LABEL = {
  high: "HIGH",
  medium: "MEDIUM",
  situational: "SITUATIONAL",
} as const;

const CMS_LABEL = {
  contentful: "Contentful",
  sanity: "Sanity",
} as const;

const STATUS_ORDER = {
  fail: 0,
  pass: 1,
  not_assessable: 2,
} as const;

function dimensionBandLabel(d: DimensionResult): string {
  if (d.state === "not_applicable") return "Not applicable";
  if (d.state === "not_assessable") return "Not assessable";

  return d.band ? BAND_LABEL[d.band] : "Not assessed";
}

function orderChecks(checks: CheckResult[]): CheckResult[] {
  return checks
    .map((check, index) => ({ check, index }))
    .sort((a, b) => {
      const byStatus = STATUS_ORDER[a.check.status] - STATUS_ORDER[b.check.status];
      if (byStatus !== 0) return byStatus;

      if (a.check.status === "fail") {
        const bySeverity = SEVERITY_WEIGHT[b.check.severity] - SEVERITY_WEIGHT[a.check.severity];
        if (bySeverity !== 0) return bySeverity;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.check);
}

function buildCheck(check: CheckResult, result: ValidationResult): ReportCheck {
  const failed = check.status === "fail";
  const finding = failed ? result.narration?.findings[check.id] : undefined;

  return {
    title: check.title,
    severityLabel: SEVERITY_LABEL[check.severity],
    statusLabel: STATUS_LABEL[check.status],
    failed,
    evidence: check.evidence.summary,
    affectedTypes: check.evidence.affectedTypes ?? [],
    impact: finding?.impact ?? null,
    fix: failed ? (finding?.fix ?? check.fixHint) : null,
  };
}

function buildPriorities(result: ValidationResult): PriorityRow[] {
  const candidates: Array<{
    product: number;
    dimensionIndex: number;
    checkIndex: number;
    checkTitle: string;
    severityLabel: string;
    dimensionTitle: string;
  }> = [];

  result.dimensions.forEach((dimension, dimensionIndex) => {
    dimension.checks.forEach((check, checkIndex) => {
      if (check.status !== "fail") return;
      candidates.push({
        product: SEVERITY_WEIGHT[check.severity] * dimension.weight,
        dimensionIndex,
        checkIndex,
        checkTitle: check.title,
        severityLabel: SEVERITY_LABEL[check.severity],
        dimensionTitle: dimension.title,
      });
    });
  });

  candidates.sort(
    (a, b) => b.product - a.product || a.dimensionIndex - b.dimensionIndex || a.checkIndex - b.checkIndex,
  );

  return candidates.slice(0, 5).map((candidate, index) => ({
    rank: index + 1,
    checkTitle: candidate.checkTitle,
    severityLabel: candidate.severityLabel,
    dimensionTitle: candidate.dimensionTitle,
  }));
}

function buildDimension(dimension: DimensionResult, index: number, result: ValidationResult): ReportDimension {
  const scored = dimension.state === "scored";
  const narrated = result.narration?.dimensions[dimension.id];

  return {
    index: index + 1,
    title: dimension.title,
    score: scored ? (dimension.score ?? 0) : null,
    bandLabel: dimensionBandLabel(dimension),
    tierLabel: TIER_LABEL[dimension.tier],
    passed: scored ? dimension.checks.filter((c) => c.status === "pass").length : null,
    total: scored ? dimension.checks.length : null,
    narration: scored ? (narrated ?? null) : (narrated ?? dimension.reason ?? null),
    checks: scored ? orderChecks(dimension.checks).map((c) => buildCheck(c, result)) : null,
  };
}

export function buildReportData(result: ValidationResult): ReportData {
  const { source, overall, model } = result;
  const allChecks = result.dimensions.flatMap((d) => d.checks);

  return {
    siteLabel: source.url ? new URL(source.url).hostname : source.spaceId,
    meta: {
      cmsLabel: CMS_LABEL[source.cms],
      spaceId: source.spaceId,
      environment: source.environment,
      typeCount: model ? model.contentTypes.length : null,
      fieldCount: model ? model.contentTypes.reduce((sum, t) => sum + t.fields.length, 0) : null,
      generatedDate: result.generatedAt.slice(0, 10),
    },
    overall: {
      score: overall.score,
      bandLabel: overall.band === "not_assessed" ? "Not assessed" : BAND_LABEL[overall.band],
      verdict: result.narration?.overall ?? null,
      scoredCount: overall.scoredCount,
      notAssessableCount: overall.notAssessableCount,
      notApplicableCount: overall.notApplicableCount,
    },
    scoreboard: result.dimensions.map((d) => {
      const scored = d.state === "scored";

      return {
        title: d.title,
        score: scored ? (d.score ?? 0) : null,
        bandLabel: dimensionBandLabel(d),
        tierLabel: TIER_LABEL[d.tier],
        passed: scored ? d.checks.filter((c) => c.status === "pass").length : null,
        total: scored ? d.checks.length : null,
      };
    }),
    checkTotals: {
      passed: allChecks.filter((c) => c.status === "pass").length,
      failed: allChecks.filter((c) => c.status === "fail").length,
      notAssessable: allChecks.filter((c) => c.status === "not_assessable").length,
    },
    priorities: buildPriorities(result),
    dimensions: result.dimensions.map((d, i) => buildDimension(d, i, result)),
  };
}
