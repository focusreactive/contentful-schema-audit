import type { NormalizedModel } from "../model/index.js";

export const TYPE_ROLES = ["page", "settings", "nav", "redirect"] as const;
export type TypeRole = (typeof TYPE_ROLES)[number];

export const FIELD_ROLES = [
  "slug",
  "metaTitle",
  "metaDescription",
  "canonical",
  "ogImage",
  "noindex",
  "richBody",
  "altText",
  "internalLinkAsString",
] as const;
export type FieldRole = (typeof FIELD_ROLES)[number];

export const JUDGMENT_KINDS = ["orphanIsDebt", "godTypeIsProblem", "namingIsCryptic", "redirectsAreMissing"] as const;
export type JudgmentKind = (typeof JUDGMENT_KINDS)[number];

export const VERDICTS = ["confirmed", "refuted", "uncertain"] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface RoleAssignment<TRole extends string> {
  role: TRole;
  confidence: number;
}

export interface RoleMap {
  types: Record<string, RoleAssignment<TypeRole>[]>;
  fields: Record<string, RoleAssignment<FieldRole>[]>;
}

export interface Judgment {
  kind: JudgmentKind;
  checkId: string;
  subject: string;
  verdict: Verdict;
  confidence: number;
  rationale: string;
}

export interface SemanticAnalysis {
  roleMap: RoleMap;
  judgments: Judgment[];
  model: string;
}

export interface SemanticAnalyzer {
  analyze(model: NormalizedModel): Promise<SemanticAnalysis | undefined>;
}
