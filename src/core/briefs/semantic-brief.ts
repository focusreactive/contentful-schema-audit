import { join } from "node:path";
import { z } from "zod";
import type { SemanticDigest } from "../semantic/digest.js";
import { SEMANTIC_FILE, semanticFileSchema } from "../artifacts/semantic-file.js";
import { fence } from "./fence.js";

export const EXAMPLE_DIGEST: SemanticDigest = {
  types: [
    {
      id: "landingPage",
      name: "Landing Page",
      displayField: "title",
      fieldCount: 4,
      inDegree: 0,
      outDegree: 1,
      fields: [
        {
          id: "title",
          name: "Title",
          type: "text",
          required: true,
          localized: false,
          validationKinds: [],
        },
        {
          id: "urlSlug",
          name: "URL Slug",
          type: "text",
          required: true,
          localized: false,
          validationKinds: ["unique", "regexp"],
        },
        {
          id: "seoTitle",
          name: "SEO Title",
          type: "text",
          required: false,
          localized: true,
          validationKinds: ["size"],
        },
        {
          id: "body",
          name: "Body",
          type: "richText",
          required: false,
          localized: true,
          validationKinds: [],
        },
      ],
    },
    {
      id: "legacyBanner",
      name: "Banner (old)",
      fieldCount: 1,
      inDegree: 0,
      outDegree: 0,
      fields: [
        {
          id: "image",
          name: "Image",
          type: "link",
          required: false,
          localized: false,
          validationKinds: [],
          linkTarget: "asset",
        },
      ],
    },
  ],
  orphanCandidates: ["legacyBanner"],
  godTypeCandidates: [],
};

export const EXAMPLE_OUTPUT = {
  typeRoles: [
    {
      typeId: "landingPage",
      role: "page",
      confidence: 0.95,
    },
  ],
  fieldRoles: [
    { typeId: "landingPage", fieldId: "urlSlug", role: "slug", confidence: 0.95 },
    { typeId: "landingPage", fieldId: "seoTitle", role: "metaTitle", confidence: 0.85 },
    { typeId: "landingPage", fieldId: "body", role: "richBody", confidence: 0.9 },
  ],
  judgments: [
    {
      kind: "orphanIsDebt",
      subject: "legacyBanner",
      verdict: "confirmed",
      confidence: 0.7,
      rationale: 'Named "(old)", unreferenced, single image field — looks like leftover schema debt.',
    },
    {
      kind: "namingIsCryptic",
      subject: "_dimension",
      verdict: "refuted",
      confidence: 0.9,
      rationale: "Type and field names are descriptive.",
    },
    {
      kind: "redirectsAreMissing",
      subject: "_dimension",
      verdict: "uncertain",
      confidence: 0.5,
      rationale: "Routable pages exist but redirect handling location is unknowable from two types.",
    },
  ],
  model: "example-model-id",
};

