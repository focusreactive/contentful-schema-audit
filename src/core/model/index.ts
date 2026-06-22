import type { NormalizedContentType, ReferenceEdge, ReferenceGraph } from "./types.js";

export * from "./types.js";

export function buildReferenceGraph(types: NormalizedContentType[]): ReferenceGraph {
  const edges: ReferenceEdge[] = [];

  for (const type of types) {
    for (const field of type.fields) {
      if (field.type === "link" && field.linkTarget === "entry") {
        edges.push({
          fromType: type.id,
          fromField: field.id,
          toTypes: field.allowedLinkTypes ?? [],
          viaArray: false,
        });
      } else if (field.type === "array" && field.items?.linkTarget === "entry") {
        edges.push({
          fromType: type.id,
          fromField: field.id,
          toTypes: field.items.allowedLinkTypes ?? [],
          viaArray: true,
        });
      }
    }
  }
  return {
    typeIds: types.map((t) => t.id),
    edges,
  };
}
