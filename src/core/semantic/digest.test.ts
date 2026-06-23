import { buildSemanticDigest } from "./digest.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

describe("buildSemanticDigest", () => {
  it("captures per-field facts and candidate lists", () => {
    const t = type({ id: "page", name: "Page", description: "a page", fields: [field({ id: "slug", name: "Slug", type: "text", required: true })] });
    const digest = buildSemanticDigest(model({ contentTypes: [t] }));

    expect(digest.types.length).toBe(1);
    expect(digest.types[0]).toMatchObject({ id: "page", name: "Page", fieldCount: 1, inDegree: 0, outDegree: 0 });
    expect(digest.types[0]!.fields[0]).toMatchObject({ id: "slug", name: "Slug", type: "text", required: true });
    expect(digest.orphanCandidates).toEqual(["page"]);
    expect(digest.godTypeCandidates).toEqual([]);
  });
});
