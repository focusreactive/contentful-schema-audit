import type { NormalizedModel } from "../model/index.js";
import type { CheckResult } from "../checks/index.js";
import type { DimensionId, Signal } from "../signals/index.js";

export type Tier = "high" | "medium" | "situational";

export interface DimensionDefinition {
  id: DimensionId;
  title: string;
  tier: Tier;
  requiredSignals: Signal[];
  isApplicable?: (model: NormalizedModel) => boolean;
  applicabilityReason?: string;
  evaluate: (model: NormalizedModel) => CheckResult[];
}
