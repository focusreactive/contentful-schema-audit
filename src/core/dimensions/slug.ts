import type { DimensionDefinition } from "./types.js";
import type { NormalizedContentType } from "../model/index.js";
import type { SemanticAnalysis } from "../semantic/types.js";
import { pageTypes, ratioCheck } from "./helpers.js";
import { fieldHasRole } from "../semantic/roles.js";

const PRESENT_THRESHOLD = 1.0;
const UNIQUE_THRESHOLD = 0.8;
const PATTERN_THRESHOLD = 0.5;

function slugFieldsOf(type: NormalizedContentType, semantic: SemanticAnalysis) {
  return type.fields.filter((f) => fieldHasRole(semantic, type.id, f.id, "slug"));
}

export const slugDimension: DimensionDefinition = {
  id: "slug",
  title: "Slug & Routing Hygiene",
  tier: "medium",
  requiredSignals: ["contentType.fields", "field.type", "field.validations", "semantic.analysis"],
  isApplicable: (ctx) => pageTypes(ctx).length > 0,
  applicabilityReason: "No page-like content types that need routable slugs.",
  evaluate: (ctx) => {
    const { semantic } = ctx;
    if (!semantic) return [];
    const pages = pageTypes(ctx);

    return [
      ratioCheck({
        id: "slug.present",
        title: "Page types have a slug field",
        severity: "critical",
        units: pages,
        satisfies: (t) => slugFieldsOf(t, semantic).length > 0,
        threshold: PRESENT_THRESHOLD,
        fixHint: "Add a slug field to every routable content type.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types declare a slug field`,
      }),
      ratioCheck({
        id: "slug.unique",
        title: "Slug fields are unique",
        severity: "major",
        units: pages,
        satisfies: (t) => slugFieldsOf(t, semantic).some((f) => f.validations.some((v) => v.kind === "unique")),
        threshold: UNIQUE_THRESHOLD,
        fixHint: "Add a unique validation to slug fields to prevent colliding URLs.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types have a unique slug`,
      }),
      ratioCheck({
        id: "slug.pattern",
        title: "Slug fields are pattern-validated",
        severity: "minor",
        units: pages,
        satisfies: (t) => slugFieldsOf(t, semantic).some((f) => f.validations.some((v) => v.kind === "regexp")),
        threshold: PATTERN_THRESHOLD,
        fixHint: "Add a regexp validation so slugs stay URL-safe.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types pattern-validate their slug`,
      }),
    ];
  },
};
