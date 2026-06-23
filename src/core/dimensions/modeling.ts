import type { DimensionDefinition, EvaluateContext } from "./types.js";
import type { CheckResult } from "../checks/index.js";
import type { NormalizedModel } from "../model/index.js";
import type { SemanticAnalysis } from "../semantic/types.js";
import { allFields, notAssessableCheck } from "./helpers.js";
import { GOD_TYPE_MAX_FIELDS, oversizedTypeIds } from "./structural.js";
import { fieldHasRole, judgmentFor, resolveJudgment } from "../semantic/roles.js";

const RICHTEXT_MIN_RATIO = 0.7;
const REUSE_MIN_TYPES = 3;
const REUSE_MIN_REFERRERS = 2;
const JSON_FIELD_MAX_RATIO = 0.1;

function ratioOf(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

function richTextCheck(model: NormalizedModel, semantic: SemanticAnalysis): CheckResult {
  const candidates = model.contentTypes.flatMap((t) =>
    t.fields.filter((f) => fieldHasRole(semantic, t.id, f.id, "richBody")),
  );
  const actual = candidates.filter((f) => f.type === "richText");
  const pass = candidates.length === 0 || ratioOf(actual.length, candidates.length) >= RICHTEXT_MIN_RATIO;
  return {
    id: "modeling.richText",
    title: "Body fields use rich text",
    severity: "major",
    status: pass ? "pass" : "fail",
    evidence: { summary: `${actual.length} of ${candidates.length} body-like fields use rich text` },
    fixHint: "Use a RichText field for body/content rather than long plain text.",
  };
}

function godTypesCheck(model: NormalizedModel, semantic: SemanticAnalysis): CheckResult {
  const oversized = oversizedTypeIds(model);
  const judged = oversized.map((id) => ({
    id,
    verdict: resolveJudgment(judgmentFor(semantic, "modeling.godTypes", id)),
  }));
  const confirmed = judged.filter((j) => j.verdict === "confirmed").map((j) => j.id);
  const unknown = judged.filter((j) => j.verdict === "unknown");

  if (confirmed.length > 0) {
    return {
      id: "modeling.godTypes",
      title: "No oversized content types",
      severity: "minor",
      status: "fail",
      evidence: {
        summary: `${confirmed.length} content types are oversized and poorly structured`,
        affectedTypes: confirmed,
      },
      fixHint: `Split content types with more than ${GOD_TYPE_MAX_FIELDS} fields into composable parts.`,
    };
  }
  if (unknown.length > 0) {
    return notAssessableCheck({
      id: "modeling.godTypes",
      title: "No oversized content types",
      severity: "minor",
      reason: `${unknown.length} large types could not be judged as god types vs. justified`,
      fixHint: `Split content types with more than ${GOD_TYPE_MAX_FIELDS} fields into composable parts.`,
    });
  }
  return {
    id: "modeling.godTypes",
    title: "No oversized content types",
    severity: "minor",
    status: "pass",
    evidence: { summary: "No oversized content types, or large types are justified" },
    fixHint: `Split content types with more than ${GOD_TYPE_MAX_FIELDS} fields into composable parts.`,
  };
}

export const modelingDimension: DimensionDefinition = {
  id: "modeling",
  title: "Content Modeling Quality",
  tier: "high",
  requiredSignals: ["contentType.fields", "field.type"],
  evaluate: ({ model, semantic }: EvaluateContext): CheckResult[] => {
    const fields = allFields(model);
    const jsonFields = fields.filter((f) => f.type === "json");

    const referrerCount = new Map<string, number>();
    for (const edge of model.referenceGraph.edges) {
      for (const target of edge.toTypes) referrerCount.set(target, (referrerCount.get(target) ?? 0) + 1);
    }
    const reuseSatisfied =
      model.contentTypes.length < REUSE_MIN_TYPES || [...referrerCount.values()].some((n) => n >= REUSE_MIN_REFERRERS);

    const richText =
      semantic ?
        richTextCheck(model, semantic)
      : notAssessableCheck({
          id: "modeling.richText",
          title: "Body fields use rich text",
          severity: "major",
          reason: "Identifying body/content fields needs AI semantic analysis.",
          fixHint: "Use a RichText field for body/content rather than long plain text.",
        });

    const godTypes =
      semantic ?
        godTypesCheck(model, semantic)
      : notAssessableCheck({
          id: "modeling.godTypes",
          title: "No oversized content types",
          severity: "minor",
          reason: "Judging oversized types needs AI semantic analysis.",
          fixHint: `Split content types with more than ${GOD_TYPE_MAX_FIELDS} fields into composable parts.`,
        });

    return [
      richText,
      godTypes,
      {
        id: "modeling.reuse",
        title: "Reusable building blocks exist",
        severity: "minor",
        status: reuseSatisfied ? "pass" : "fail",
        evidence: {
          summary:
            reuseSatisfied ?
              "At least one type is reused across multiple types"
            : "No content type is referenced by 2+ other types",
        },
        fixHint: "Extract shared structures (e.g. a Link or Media block) reused by multiple types.",
      },
      {
        id: "modeling.jsonFields",
        title: "Few escape-hatch JSON fields",
        severity: "minor",
        status: ratioOf(jsonFields.length, fields.length) < JSON_FIELD_MAX_RATIO ? "pass" : "fail",
        evidence: {
          summary: `${jsonFields.length} of ${fields.length} fields are untyped JSON (bypass validation and localisation)`,
          detail: { fields: jsonFields.map((f) => f.id) },
        },
        fixHint:
          "Replace JSON fields with typed structured fields so validation, localisation, and linking can be applied.",
      },
    ];
  },
};
