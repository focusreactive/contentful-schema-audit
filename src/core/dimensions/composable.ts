import type { DimensionDefinition } from "./types.js";
import type { NormalizedModel } from "../model/index.js";
import { allFields, fieldAllowedLinkTypes } from "./helpers.js";

export const composableDimension: DimensionDefinition = {
  id: "composable",
  title: "Composable Content",
  tier: "situational",
  requiredSignals: ["field.type", "field.linkTarget", "field.allowedLinkTypes"],
  evaluate: (model: NormalizedModel) => {
    const hasModularArray = allFields(model).some(
      (f) => f.type === "array" && f.items?.linkTarget === "entry" && (fieldAllowedLinkTypes(f)?.length ?? 0) > 1,
    );

    return [
      {
        id: "composable.modularArrays",
        title: "Modular content arrays exist",
        severity: "minor",
        status: hasModularArray ? "pass" : "fail",
        evidence: {
          summary:
            hasModularArray ?
              "Multi-type entry arrays support page-builder composition"
            : "No multi-type entry arrays found",
        },
        fixHint:
          "Model flexible layouts as arrays of multiple block types (a page-builder pattern). Note: editor UX (widgets, sidebar) is not assessable from public data.",
      },
    ];
  },
};
