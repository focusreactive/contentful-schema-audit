import type { DimensionDefinition, EvaluateContext } from "./types.js";
import type { CheckResult } from "../checks/index.js";
import type { NormalizedModel } from "../model/index.js";
import type { SemanticAnalysis, TypeRole } from "../semantic/types.js";
import { judgmentFor, resolveJudgment, typeHasRole } from "../semantic/roles.js";

const REDIRECT_SUBJECT = "_dimension";

function anyTypeHasRole(model: NormalizedModel, semantic: SemanticAnalysis, role: TypeRole): boolean {
  return model.contentTypes.some((t) => typeHasRole(semantic, t.id, role));
}

function redirectsCheck(model: NormalizedModel, semantic: SemanticAnalysis): CheckResult {
  const base = {
    id: "globalConfig.redirects",
    title: "Redirects are modeled as entries",
    severity: "minor" as const,
    fixHint: "Model redirects as entries so editors can manage them in the CMS.",
  };
  if (anyTypeHasRole(model, semantic, "redirect")) {
    return { ...base, status: "pass", evidence: { summary: "A redirect type is present" } };
  }
  const verdict = resolveJudgment(judgmentFor(semantic, "globalConfig.redirects", REDIRECT_SUBJECT));
  if (verdict === "confirmed")
    return {
      ...base,
      status: "fail",
      evidence: { summary: "No redirect type, and redirects are not handled elsewhere" },
    };
  if (verdict === "refuted")
    return {
      ...base,
      status: "pass",
      evidence: { summary: "No redirect type, but redirects are handled outside the CMS (e.g. at the edge)" },
    };
  return {
    ...base,
    status: "not_assessable",
    evidence: { summary: "Could not determine whether missing redirects are a real gap" },
  };
}

export const globalConfigDimension: DimensionDefinition = {
  id: "globalConfig",
  title: "Global Configuration",
  tier: "situational",
  requiredSignals: ["contentType.fields", "field.type", "semantic.analysis"],
  evaluate: ({ model, semantic }: EvaluateContext): CheckResult[] => {
    if (!semantic) return []; // unreachable: gated by the semantic.analysis signal
    return [
      {
        id: "globalConfig.settingsType",
        title: "Centralized settings type exists",
        severity: "minor",
        status: anyTypeHasRole(model, semantic, "settings") ? "pass" : "fail",
        evidence: {
          summary:
            anyTypeHasRole(model, semantic, "settings") ?
              "A site-settings/config type is present"
            : "No centralized settings/config type found",
        },
        fixHint: "Add a singleton settings type for global config instead of hardcoding values.",
      },
      {
        id: "globalConfig.navModeled",
        title: "Navigation is modeled as content",
        severity: "minor",
        status: anyTypeHasRole(model, semantic, "nav") ? "pass" : "fail",
        evidence: {
          summary:
            anyTypeHasRole(model, semantic, "nav") ? "Navigation/menu is modeled" : "No navigation/menu type found",
        },
        fixHint: "Model navigation as content so editors can manage menus without code changes.",
      },
      redirectsCheck(model, semantic),
    ];
  },
};
