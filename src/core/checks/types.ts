export type Severity = "critical" | "major" | "minor";

export type CheckStatus = "pass" | "fail";
export type Band = "good" | "warn" | "poor";

export interface CheckEvidence {
  summary: string;
  affectedTypes?: string[];
  detail?: Record<string, unknown>;
}

export interface CheckResult {
  id: string;
  title: string;
  severity: Severity;
  status: CheckStatus;
  evidence: CheckEvidence;
  fixHint: string;
}
