import type { DimensionDefinition, EvaluateContext } from "./types.js";
import type { CheckResult } from "../checks/index.js";
import type { NormalizedModel } from "../model/index.js";
import type { SemanticAnalysis } from "../semantic/types.js";
import { allFields, fieldAllowedLinkTypes, isEntryLinkField, notAssessableCheck } from "./helpers.js";
import { structuralOrphanTypeIds } from "./structural.js";
import { fieldHasRole, judgmentFor, resolveJudgment } from "../semantic/roles.js";

const RESTRICTED_LINK_MIN_RATIO = 0.8;

function notStringlyCheck(model: NormalizedModel, semantic: SemanticAnalysis): CheckResult {
  const stringly = model.contentTypes.flatMap((t) =>
    t.fields
      .filter(
        (f) =>
          (f.type === "text" || f.type === "longText") && fieldHasRole(semantic, t.id, f.id, "internalLinkAsString"),
      )
      .map((f) => `${t.id}.${f.id}`),
  );
  return {
    id: "refs.notStringly",
    title: "Internal links use references, not strings",
    severity: "critical",
    status: stringly.length === 0 ? "pass" : "fail",
    evidence: {
      summary: `${stringly.length} fields store internal links as plain strings`,
      detail: { fields: stringly },
    },
    fixHint: "Replace free-text link fields with Link/Entry references so links can't dangle.",
  };
}

function noOrphansCheck(model: NormalizedModel, semantic: SemanticAnalysis): CheckResult {
  const orphans = structuralOrphanTypeIds(model);
  const judged = orphans.map((id) => ({ id, verdict: resolveJudgment(judgmentFor(semantic, "refs.noOrphans", id)) }));
  const confirmed = judged.filter((j) => j.verdict === "confirmed").map((j) => j.id);
  const unknown = judged.filter((j) => j.verdict === "unknown");

  if (confirmed.length > 0) {
    return {
      id: "refs.noOrphans",
      title: "No orphaned content types",
      severity: "minor",
      status: "fail",
      evidence: {
        summary: `${confirmed.length} content types are disconnected and not a deliberate entry point`,
        affectedTypes: confirmed,
      },
      fixHint: "Connect or remove content types that are not part of the reference graph.",
    };
  }
  if (unknown.length > 0) {
    return notAssessableCheck({
      id: "refs.noOrphans",
      title: "No orphaned content types",
      severity: "minor",
      reason: `${unknown.length} disconnected types could not be judged as debt vs. entry points`,
      fixHint: "Connect or remove content types that are not part of the reference graph.",
    });
  }
  return {
    id: "refs.noOrphans",
    title: "No orphaned content types",
    severity: "minor",
    status: "pass",
    evidence: { summary: "No orphaned content types, or all are deliberate entry points" },
    fixHint: "Connect or remove content types that are not part of the reference graph.",
  };
}

export const referentialIntegrityDimension: DimensionDefinition = {
  id: "referentialIntegrity",
  title: "Referential Integrity",
  tier: "high",
  requiredSignals: ["field.type", "field.linkTarget", "field.allowedLinkTypes", "referenceGraph"],
  evaluate: ({ model, semantic }: EvaluateContext): CheckResult[] => {
    const entryLinks = allFields(model).filter(isEntryLinkField);
    const restricted = entryLinks.filter((f) => (fieldAllowedLinkTypes(f)?.length ?? 0) > 0);
    const restrictedRatio = entryLinks.length === 0 ? 1 : restricted.length / entryLinks.length;

    const linkContentType: CheckResult = {
      id: "refs.linkContentType",
      title: "Entry links restrict their target types",
      severity: "major",
      status: restrictedRatio >= RESTRICTED_LINK_MIN_RATIO ? "pass" : "fail",
      evidence: {
        summary: `${restricted.length} of ${entryLinks.length} entry-link fields restrict allowed target types`,
      },
      fixHint: "Add a linkContentType validation so each reference only accepts the intended types.",
    };

    const stringly =
      semantic ?
        notStringlyCheck(model, semantic)
      : notAssessableCheck({
          id: "refs.notStringly",
          title: "Internal links use references, not strings",
          severity: "critical",
          reason: "Detecting stringly-typed internal links needs AI semantic analysis.",
          fixHint: "Replace free-text link fields with Link/Entry references so links can't dangle.",
        });

    const orphans =
      semantic ?
        noOrphansCheck(model, semantic)
      : notAssessableCheck({
          id: "refs.noOrphans",
          title: "No orphaned content types",
          severity: "minor",
          reason: "Judging orphan types as debt vs. entry points needs AI semantic analysis.",
          fixHint: "Connect or remove content types that are not part of the reference graph.",
        });

    return [stringly, linkContentType, orphans];
  },
};
