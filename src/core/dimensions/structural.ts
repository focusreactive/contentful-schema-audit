import type { NormalizedModel } from "../model/index.js";

export const GOD_TYPE_MAX_FIELDS = 30;

export function referenceDegree(model: NormalizedModel): Map<string, { inDegree: number; outDegree: number }> {
  const degree = new Map<string, { inDegree: number; outDegree: number }>();
  for (const t of model.contentTypes) degree.set(t.id, { inDegree: 0, outDegree: 0 });

  for (const edge of model.referenceGraph.edges) {
    const from = degree.get(edge.fromType);
    if (from) from.outDegree += 1;
    for (const target of edge.toTypes) {
      const to = degree.get(target);
      if (to) to.inDegree += 1;
    }
  }
  return degree;
}

export function structuralOrphanTypeIds(model: NormalizedModel): string[] {
  const referenced = new Set<string>();
  const referencing = new Set<string>();
  for (const edge of model.referenceGraph.edges) {
    referencing.add(edge.fromType);
    for (const target of edge.toTypes) referenced.add(target);
  }
  return model.contentTypes.filter((t) => !referenced.has(t.id) && !referencing.has(t.id)).map((t) => t.id);
}

export function oversizedTypeIds(model: NormalizedModel): string[] {
  return model.contentTypes.filter((t) => t.fields.length > GOD_TYPE_MAX_FIELDS).map((t) => t.id);
}