export function renderSemanticBrief(opts: { digest: SemanticDigest; workDir: string }): string {
  const outputPath = join(opts.workDir, SEMANTIC_FILE);
  const schema = z.toJSONSchema(semanticFileSchema);

  return `# Semantic classification — cms-schema-validator

You are the semantic-analysis stage of a deterministic CMS-schema audit.
Classify the content model digest below, then write your answer as raw JSON
to the exact file path in "Write to". Work ONLY from the digest — never
invent type or field ids, never assume what a site "probably" has.

## How your output is used
- Roles unlock deterministic checks (types with role \`page\` get SEO and
  slug checks). A missed role silently skips checks; a wrong role creates
  false findings.
- The scorer IGNORES any role or judgment with confidence < 0.6. Do not
  inflate confidence to cross that bar; do not emit noise below 0.35.
- Judgments confirm or overturn structural findings (an "orphan" type may
  be a deliberate entry point; a 40-field type may be a justified singleton).

## Digest legend
Each entry of \`types\`: \`id\`, \`name\`, \`description\`, \`displayField\` (entry
title field), \`fieldCount\`, \`inDegree\`/\`outDegree\` (referenced-by / references
count), and \`fields[]\` with \`id\`, \`name\`, \`type\`, \`required\`, \`localized\`,
\`validationKinds\` (e.g. unique, regexp, size, in), \`linkTarget\`
(Entry/Asset), \`allowedLinkTypes\` (allowed target type ids).
\`orphanCandidates\` and \`godTypeCandidates\` list type ids that were flagged
structurally — each requires exactly one judgment (Task 3).

## Task 1 — type roles (zero or more per type)
Names may be in any language or naming style — classify by meaning.

| role | assign when | do NOT assign when |
|---|---|---|
| \`page\` | routable web page: slug/path field, SEO meta fields, or page-like name (page, article, post, landing…) | embeddable section/block; plain data record (author, tag, category) |
| \`settings\` | site-wide config singleton: logo, socials, footer text; typically inDegree 0 and referenced by nothing | per-page options; theme tokens on a component |
| \`nav\` | navigation/menu structure: menu items, link lists, header/footer nav | a single generic link type; breadcrumbs derived from pages |
| \`redirect\` | redirect rules: from/to path pair, optional status code | generic link or alias types |

## Task 2 — field roles (keyed by typeId + fieldId)
| role | assign when |
|---|---|
| \`slug\` | URL segment/path identifier: Symbol/Text, often unique or regexp-validated, named slug/path/url/handle… |
| \`metaTitle\` | SEO title (incl. fields inside a dedicated SEO component type) |
| \`metaDescription\` | SEO description |
| \`canonical\` | canonical URL field |
| \`ogImage\` | social-sharing/OG image |
| \`noindex\` | robots/indexing control (boolean or enum) |
| \`richBody\` | main body content: RichText, or a long Text field playing that role |
| \`altText\` | alternative text / caption describing an image or asset |
| \`internalLinkAsString\` | plain text storing an INTERNAL path or slug reference ("/pricing", "blog/my-post") — NOT an external-URL field, NOT a real reference field |

## Task 3 — judgments (emit exactly this set)
- one \`orphanIsDebt\` per id in \`orphanCandidates\` (subject = the type id).
  confirmed → leftover schema debt. refuted → deliberately standalone
  (fetched directly by slug/API, singleton, webhook target).
- one \`godTypeIsProblem\` per id in \`godTypeCandidates\` (subject = the type
  id). confirmed → incohesive grab-bag. refuted → justified breadth
  (settings singleton, product with many real attributes).
- exactly one \`namingIsCryptic\` (subject = "_dimension").
  confirmed → ids/names largely cryptic (fld1, ct_x, abbreviations).
  refuted → names mostly self-describing.
- exactly one \`redirectsAreMissing\` (subject = "_dimension").
  If you assigned \`redirect\` to any type → refuted. Otherwise: confirmed
  when this model clearly manages routable pages (redirects belong in the
  CMS), refuted when redirects are plausibly handled at the platform/edge,
  uncertain when you cannot tell.

Verdict semantics: confirmed = the PROBLEM IS REAL. refuted = NOT a
problem. uncertain = cannot tell (scorer treats it as unknown).

## Confidence calibration
0.9–1.0 unambiguous · 0.75–0.85 strong convergent evidence ·
0.6–0.7 more likely than not (minimum the scorer acts on) ·
0.35–0.55 weak — emit only if genuinely informative · <0.35 do not emit.

## Output contract
Write RAW JSON — no markdown fences, no comments, no trailing commas —
matching this JSON Schema:
${fence(schema)}
Hard rules: every typeId/fieldId must exist in the digest (the validator
rejects unknown ids, exit code 2); the judgment set must be exactly Task 3;
\`model\` = your model id string.

## Example
${fence(EXAMPLE_DIGEST)}
→
${fence(EXAMPLE_OUTPUT)}

## Data
${fence(opts.digest)}

## Write to
${outputPath}

## Next
cms-validate score --work-dir ${opts.workDir}
Exit 2 → read stderr, fix ${SEMANTIC_FILE}, rerun (max 2 fixes; then fall
back: cms-validate score --work-dir ${opts.workDir} --no-semantic).
`;
}
