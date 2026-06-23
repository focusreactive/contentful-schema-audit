import type { DimensionResult, ValidationResult } from "../core/result.js";
import type { DimensionId } from "../core/signals/index.js";

const DIMENSION_RATIONALE: Record<DimensionId, string> = {
  seo: "Search engines and link previews rely on canonical URLs, meta fields, and robots controls; missing them caps organic reach and how pages look when shared.",
  modeling:
    "Well-structured content types — rich text, right-sized models, reusable blocks — keep the schema maintainable and pleasant for editors.",
  referentialIntegrity:
    "Typed references instead of stringly links prevent broken relationships and let the CMS enforce which content can link to what.",
  validation:
    "Field-level validations (required, unique, patterns, ranges) stop bad data at entry time rather than surfacing as bugs downstream.",
  slug: "Clean, unique, pattern-validated slugs are what routing and URLs depend on; without them pages collide or break.",
  assets: "Modeling media with alt text and size/type constraints protects accessibility, SEO, and performance.",
  i18n: "When a space serves multiple locales, fallback chains and real localization keep translated content consistent and complete.",
  composable:
    "Modular, array-based content lets editors compose pages from reusable blocks instead of rigid one-off templates.",
  globalConfig:
    "Centralizing settings, navigation, and redirects as content keeps site-wide configuration editable without code changes.",
  schemaDebt:
    "Hidden or dead fields, inconsistent naming, and undocumented types accumulate as debt that slows every future change.",
};

function verdict(result: ValidationResult): string {
  if (result.narration?.overall) return result.narration.overall;
  const { overall } = result;
  const total = overall.scoredCount + overall.notAssessableCount + overall.notApplicableCount;
  return `${overall.scoredCount} of ${total} dimensions scored; band ${overall.band}.`;
}

function scoreLine(d: DimensionResult): string {
  if (d.state === "not_applicable") return d.reason ? `not applicable — ${d.reason}` : "not applicable";
  if (d.state === "not_assessable") return d.reason ? `not assessable — ${d.reason}` : "not assessable";
  return `${d.score} / 100 (${d.band})`;
}

function checksLine(d: DimensionResult): string {
  if (d.state !== "scored") return "—";
  const assessable = d.checks.filter((c) => c.status !== "not_assessable");
  const passed = assessable.filter((c) => c.status === "pass").length;
  return `${passed} of ${assessable.length} passed`;
}

function skipVerdict(d: DimensionResult): string {
  if (d.state === "not_applicable") return "Yes — not applicable for this space.";
  if (d.state === "not_assessable") return "Review — couldn't assess (usually needs more access).";
  if (d.band === "good") return "Yes — healthy.";
  if (d.band === "warn") {
    if (d.tier === "high") return "Recommended — moderate gaps on a high-impact area.";
    if (d.tier === "medium") return "Optional — some gaps.";
    return "Optional — minor, situational.";
  }
  if (d.tier === "high") return "No — prioritize; high-impact area.";
  if (d.tier === "medium") return "No — address soon.";
  return "Optional — weak but situational.";
}

function fixBlock(d: DimensionResult, result: ValidationResult): string {
  if (d.state !== "scored") return "No action needed.";
  const failed = d.checks.filter((c) => c.status === "fail");
  if (failed.length === 0) return "No action needed.";
  return failed.map((c) => `- ${c.title} — ${result.narration?.findings[c.id]?.fix ?? c.fixHint}`).join("\n");
}

function renderAssessment(d: DimensionResult, result: ValidationResult): string {
  return [
    `### ${d.title} — ${scoreLine(d)}`,
    `**Checks:** ${checksLine(d)}`,
    `**Why it matters:** ${DIMENSION_RATIONALE[d.id]}`,
    `**Can I skip it?** ${skipVerdict(d)}`,
    `**Potential fix:**`,
    "",
    fixBlock(d, result),
  ].join("\n");
}

export function renderReport(result: ValidationResult): string {
  const { source, overall } = result;
  const total = overall.scoredCount + overall.notAssessableCount + overall.notApplicableCount;
  const scoreStr = overall.score === null ? "N/A" : `${overall.score} / 100`;

  const lines = [
    "# CMS Schema Health Report",
    "",
    `**${source.cms}** · space \`${source.spaceId}\` · env \`${source.environment}\``,
    `Generated ${result.generatedAt}`,
    "",
    `## Overall: ${scoreStr} — ${overall.band}`,
    `*(${overall.scoredCount} of ${total} dimensions scored)*`,
    "",
    verdict(result),
    "",
    "## Dimension assessments",
    "",
    result.dimensions.map((d) => renderAssessment(d, result)).join("\n\n"),
  ];

  return lines.join("\n");
}
