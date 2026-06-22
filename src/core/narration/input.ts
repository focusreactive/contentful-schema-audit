import type { DimensionResult, OverallGrade } from "../result.js";
import type { NarrationInput } from "./narrator.js";

export function toNarrationInput(overall: OverallGrade, dimensions: DimensionResult[]): NarrationInput {
  return {
    overall,
    dimensions: dimensions.map((d) => ({
      id: d.id,
      title: d.title,
      state: d.state,
      score: d.score,
      band: d.band,
      note: d.reason,
      failedChecks: d.checks
        .filter((c) => c.status === "fail")
        .map((c) => ({
          id: c.id,
          title: c.title,
          severity: c.severity,
          evidenceSummary: c.evidence.summary,
          affectedTypes: c.evidence.affectedTypes,
          fixHint: c.fixHint,
        })),
    })),
  };
}
