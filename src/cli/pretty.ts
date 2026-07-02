import type { ValidationResult } from "../core/result.js";
import type { DimensionResult } from "../core/result.js";

const STATE_MARK = { scored: "•", not_assessable: "–", not_applicable: "–" } as const;

function renderDimension(dimension: DimensionResult): string {
  if (dimension.state === "not_applicable")
    return `  – ${dimension.title}   not applicable (${dimension.reason ?? ""})`;
  if (dimension.state === "not_assessable")
    return `  – ${dimension.title}   not assessable (${dimension.reason ?? ""})`;

  const header = `  ${STATE_MARK.scored} ${dimension.title}   ${dimension.score} ${dimension.band}`;
  const failed = dimension.checks
    .filter((c) => c.status === "fail")
    .map((c) => `       ✗ [${c.severity}] ${c.title}\n            ${c.evidence.summary}\n            → ${c.fixHint}`);
  return [header, ...failed].join("\n");
}

export function renderPretty(result: ValidationResult, opts: { aiHint?: boolean } = {}): string {
  const { source, overall } = result;
  const total = overall.scoredCount + overall.notAssessableCount + overall.notApplicableCount;
  const gradeStr = overall.score === null ? "N/A" : `${overall.score} / 100`;
  const lines = [
    `CMS Schema Health — ${source.cms} · space ${source.spaceId} · env ${source.environment}   (token: ${source.acquisition})`,
    "",
    `  Overall  ${gradeStr}  ${overall.band}   (${overall.scoredCount} of ${total} dimensions scored)`,
    "",
    ...result.dimensions.map(renderDimension),
    "",
    `  Summary: ${overall.scoredCount} scored · ${overall.notAssessableCount} not assessable · ${overall.notApplicableCount} not applicable`,
  ];
  if (opts.aiHint) lines.push("", "  AI semantic analysis & narration: run /validate-cms inside Claude Code.");
  return lines.join("\n");
}
