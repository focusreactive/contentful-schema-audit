import type { NormalizedModel } from "../model/index.js";
import { oversizedTypeIds, referenceDegree, structuralOrphanTypeIds } from "../dimensions/structural.js";

export interface DigestField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  localized: boolean;
  validationKinds: string[];
  linkTarget?: string;
  allowedLinkTypes?: string[];
}

export interface DigestType {
  id: string;
  name: string;
  description?: string;
  displayField?: string;
  fieldCount: number;
  inDegree: number;
  outDegree: number;
  fields: DigestField[];
}

export interface SemanticDigest {
  types: DigestType[];
  orphanCandidates: string[];
  godTypeCandidates: string[];
}

export function buildSemanticDigest(model: NormalizedModel): SemanticDigest {
  const degree = referenceDegree(model);

  const types: DigestType[] = model.contentTypes.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    displayField: t.displayField,
    fieldCount: t.fields.length,
    inDegree: degree.get(t.id)?.inDegree ?? 0,
    outDegree: degree.get(t.id)?.outDegree ?? 0,
    fields: t.fields.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      required: f.required,
      localized: f.localized ?? false,
      validationKinds: f.validations.map((v) => v.kind),
      linkTarget: f.linkTarget ?? f.items?.linkTarget,
      allowedLinkTypes: f.allowedLinkTypes ?? f.items?.allowedLinkTypes,
    })),
  }));

  return {
    types,
    orphanCandidates: structuralOrphanTypeIds(model),
    godTypeCandidates: oversizedTypeIds(model),
  };
}
