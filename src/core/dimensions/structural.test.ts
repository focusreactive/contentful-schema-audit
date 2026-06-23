import { oversizedTypeIds, referenceDegree, structuralOrphanTypeIds, GOD_TYPE_MAX_FIELDS } from "./structural.js";
import { field, model, type } from "../../../test/fixtures/models/factories.js";

describe("structural helpers", () => {
  it("flags types that neither reference nor are referenced", () => {
    const linker = type({ id: "linker", fields: [field({ id: "ref", type: "link", linkTarget: "entry", allowedLinkTypes: ["target"] })] });
    const target = type({ id: "target" });
    const lonely = type({ id: "lonely" });
    const ids = structuralOrphanTypeIds(model({ contentTypes: [linker, target, lonely] }));
    expect(ids).toEqual(["lonely"]);
  });

  it("flags oversized types using the shared threshold", () => {
    const fields = Array.from({ length: GOD_TYPE_MAX_FIELDS + 1 }, (_, i) => field({ id: `f${i}` }));
    expect(oversizedTypeIds(model({ contentTypes: [type({ id: "big", fields })] }))).toEqual(["big"]);
  });

  it("computes in/out reference degree", () => {
    const linker = type({ id: "linker", fields: [field({ id: "ref", type: "link", linkTarget: "entry", allowedLinkTypes: ["target"] })] });
    const degree = referenceDegree(model({ contentTypes: [linker, type({ id: "target" })] }));
    expect(degree.get("target")?.inDegree).toBe(1);
    expect(degree.get("linker")?.outDegree).toBe(1);
  });
});
