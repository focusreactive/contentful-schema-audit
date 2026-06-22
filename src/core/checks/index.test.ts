import { rollup, toBand } from "./index.js";
import type { CheckResult } from "./index.js";

function check(severity: CheckResult["severity"], status: CheckResult["status"]): CheckResult {
  return { id: "x", title: "x", severity, status, evidence: { summary: "" }, fixHint: "" };
}

describe("toBand", () => {
  it("maps 80+ to good, 60-79 to warn, below 60 to poor", () => {
    expect(toBand(80)).toBe("good");
    expect(toBand(79)).toBe("warn");
    expect(toBand(60)).toBe("warn");
    expect(toBand(59)).toBe("poor");
  });
});

describe("rollup", () => {
  it("scores 100 for an empty check list", () => {
    expect(rollup([])).toEqual({ score: 100, band: "good" });
  });

  it("computes the severity-weighted pass ratio", () => {
    const checks = [check("critical", "fail"), check("major", "pass"), check("minor", "pass")];
    // passed weight 2+1=3, total 3+2+1=6 -> 50
    expect(rollup(checks)).toEqual({ score: 50, band: "poor" });
  });
});
