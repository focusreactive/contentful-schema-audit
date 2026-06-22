import type { NormalizedModel } from "./model/index.js";
import type { CapabilityManifest } from "./signals/index.js";
import type { DimensionResult, OverallGrade } from "./result.js";
import { isAssessable } from "./signals/index.js";
import { rollup, toBand } from "./checks/index.js";
import { DIMENSIONS } from "./dimensions/index.js";
import { TIER_WEIGHT } from "./dimensions/constants.js";

const DEFAULT_UNASSESSABLE_REASON = "Required schema signals are not available from this CMS.";

interface ScoreNModelResult {
  overall: OverallGrade;
  dimensions: DimensionResult[];
}

export function scoreModel(model: NormalizedModel, capabilities: CapabilityManifest): ScoreNModelResult {
  const dimensions: DimensionResult[] = DIMENSIONS.map((def): DimensionResult => {
    const weight = TIER_WEIGHT[def.tier];
    const base = {
      id: def.id,
      title: def.title,
      tier: def.tier,
      weight,
      checks: [],
    };

    if (!isAssessable(def.requiredSignals, capabilities.providedSignals)) {
      return {
        ...base,
        state: "not_assessable",
        reason: capabilities.notes?.[def.id] ?? DEFAULT_UNASSESSABLE_REASON,
      };
    }

    if (def.isApplicable && !def.isApplicable(model)) {
      return {
        ...base,
        state: "not_applicable",
        reason: def.applicabilityReason,
      };
    }
    const checks = def.evaluate(model);
    if (checks.length === 0) {
      return {
        ...base,
        state: "not_applicable",
        reason: def.applicabilityReason ?? "No checks applicable to this model.",
      };
    }

    const { score, band } = rollup(checks);

    return {
      ...base,
      state: "scored",
      score,
      band,
      checks,
    };
  });

  const scored = dimensions.filter((d) => d.state === "scored");
  const totalWeight = scored.reduce((sum, d) => sum + d.weight, 0);

  if (totalWeight === 0) {
    const overall: OverallGrade = {
      score: null,
      band: "not_assessed",
      scoredCount: 0,
      notAssessableCount: dimensions.filter((d) => d.state === "not_assessable").length,
      notApplicableCount: dimensions.filter((d) => d.state === "not_applicable").length,
    };

    return { overall, dimensions };
  }

  const weightedScore = scored.reduce((sum, d) => sum + (d.score ?? 0) * d.weight, 0);
  const score = Math.round(weightedScore / totalWeight);

  const overall: OverallGrade = {
    score,
    band: toBand(score),
    scoredCount: scored.length,
    notAssessableCount: dimensions.filter((d) => d.state === "not_assessable").length,
    notApplicableCount: dimensions.filter((d) => d.state === "not_applicable").length,
  };

  return { overall, dimensions };
}
