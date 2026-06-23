import type { NormalizedContentType, NormalizedField, NormalizedModel } from "../model/index.js";
import type { CheckResult, Severity } from "../checks/index.js";
import type { EvaluateContext } from "./types.js";
import { typeHasRole } from "../semantic/roles.js";

export function pageTypes(ctx: EvaluateContext): NormalizedContentType[] {
  const { model, semantic } = ctx;
  if (!semantic) return [];
  return model.contentTypes.filter((t) => typeHasRole(semantic, t.id, "page"));
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

interface RatioCheckOpts<T extends { id: string } = { id: string }> {
  id: string;
  title: string;
  severity: Severity;
  units: T[];
  satisfies: (unit: T) => boolean;
  threshold: number;
  fixHint: string;
  describe: (failingCount: number, total: number) => string;
}

export function ratioCheck<T extends { id: string }>(opts: RatioCheckOpts<T>): CheckResult {
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

export function notAssessableCheck(opts: {
  id: string;
  title: string;
  severity: Severity;
  reason: string;
  fixHint: string;
}): CheckResult {
  return {
    id: opts.id,
    title: opts.title,
    severity: opts.severity,
    status: "not_assessable",
    evidence: { summary: opts.reason },
    fixHint: opts.fixHint,
  };
}
