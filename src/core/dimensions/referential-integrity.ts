import type { DimensionDefinition } from "./types.js";
import type { CheckResult } from "../checks/index.js";
import type { NormalizedModel } from "../model/index.js";
import {
  allFields,
  fieldAllowedLinkTypes,
  isEntryLinkField,
  isStringlyTypedLink,
  SINGLETON_CONFIG_RE,
} from "./helpers.js";

const RESTRICTED_LINK_MIN_RATIO = 0.8;

function orphanTypeIds(model: NormalizedModel): string[] {
  const referenced = new Set<string>();
  const referencing = new Set<string>();
  for (const edge of model.referenceGraph.edges) {
    referencing.add(edge.fromType);
    for (const target of edge.toTypes) referenced.add(target);
  }
  return model.contentTypes
    .filter((t) => !SINGLETON_CONFIG_RE.test(t.id) && !referenced.has(t.id) && !referencing.has(t.id))
    .map((t) => t.id);
}

export const referentialIntegrityDimension: DimensionDefinition = {
  id: "referentialIntegrity",
  title: "Referential Integrity",
  tier: "high",
  requiredSignals: ["field.type", "field.linkTarget", "field.allowedLinkTypes", "referenceGraph"],
  evaluate: (model: NormalizedModel): CheckResult[] => {
    const stringly = allFields(model).filter(isStringlyTypedLink);
    const entryLinks = allFields(model).filter(isEntryLinkField);
    const restricted = entryLinks.filter((f) => (fieldAllowedLinkTypes(f)?.length ?? 0) > 0);
    const restrictedRatio = entryLinks.length === 0 ? 1 : restricted.length / entryLinks.length;
    const orphans = orphanTypeIds(model);

    return [
      {
        id: "refs.notStringly",
        title: "Internal links use references, not strings",
        severity: "critical",
        status: stringly.length === 0 ? "pass" : "fail",
        evidence: {
          summary: `${stringly.length} fields store links as plain strings`,
          detail: { fields: stringly.map((f) => f.id) },
        },
        fixHint: "Replace free-text link fields with Link/Entry references so links can't dangle.",
      },
      {
        id: "refs.linkContentType",
        title: "Entry links restrict their target types",
        severity: "major",
        status: restrictedRatio >= RESTRICTED_LINK_MIN_RATIO ? "pass" : "fail",
        evidence: {
          summary: `${restricted.length} of ${entryLinks.length} entry-link fields restrict allowed target types`,
        },
        fixHint: "Add a linkContentType validation so each reference only accepts the intended types.",
      },
      {
        id: "refs.noOrphans",
        title: "No orphaned content types",
        severity: "minor",
        status: orphans.length === 0 ? "pass" : "fail",
        evidence: {
          summary: `${orphans.length} content types are neither referenced nor referencing`,
          affectedTypes: orphans,
        },
        fixHint: "Connect or remove content types that are not part of the reference graph.",
      },
    ];
  },
};
