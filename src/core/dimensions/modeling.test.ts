import { modelingDimension as modeling } from "./modeling.js";
import { field, type, model, semantic } from "../../../test/fixtures/models/factories.js";

const dim = modeling.evaluate;

describe("modelingDimension", () => {
  it("keeps reuse/jsonFields scored but marks richText/godTypes not_assessable without AI", () => {
    const checks = dim({ model: model({ contentTypes: [type({ id: "a" })] }) });
    expect(checks.find((c) => c.id === "modeling.richText")?.status).toBe("not_assessable");
    expect(checks.find((c) => c.id === "modeling.godTypes")?.status).toBe("not_assessable");
    expect(["pass", "fail"]).toContain(checks.find((c) => c.id === "modeling.jsonFields")?.status);
  });

  it("passes richText when richBody-role fields use rich text", () => {
    const t = type({ id: "post", fields: [field({ id: "body", type: "richText" })] });
    const sa = semantic({ roleMap: { types: {}, fields: { "post.body": [{ role: "richBody", confidence: 0.9 }] } } });
    expect(dim({ model: model({ contentTypes: [t] }), semantic: sa }).find((c) => c.id === "modeling.richText")?.status).toBe("pass");
  });

  it("fails godTypes when a confirmed judgment flags an oversized type", () => {
    const fields = Array.from({ length: 31 }, (_, i) => field({ id: `f${i}` }));
    const t = type({ id: "blob", fields });
    const sa = semantic({ judgments: [{ kind: "godTypeIsProblem", checkId: "modeling.godTypes", subject: "blob", verdict: "confirmed", confidence: 0.9, rationale: "kitchen sink" }] });
    expect(dim({ model: model({ contentTypes: [t] }), semantic: sa }).find((c) => c.id === "modeling.godTypes")?.status).toBe("fail");
  });
});
