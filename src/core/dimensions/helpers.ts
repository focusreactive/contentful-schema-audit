import type { NormalizedContentType, NormalizedField, NormalizedModel } from "../model/index.js";
import type { CheckResult, Severity } from "../checks/index.js";

export const PAGE_TYPE_NAME_RE =
  /page|article|post|landing|blog|news|story|product|docs?|pdp|plp|clp|hp|category|collection|event|person|location|resource|campaign|episode|podcast|webinar|whitepaper/i;
export const SLUG_FIELD_RE = /slug|path|permalink|url|route|handle|vanityUrl|canonicalPath|urlSegment/i;
export const STRINGLY_LINK_RE =
  /(?<![a-z])([Uu]rl|[Ll]ink|[Hh]ref|[Pp]age|[Rr]ef|[Rr]elated|[Pp]arent|[Cc]hild)(?![a-z])/;
export const RICHTEXT_CANDIDATE_RE = /body|content|description|copy|text|article|richtext/i;
export const SINGLETON_CONFIG_RE = /setting|config|global|site|navigation|menu|footer|header|seodefault/i;

export const SEO_FIELD_PATTERNS = {
  title: /meta.?title|seo.?title|pagetitle/i,
  description: /meta.?desc(?:ription)?|seo.?desc(?:ription)?|page.?desc(?:ription)?|search.?desc(?:ription)?/i,
  canonical: /canonical/i,
  ogImage: /og.?image|social.?image|share.?image/i,
  noindex: /noindex|robots|indexable/i,
} as const;

export type SeoFieldKind = keyof typeof SEO_FIELD_PATTERNS;

function nameMatches(field: NormalizedField, re: RegExp): boolean {
  return re.test(field.id) || re.test(field.name);
}

export function isSlugField(field: NormalizedField): boolean {
  return field.type === "text" && nameMatches(field, SLUG_FIELD_RE);
}

export function hasSlugField(type: NormalizedContentType): boolean {
  return type.fields.some(isSlugField);
}

export function isPageLikeType(type: NormalizedContentType): boolean {
  return hasSlugField(type) || PAGE_TYPE_NAME_RE.test(type.id) || PAGE_TYPE_NAME_RE.test(type.name);
}

export function isSeoField(field: NormalizedField, kind?: SeoFieldKind): boolean {
  const patterns = kind ? [SEO_FIELD_PATTERNS[kind]] : Object.values(SEO_FIELD_PATTERNS);
  return patterns.some((re) => nameMatches(field, re));
}

export function isStringlyTypedLink(field: NormalizedField): boolean {
  if (field.type !== "text" && field.type !== "longText") return false;
  if (isSlugField(field) || isSeoField(field)) return false;
  return nameMatches(field, STRINGLY_LINK_RE);
}

export function isEntryLinkField(field: NormalizedField): boolean {
  return (
    (field.type === "link" && field.linkTarget === "entry")
    || (field.type === "array" && field.items?.linkTarget === "entry")
  );
}

export function isAssetLinkField(field: NormalizedField): boolean {
  return (
    (field.type === "link" && field.linkTarget === "asset")
    || (field.type === "array" && field.items?.linkTarget === "asset")
  );
}

export function allFields(model: NormalizedModel): NormalizedField[] {
  return model.contentTypes.flatMap((t) => t.fields);
}

export function fieldAllowedLinkTypes(field: NormalizedField): string[] | undefined {
  return field.type === "array" ? field.items?.allowedLinkTypes : field.allowedLinkTypes;
}

interface RatioCheckOpts {
  id: string;
  title: string;
  severity: Severity;
  units: NormalizedContentType[];
  satisfies: (unit: NormalizedContentType) => boolean;
  threshold: number;
  fixHint: string;
  describe: (failingCount: number, total: number) => string;
}

export function ratioCheck(opts: RatioCheckOpts): CheckResult {
  const failing = opts.units.filter((unit) => !opts.satisfies(unit));
  const satisfied = opts.units.length - failing.length;
  const ratio = opts.units.length === 0 ? 1 : satisfied / opts.units.length;
  return {
    id: opts.id,
    title: opts.title,
    severity: opts.severity,
    status: ratio >= opts.threshold ? "pass" : "fail",
    evidence: { summary: opts.describe(failing.length, opts.units.length), affectedTypes: failing.map((t) => t.id) },
    fixHint: opts.fixHint,
  };
}
