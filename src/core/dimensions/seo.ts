import type { DimensionDefinition, EvaluateContext } from "./types.js";
import type { FieldRole } from "../semantic/types.js";
import { ratioCheck } from "./helpers.js";
import { fieldHasRole, typeHasRole } from "../semantic/roles.js";

const PRESENCE_THRESHOLD = 0.8;
const NOINDEX_THRESHOLD = 0.5;

function pageTypes(ctx: EvaluateContext) {
  const { model, semantic } = ctx;
  if (!semantic) return [];
  return model.contentTypes.filter((t) => typeHasRole(semantic, t.id, "page"));
}

export const seoDimension: DimensionDefinition = {
  id: "seo",
  title: "SEO Readiness",
  tier: "high",
  requiredSignals: ["contentType.fields", "field.type", "semantic.analysis"],
  isApplicable: (ctx) => pageTypes(ctx).length > 0,
  applicabilityReason: "No page-like content types to optimise for search.",
  evaluate: (ctx) => {
    const { semantic } = ctx;
    if (!semantic) return [];
    const pages = pageTypes(ctx);
    const has = (role: FieldRole) => (t: (typeof pages)[number]) =>
      t.fields.some((f) => fieldHasRole(semantic, t.id, f.id, role));

    return [
      ratioCheck({
        id: "seo.title",
        title: "Meta title field present",
        severity: "major",
        units: pages,
        satisfies: has("metaTitle"),
        threshold: PRESENCE_THRESHOLD,
        fixHint: "Add a metaTitle field to each page-like type.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types declare a meta-title field`,
      }),
      ratioCheck({
        id: "seo.description",
        title: "Meta description field present",
        severity: "major",
        units: pages,
        satisfies: has("metaDescription"),
        threshold: PRESENCE_THRESHOLD,
        fixHint: "Add a metaDescription field to each page-like type.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types declare a meta-description field`,
      }),
      ratioCheck({
        id: "seo.canonical",
        title: "Canonical URL field present",
        severity: "critical",
        units: pages,
        satisfies: has("canonical"),
        threshold: PRESENCE_THRESHOLD,
        fixHint: "Add a canonicalUrl field to each page-like type to prevent duplicate-content penalties.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types declare a canonical field`,
      }),
      ratioCheck({
        id: "seo.ogImage",
        title: "Social/OG image field present",
        severity: "minor",
        units: pages,
        satisfies: has("ogImage"),
        threshold: PRESENCE_THRESHOLD,
        fixHint: "Add an ogImage field so shared links render a preview image.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types declare a social-image field`,
      }),
      ratioCheck({
        id: "seo.noindex",
        title: "Robots/noindex control present",
        severity: "minor",
        units: pages,
        satisfies: has("noindex"),
        threshold: NOINDEX_THRESHOLD,
        fixHint: "Add a noindex/robots toggle so editors can control indexing.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types expose a robots/noindex control`,
      }),
    ];
  },
};
