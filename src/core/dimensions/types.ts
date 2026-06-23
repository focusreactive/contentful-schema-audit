import type { NormalizedModel } from "../model/index.js";
import type { CheckResult } from "../checks/index.js";
import type { DimensionId, Signal } from "../signals/index.js";
import type { SemanticAnalysis } from "../semantic/types.js";

export type Tier = "high" | "medium" | "situational";

export interface EvaluateContext {
  model: NormalizedModel;
  semantic?: SemanticAnalysis;
}

export interface DimensionDefinition {
  id: DimensionId;
  title: string;
  tier: Tier;
  requiredSignals: Signal[];
  isApplicable?: (ctx: EvaluateContext) => boolean;
  applicabilityReason?: string;
  evaluate: (ctx: EvaluateContext) => CheckResult[];
}
