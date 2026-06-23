import type { DimensionDefinition, EvaluateContext } from "./types.js";
import type { CheckResult } from "../checks/index.js";
import type { NormalizedField, NormalizedModel } from "../model/index.js";
import type { SemanticAnalysis } from "../semantic/types.js";
import { isAssetLinkField, notAssessableCheck } from "./helpers.js";
import { fieldHasRole } from "../semantic/roles.js";

const ASSET_VALIDATION_KINDS = ["assetFileSize", "assetImageDimensions", "linkMimetypeGroup"] as const;
const CONSTRAINTS_MIN_RATIO = 0.5;

function assetFields(model: NormalizedModel): NormalizedField[] {
  return model.contentTypes.flatMap((t) => t.fields).filter(isAssetLinkField);
}

function altTextCheck(model: NormalizedModel, semantic: SemanticAnalysis): CheckResult {
  const typesWithAssets = model.contentTypes.filter((t) => t.fields.some(isAssetLinkField));
  const missingAlt = typesWithAssets.filter(
    (t) => !t.fields.some((f) => fieldHasRole(semantic, t.id, f.id, "altText")),
  );
  return {
    id: "assets.altText",
    title: "Asset-owning types provide alt text",
    severity: "major",
    status: missingAlt.length === 0 ? "pass" : "fail",
    evidence: {
      summary: `${missingAlt.length} of ${typesWithAssets.length} asset-owning types lack an alt/caption field`,
      affectedTypes: missingAlt.map((t) => t.id),
    },
    fixHint: "Add an alt-text or caption field next to each media field for accessibility and SEO.",
  };
}

export const assetsDimension: DimensionDefinition = {
  id: "assets",
  title: "Asset Management",
  tier: "medium",
  requiredSignals: ["field.type", "field.linkTarget", "field.validations"],
  isApplicable: ({ model }) => assetFields(model).length > 0,
  applicabilityReason: "No asset/media fields in the model.",
  evaluate: ({ model, semantic }: EvaluateContext): CheckResult[] => {
    const assets = assetFields(model);
    const withConstraints = assets.filter((f) =>
      [...f.validations, ...(f.items?.validations ?? [])].some((v) =>
        (ASSET_VALIDATION_KINDS as readonly string[]).includes(v.kind),
      ),
    );
    const constraintRatio = assets.length === 0 ? 1 : withConstraints.length / assets.length;

    const altText =
      semantic ?
        altTextCheck(model, semantic)
      : notAssessableCheck({
          id: "assets.altText",
          title: "Asset-owning types provide alt text",
          severity: "major",
          reason: "Identifying alt/caption fields needs AI semantic analysis.",
          fixHint: "Add an alt-text or caption field next to each media field for accessibility and SEO.",
        });

    return [
      {
        id: "assets.modeledAsRef",
        title: "Assets modeled as references",
        severity: "major",
        status: assets.length > 0 ? "pass" : "fail",
        evidence: { summary: `${assets.length} asset reference fields found` },
        fixHint: "Reference media via Link/Asset fields rather than storing URLs as strings.",
      },
      altText,
      {
        id: "assets.constraints",
        title: "Asset fields constrain size/type",
        severity: "minor",
        status: constraintRatio >= CONSTRAINTS_MIN_RATIO ? "pass" : "fail",
        evidence: {
          summary: `${withConstraints.length} of ${assets.length} asset fields enforce size/dimension/mime constraints`,
        },
        fixHint: "Add assetFileSize, assetImageDimensions, or mime-group validations to media fields.",
      },
    ];
  },
};
