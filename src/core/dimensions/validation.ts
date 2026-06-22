import type { DimensionDefinition } from "./types.js";
import type { CheckResult } from "../checks/index.js";
import type { NormalizedModel } from "../model/index.js";
import { allFields, isSlugField } from "./helpers.js";

const COVERAGE_MIN_RATIO = 0.5;

export const validationDimension: DimensionDefinition = {
  id: "validation",
  title: "Validation Discipline",
  tier: "medium",
  requiredSignals: ["field.validations", "field.required"],
  evaluate: (model: NormalizedModel): CheckResult[] => {
    const fields = allFields(model);
    const validated = fields.filter((f) => f.validations.length > 0);
    const coverage = fields.length === 0 ? 1 : validated.length / fields.length;
    const slugFields = fields.filter(isSlugField);
    const slugsWithoutUnique = slugFields.filter((f) => !f.validations.some((v) => v.kind === "unique"));
    const typesWithoutRequired = model.contentTypes.filter(
      (t) => t.fields.length > 0 && !t.fields.some((f) => f.required),
    );

    return [
      {
        id: "validation.coverage",
        title: "Fields carry validations",
        severity: "major",
        status: coverage >= COVERAGE_MIN_RATIO ? "pass" : "fail",
        evidence: { summary: `${validated.length} of ${fields.length} fields carry at least one validation` },
        fixHint: "Add validations (size, regexp, range, allowed values) to constrain editor input.",
      },
      {
        id: "validation.identifierUnique",
        title: "Identifier fields are unique",
        severity: "major",
        status: slugsWithoutUnique.length === 0 ? "pass" : "fail",
        evidence: {
          summary: `${slugsWithoutUnique.length} of ${slugFields.length} slug/identifier fields lack a unique constraint`,
          detail: { fields: slugsWithoutUnique.map((f) => f.id) },
        },
        fixHint: "Add a unique validation to slug and identifier fields.",
      },
      {
        id: "validation.requiredDiscipline",
        title: "Types declare required fields",
        severity: "minor",
        status: typesWithoutRequired.length === 0 ? "pass" : "fail",
        evidence: {
          summary: `${typesWithoutRequired.length} content types have no required field`,
          affectedTypes: typesWithoutRequired.map((t) => t.id),
        },
        fixHint: "Mark each type's essential fields as required.",
      },
    ];
  },
};
