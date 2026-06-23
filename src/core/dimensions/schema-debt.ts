import type { DimensionDefinition, EvaluateContext } from "./types.js";
import type { CheckResult } from "../checks/index.js";
import { allFields, notAssessableCheck } from "./helpers.js";
import { judgmentFor, resolveJudgment } from "../semantic/roles.js";

const HIDDEN_MAX_RATIO = 0.1;
const NAMING_MIN_CONSISTENCY = 0.9;
const CAMEL_CASE_RE = /^[a-z][a-zA-Z0-9]*$/;
const NAMING_SUBJECT = "_dimension";

export const schemaDebtDimension: DimensionDefinition = {
  id: "schemaDebt",
  title: "Schema Debt",
  tier: "situational",
  requiredSignals: ["field.editorState", "contentType.description"],
  evaluate: ({ model, semantic }: EvaluateContext): CheckResult[] => {
    const fields = allFields(model);
    const hidden = fields.filter((f) => f.editorState?.hidden);
    const hiddenRatio = fields.length === 0 ? 0 : hidden.length / fields.length;
    const camel = fields.filter((f) => CAMEL_CASE_RE.test(f.id)).length;
    const namingConsistency = fields.length === 0 ? 1 : camel / fields.length;
    const typesWithoutDescription = model.contentTypes.filter((t) => !t.description || t.description.trim() === "");

    const namingMeaningful: CheckResult =
      semantic ?
        (() => {
          const verdict = resolveJudgment(judgmentFor(semantic, "schemaDebt.namingMeaningful", NAMING_SUBJECT));
          const base = {
            id: "schemaDebt.namingMeaningful",
            title: "Field names are meaningful",
            severity: "minor" as const,
            fixHint: "Rename cryptic fields to describe their content.",
          };
          if (verdict === "confirmed")
            return {
              ...base,
              status: "fail",
              evidence: { summary: "Field/type names are cryptic or non-descriptive" },
            };
          if (verdict === "refuted")
            return { ...base, status: "pass", evidence: { summary: "Field/type names are meaningful" } };
          return notAssessableCheck({ ...base, reason: "Could not judge whether names are meaningful" });
        })()
      : notAssessableCheck({
          id: "schemaDebt.namingMeaningful",
          title: "Field names are meaningful",
          severity: "minor",
          reason: "Judging name meaningfulness needs AI semantic analysis.",
          fixHint: "Rename cryptic fields to describe their content.",
        });

    return [
      {
        id: "schemaDebt.hiddenFields",
        title: "Few hidden/read-only fields",
        severity: "major",
        status: hiddenRatio < HIDDEN_MAX_RATIO ? "pass" : "fail",
        evidence: { summary: `${hidden.length} of ${fields.length} fields are hidden from editors` },
        fixHint:
          "Remove hidden fields once migrations are complete rather than leaving dead schema visible only via the API.",
      },
      {
        id: "schemaDebt.namingConsistency",
        title: "Consistent field naming",
        severity: "minor",
        status: namingConsistency >= NAMING_MIN_CONSISTENCY ? "pass" : "fail",
        evidence: { summary: `${Math.round(namingConsistency * 100)}% of field ids follow a single casing convention` },
        fixHint: "Adopt one casing convention (camelCase) across all field ids.",
      },
      namingMeaningful,
      {
        id: "schemaDebt.noDescription",
        title: "Content types have descriptions",
        severity: "minor",
        status: typesWithoutDescription.length === 0 ? "pass" : "fail",
        evidence: {
          summary: `${typesWithoutDescription.length} of ${model.contentTypes.length} content types lack a description`,
          affectedTypes: typesWithoutDescription.map((t) => t.id),
        },
        fixHint: "Add a description to each content type so editors know when and how to use it.",
      },
    ];
  },
};
