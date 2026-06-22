import type { CmsId, NormalizedModel } from "./model/index.js";
import type { Band, CheckResult } from "./checks/index.js";
import type { DimensionId } from "./signals/index.js";
import type { Tier } from "./dimensions/types.js";
import type { Narration } from "./narration/narrator.js";

export type DimensionState = "scored" | "not_assessable" | "not_applicable";

export interface DimensionResult {
  id: DimensionId;
  title: string;
  tier: Tier;
  weight: number;
  state: DimensionState;
  score?: number;
  band?: Band;
  checks: CheckResult[];
  reason?: string;
}

export type OverallBand = Band | "not_assessed";

export interface OverallGrade {
  score: number | null;
  band: OverallBand;
  scoredCount: number;
  notAssessableCount: number;
  notApplicableCount: number;
}

export interface ValidationResult {
  source: {
    rl?: string;
    cms: CmsId;
    spaceId: string;
    environment: string;
    acquisition: "sniffed" | "provided";
  };
  overall: OverallGrade;
  dimensions: DimensionResult[];
  narration?: Narration;
  model?: NormalizedModel;
  generatedAt: string;
}
