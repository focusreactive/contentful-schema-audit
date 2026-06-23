import type { FieldRole, Judgment, SemanticAnalysis, TypeRole } from "./types.js";
import { MIN_CONFIDENCE } from "./constants.js";

export function fieldKey(typeId: string, fieldId: string): string {
  return `${typeId}.${fieldId}`;
}

export function typeHasRole(
  semantic: SemanticAnalysis,
  typeId: string,
  role: TypeRole,
  minConfidence = MIN_CONFIDENCE,
): boolean {
  return (semantic.roleMap.types[typeId] ?? []).some((a) => a.role === role && a.confidence >= minConfidence);
}

export function fieldHasRole(
  semantic: SemanticAnalysis,
  typeId: string,
  fieldId: string,
  role: FieldRole,
  minConfidence = MIN_CONFIDENCE,
): boolean {
  return (semantic.roleMap.fields[fieldKey(typeId, fieldId)] ?? []).some(
    (a) => a.role === role && a.confidence >= minConfidence,
  );
}

export function judgmentFor(semantic: SemanticAnalysis, checkId: string, subject: string): Judgment | undefined {
  return semantic.judgments.find((j) => j.checkId === checkId && j.subject === subject);
}

export function resolveJudgment(
  judgment: Judgment | undefined,
  minConfidence = MIN_CONFIDENCE,
): "confirmed" | "refuted" | "unknown" {
  if (!judgment || judgment.verdict === "uncertain" || judgment.confidence < minConfidence) return "unknown";
  return judgment.verdict;
}
