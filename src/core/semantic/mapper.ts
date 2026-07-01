import type { SemanticOutput } from "./schema.js";
import type { JudgmentKind, RoleMap, SemanticAnalysis } from "./types.js";
import { fieldKey } from "./roles.js";

const CHECK_ID_BY_KIND: Record<JudgmentKind, string> = {
  orphanIsDebt: "refs.noOrphans",
  godTypeIsProblem: "modeling.godTypes",
  namingIsCryptic: "schemaDebt.namingMeaningful",
  redirectsAreMissing: "globalConfig.redirects",
};

export function toSemanticAnalysis(raw: SemanticOutput, modelName: string): SemanticAnalysis {
  const roleMap: RoleMap = { types: {}, fields: {} };

  for (const { typeId, role, confidence } of raw.typeRoles) {
    (roleMap.types[typeId] ??= []).push({ role, confidence });
  }
  for (const { typeId, fieldId, role, confidence } of raw.fieldRoles) {
    (roleMap.fields[fieldKey(typeId, fieldId)] ??= []).push({ role, confidence });
  }

  return {
    roleMap,
    judgments: raw.judgments.map((j) => ({ ...j, checkId: CHECK_ID_BY_KIND[j.kind] })),
    model: modelName,
  };
}
