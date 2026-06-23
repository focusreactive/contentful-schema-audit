import type { DimensionDefinition } from "./types.js";
import type { NormalizedModel } from "../model/index.js";
import { isPageLikeType, isSeoField, ratioCheck } from "./helpers.js";

const PRESENCE_THRESHOLD = 0.8;
const NOINDEX_THRESHOLD = 0.5;

function pageTypes(model: NormalizedModel) {
  return model.contentTypes.filter(isPageLikeType);
}

export const seoDimension: DimensionDefinition = {
  id: "seo",
  title: "SEO Readiness",
  tier: "high",
  requiredSignals: ["contentType.fields", "field.type", "semantic.analysis"],
  isApplicable: ({ model }) => pageTypes(model).length > 0,
  applicabilityReason: "No page-like content types to optimise for search.",
  evaluate: ({ model }) => {
    const pages = pageTypes(model);
    const has = (kind: Parameters<typeof isSeoField>[1]) => (t: (typeof pages)[number]) =>
      t.fields.some((f) => isSeoField(f, kind));

    return [
      ratioCheck({
        id: "seo.title",
        title: "Meta title field present",
        severity: "major",
        units: pages,
        satisfies: has("title"),
        threshold: PRESENCE_THRESHOLD,
        fixHint: "Add a metaTitle field to each page-like type.",
        describe: (fail, total) => `${total - fail} of ${total} page-like types declare a meta-title field`,
      }),
      ratioCheck({
        id: "seo.description",
        title: "Meta description field present",
        severity: "major",
        units: pages,
        satisfies: has("description"),
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
