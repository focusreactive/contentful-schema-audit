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
  if (checks.length === 0) return { score: 100, band: "good" };

  const total = checks.reduce((sum, c) => sum + SEVERITY_WEIGHT[c.severity], 0);
  const passed = checks.filter((c) => c.status === "pass").reduce((sum, c) => sum + SEVERITY_WEIGHT[c.severity], 0);
  const score = Math.round((passed / total) * 100);

  return {
    score,
    band: toBand(score),
  };
}
