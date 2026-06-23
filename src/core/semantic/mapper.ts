import type { SemanticOutput } from "./schema.js";
import type { RoleMap, SemanticAnalysis } from "./types.js";
import { fieldKey } from "./roles.js";

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
    judgments: raw.judgments,
    model: modelName,
  };
}
