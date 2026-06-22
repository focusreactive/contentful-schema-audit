import type { DimensionDefinition } from "./types.js";
import type { NormalizedContentType, NormalizedModel } from "../model/index.js";
import { isPageLikeType, isSlugField, ratioCheck } from "./helpers.js";

const PRESENT_THRESHOLD = 1.0;
const UNIQUE_THRESHOLD = 0.8;
const PATTERN_THRESHOLD = 0.5;

function pageTypes(model: NormalizedModel) {
  return model.contentTypes.filter(isPageLikeType);
}
function slugFieldsOf(type: NormalizedContentType) {
  return type.fields.filter(isSlugField);
}

export const slugDimension: DimensionDefinition = {
  id: "slug",
  title: "Slug & Routing Hygiene",
  tier: "medium",
  requiredSignals: ["contentType.fields", "field.type", "field.validations"],
  isApplicable: (model) => pageTypes(model).length > 0,
  applicabilityReason: "No page-like content types that need routable slugs.",
  evaluate: (model) => {
    const pages = pageTypes(model);

    return [
      ratioCheck({
        id: "slug.present",
        title: "Page types have a slug field",
        severity: "critical",
        units: pages,
        satisfies: (t) => slugFieldsOf(t).length > 0,
        threshold: PRESENT_THRESHOLD,
        fixHint: "Add a slug field to every routable content type.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types declare a slug field`,
      }),
      ratioCheck({
        id: "slug.unique",
        title: "Slug fields are unique",
        severity: "major",
        units: pages,
        satisfies: (t) => slugFieldsOf(t).some((f) => f.validations.some((v) => v.kind === "unique")),
        threshold: UNIQUE_THRESHOLD,
        fixHint: "Add a unique validation to slug fields to prevent colliding URLs.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types have a unique slug`,
      }),
      ratioCheck({
        id: "slug.pattern",
        title: "Slug fields are pattern-validated",
        severity: "minor",
        units: pages,
        satisfies: (t) => slugFieldsOf(t).some((f) => f.validations.some((v) => v.kind === "regexp")),
        threshold: PATTERN_THRESHOLD,
        fixHint: "Add a regexp validation so slugs stay URL-safe.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types pattern-validate their slug`,
      }),
    ];
  },
};
