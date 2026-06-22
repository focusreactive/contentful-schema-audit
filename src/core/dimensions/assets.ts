import type { DimensionDefinition } from "./types.js";
import type { NormalizedField, NormalizedModel } from "../model/index.js";
import { isAssetLinkField } from "./helpers.js";

const ALT_FIELD_RE = /alt|caption|description/i;
const ASSET_VALIDATION_KINDS = ["assetFileSize", "assetImageDimensions", "linkMimetypeGroup"] as const;
const CONSTRAINTS_MIN_RATIO = 0.5;

function assetFields(model: NormalizedModel): NormalizedField[] {
  return model.contentTypes.flatMap((t) => t.fields).filter(isAssetLinkField);
}

export const assetsDimension: DimensionDefinition = {
  id: "assets",
  title: "Asset Management",
  tier: "medium",
  requiredSignals: ["field.type", "field.linkTarget", "field.validations"],
  isApplicable: (model) => assetFields(model).length > 0,
  applicabilityReason: "No asset/media fields in the model.",
  evaluate: (model: NormalizedModel) => {
    const assets = assetFields(model);
    const typesWithAssets = model.contentTypes.filter((t) => t.fields.some(isAssetLinkField));
    const typesMissingAlt = typesWithAssets.filter(
      (t) => !t.fields.some((f) => ALT_FIELD_RE.test(f.id) || ALT_FIELD_RE.test(f.name)),
    );
    const withConstraints = assets.filter((f) =>
      [...f.validations, ...(f.items?.validations ?? [])].some((v) =>
        (ASSET_VALIDATION_KINDS as readonly string[]).includes(v.kind),
      ),
    );
    const constraintRatio = assets.length === 0 ? 1 : withConstraints.length / assets.length;

    return [
      {
        id: "assets.modeledAsRef",
        title: "Assets modeled as references",
        severity: "major",
        status: assets.length > 0 ? "pass" : "fail",
        evidence: {
          summary: `${assets.length} asset reference fields found`,
        },
        fixHint: "Reference media via Link/Asset fields rather than storing URLs as strings.",
      },
      {
        id: "assets.altText",
        title: "Asset-owning types provide alt text",
        severity: "major",
        status: typesMissingAlt.length === 0 ? "pass" : "fail",
        evidence: {
          summary: `${typesMissingAlt.length} of ${typesWithAssets.length} asset-owning types lack an alt/caption field`,
          affectedTypes: typesMissingAlt.map((t) => t.id),
        },
        fixHint: "Add an alt-text or caption field next to each media field for accessibility and SEO.",
      },
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
