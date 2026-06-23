import type { NormalizedContentType, NormalizedField, NormalizedModel } from "../../../src/core/model/index.js";
import { buildReferenceGraph } from "../../../src/core/model/index.js";
import type { SemanticAnalysis } from "../../../src/core/semantic/types.js";

export function field(partial: Partial<NormalizedField> & { id: string }): NormalizedField {
  return {
    name: partial.id,
    type: "text",
    required: false,
    validations: [],
    ...partial,
  };
}

export function type(partial: Partial<NormalizedContentType> & { id: string }): NormalizedContentType {
  return {
    name: partial.id,
    fields: [],
    ...partial,
  };
}

export function model(partial: Partial<NormalizedModel> = {}): NormalizedModel {
  const contentTypes = partial.contentTypes ?? [];
  const locales = partial.locales ?? [{ code: "en-US", default: true, fallbackCode: null, supportsFallback: true }];

  return {
    cms: "contentful",
    spaceId: "test",
    environment: "master",
    contentTypes,
    locales,
    referenceGraph: partial.referenceGraph ?? buildReferenceGraph(contentTypes),
    meta: { fetchedAt: "2026-01-01T00:00:00Z", contentTypeCount: contentTypes.length, localeCount: locales.length },
    ...partial,
  };
}

export function semantic(partial: Partial<SemanticAnalysis> = {}): SemanticAnalysis {
  return {
    roleMap: partial.roleMap ?? { types: {}, fields: {} },
    judgments: partial.judgments ?? [],
    model: partial.model ?? "test-model",
  };
}
