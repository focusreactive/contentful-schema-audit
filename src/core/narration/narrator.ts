import type { Band, Severity } from "../checks/index.js";
import type { DimensionId } from "../signals/index.js";
import type { DimensionState, OverallGrade } from "../result.js";

export interface FindingNarration {
  impact: string;
  fix: string;
}

export interface Narration {
  overall: string;
  dimensions: Partial<Record<DimensionId, string>>;
  findings: Record<string, FindingNarration>;
}

export interface NarrationFinding {
  id: string;
  title: string;
  severity: Severity;
  evidenceSummary: string;
  affectedTypes?: string[];
  fixHint: string;
}

export interface NarrationDimension {
  id: DimensionId;
  title: string;
  state: DimensionState;
  score?: number;
  band?: Band;
  failedChecks: NarrationFinding[];
  note?: string;
}

export interface NarrationInput {
  overall: OverallGrade;
  dimensions: NarrationDimension[];
}
