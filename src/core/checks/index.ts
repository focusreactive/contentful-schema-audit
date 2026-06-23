import type { Band, CheckResult } from "./types.js";
import { GOOD_THRESHOLD, SEVERITY_WEIGHT, WARN_THRESHOLD } from "./constants.js";

export * from "./types.js";
export * from "./constants.js";

export function toBand(score: number): Band {
  if (score >= GOOD_THRESHOLD) return "good";
  if (score >= WARN_THRESHOLD) return "warn";

  return "poor";
}

interface RollupResult {
  score: number;
  band: Band;
}

export function rollup(checks: CheckResult[]): RollupResult {
  const scorable = checks.filter((c) => c.status !== "not_assessable");
  if (scorable.length === 0) {
    return {
      score: 100,
      band: "good",
    };
  }

  const total = scorable.reduce((sum, c) => sum + SEVERITY_WEIGHT[c.severity], 0);
  const passed = scorable.filter((c) => c.status === "pass").reduce((sum, c) => sum + SEVERITY_WEIGHT[c.severity], 0);
  const score = Math.round((passed / total) * 100);

  return {
    score,
    band: toBand(score),
  };
}
