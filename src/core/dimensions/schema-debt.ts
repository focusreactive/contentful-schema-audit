import type { DimensionDefinition } from "./types.js";
import type { NormalizedModel } from "../model/index.js";
import { allFields } from "./helpers.js";

const HIDDEN_MAX_RATIO = 0.1;
const NAMING_MIN_CONSISTENCY = 0.9;
const CAMEL_CASE_RE = /^[a-z][a-zA-Z0-9]*$/;

export const schemaDebtDimension: DimensionDefinition = {
  id: "schemaDebt",
  title: "Schema Debt",
  tier: "situational",
  requiredSignals: ["field.editorState", "contentType.description"],
  evaluate: (model: NormalizedModel) => {
    const fields = allFields(model);
    const hidden = fields.filter((f) => f.editorState?.hidden);
    const hiddenRatio = fields.length === 0 ? 0 : hidden.length / fields.length;
    const camel = fields.filter((f) => CAMEL_CASE_RE.test(f.id)).length;
    const namingConsistency = fields.length === 0 ? 1 : camel / fields.length;
    const typesWithoutDescription = model.contentTypes.filter((t) => !t.description || t.description.trim() === "");

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
        id: "schemaDebt.naming",
        title: "Consistent field naming",
        severity: "minor",
        status: namingConsistency >= NAMING_MIN_CONSISTENCY ? "pass" : "fail",
        evidence: { summary: `${Math.round(namingConsistency * 100)}% of field ids follow a single casing convention` },
        fixHint: "Adopt one casing convention (camelCase) across all field ids.",
      },
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
