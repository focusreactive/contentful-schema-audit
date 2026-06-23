import type { DimensionDefinition, EvaluateContext } from "./types.js";
import type { CheckResult } from "../checks/index.js";
import type { NormalizedModel } from "../model/index.js";
import type { SemanticAnalysis } from "../semantic/types.js";
import { allFields, notAssessableCheck } from "./helpers.js";
import { fieldHasRole } from "../semantic/roles.js";

const COVERAGE_MIN_RATIO = 0.5;

function identifierUniqueCheck(model: NormalizedModel, semantic: SemanticAnalysis): CheckResult {
  const slugFields = model.contentTypes.flatMap((t) =>
    t.fields.filter((f) => fieldHasRole(semantic, t.id, f.id, "slug")).map((f) => ({ typeId: t.id, field: f })),
  );
  const withoutUnique = slugFields.filter(({ field }) => !field.validations.some((v) => v.kind === "unique"));
  return {
    id: "validation.identifierUnique",
    title: "Identifier fields are unique",
    severity: "major",
    status: withoutUnique.length === 0 ? "pass" : "fail",
    evidence: {
      summary: `${withoutUnique.length} of ${slugFields.length} slug/identifier fields lack a unique constraint`,
      detail: { fields: withoutUnique.map((s) => `${s.typeId}.${s.field.id}`) },
    },
    fixHint: "Add a unique validation to slug and identifier fields.",
  };
}

export const validationDimension: DimensionDefinition = {
  id: "validation",
  title: "Validation Discipline",
  tier: "medium",
  requiredSignals: ["field.validations", "field.required"],
  evaluate: ({ model, semantic }: EvaluateContext): CheckResult[] => {
    const fields = allFields(model);
    const validated = fields.filter((f) => f.validations.length > 0);
    const coverage = fields.length === 0 ? 1 : validated.length / fields.length;
    const typesWithoutRequired = model.contentTypes.filter(
      (t) => t.fields.length > 0 && !t.fields.some((f) => f.required),
    );

    const identifierUnique =
      semantic ?
        identifierUniqueCheck(model, semantic)
      : notAssessableCheck({
          id: "validation.identifierUnique",
          title: "Identifier fields are unique",
          severity: "major",
          reason: "Identifying slug/identifier fields needs AI semantic analysis.",
          fixHint: "Add a unique validation to slug and identifier fields.",
        });

    return [
      {
        id: "validation.coverage",
        title: "Fields carry validations",
        severity: "major",
        status: coverage >= COVERAGE_MIN_RATIO ? "pass" : "fail",
        evidence: { summary: `${validated.length} of ${fields.length} fields carry at least one validation` },
        fixHint: "Add validations (size, regexp, range, allowed values) to constrain editor input.",
      },
      identifierUnique,
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
