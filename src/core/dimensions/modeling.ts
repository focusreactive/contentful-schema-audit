import type { DimensionDefinition } from "./types.js";
import type { EvaluateContext } from "./types.js";
import type { CheckResult } from "../checks/index.js";
import { allFields, isSeoField, RICHTEXT_CANDIDATE_RE } from "./helpers.js";

const RICHTEXT_MIN_RATIO = 0.7;
const GOD_TYPE_MAX_FIELDS = 30;
const REUSE_MIN_TYPES = 3;
const REUSE_MIN_REFERRERS = 2;
const JSON_FIELD_MAX_RATIO = 0.1;

function ratioOf(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

export const modelingDimension: DimensionDefinition = {
  id: "modeling",
  title: "Content Modeling Quality",
  tier: "high",
  requiredSignals: ["contentType.fields", "field.type"],
  evaluate: ({ model }: EvaluateContext): CheckResult[] => {
    const fields = allFields(model);
    const richCandidates = fields.filter(
      (f) => (RICHTEXT_CANDIDATE_RE.test(f.id) || RICHTEXT_CANDIDATE_RE.test(f.name)) && !isSeoField(f),
    );
    const richActual = richCandidates.filter((f) => f.type === "richText");
    const godTypes = model.contentTypes.filter((t) => t.fields.length > GOD_TYPE_MAX_FIELDS);
    const jsonFields = fields.filter((f) => f.type === "json");

    const referrerCount = new Map<string, number>();
    for (const edge of model.referenceGraph.edges) {
      for (const target of edge.toTypes) referrerCount.set(target, (referrerCount.get(target) ?? 0) + 1);
    }
    const reuseSatisfied =
      model.contentTypes.length < REUSE_MIN_TYPES || [...referrerCount.values()].some((n) => n >= REUSE_MIN_REFERRERS);

    return [
      {
        id: "modeling.richText",
        title: "Body fields use rich text",
        severity: "major",
        status:
          richCandidates.length === 0 || ratioOf(richActual.length, richCandidates.length) >= RICHTEXT_MIN_RATIO ?
            "pass"
          : "fail",
        evidence: { summary: `${richActual.length} of ${richCandidates.length} body-like fields use rich text` },
        fixHint: "Use a RichText field for body/content rather than long plain text.",
      },
      {
        id: "modeling.godTypes",
        title: "No oversized content types",
        severity: "minor",
        status: godTypes.length === 0 ? "pass" : "fail",
        evidence: {
          summary: `${godTypes.length} content types exceed ${GOD_TYPE_MAX_FIELDS} fields`,
          affectedTypes: godTypes.map((t) => t.id),
        },
        fixHint: `Split content types with more than ${GOD_TYPE_MAX_FIELDS} fields into composable parts.`,
      },
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
