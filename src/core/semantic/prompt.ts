import type { NormalizedModel } from "../model/index.js";
import { buildSemanticDigest } from "./digest.js";

const SYSTEM_PROMPT = [
  "You classify a headless-CMS content model. Work only from the provided digest; never invent type or field ids.",
  "Return two things: roles and judgments.",
  "ROLES — assign canonical roles with a 0..1 confidence:",
  "  type roles: page, settings, nav, redirect.",
  "  field roles: slug, metaTitle, metaDescription, canonical, ogImage, noindex, richBody, altText, internalLinkAsString.",
  "Assign a role only when the field/type genuinely plays it, in any language or naming style. Use low confidence when unsure.",
  "internalLinkAsString = a plain text field that stores an INTERNAL link/path (not an external URL).",
  "JUDGMENTS — for each provided candidate, decide whether a real problem exists. verdict 'confirmed' means the problem is REAL; 'refuted' means it is NOT a problem; 'uncertain' when you cannot tell.",
  "  orphanIsDebt (one per orphanCandidates id, subject = type id): is this disconnected type real debt, or a deliberate entry point (fetched by slug/API, a singleton)?",
  "  godTypeIsProblem (one per godTypeCandidates id, subject = type id): is this large type poorly structured, or a justified cohesive type?",
  "  namingIsCryptic (subject = '_dimension'): are field/type names cryptic and non-descriptive overall?",
  "  redirectsAreMissing (subject = '_dimension'): with no redirect type present, are redirects a real gap, or expected to be handled outside the CMS?",
  "Give every judgment a 0..1 confidence and a one-line rationale.",
].join(" ");

export function buildSemanticMessages(model: NormalizedModel): { system: string; prompt: string } {
  return {
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(buildSemanticDigest(model), null, 2),
  };
}
