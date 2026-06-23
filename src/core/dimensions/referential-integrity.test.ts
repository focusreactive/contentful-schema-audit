import { referentialIntegrityDimension as refs } from "./referential-integrity.js";
import { field, type, model, semantic } from "../../../test/fixtures/models/factories.js";

const dim = refs.evaluate;

describe("referentialIntegrityDimension", () => {
  it("marks role/judgment checks not_assessable without semantic analysis", () => {
    const checks = dim({ model: model({ contentTypes: [type({ id: "a" })] }) });
    expect(checks.find((c) => c.id === "refs.notStringly")?.status).toBe("not_assessable");
    expect(checks.find((c) => c.id === "refs.noOrphans")?.status).toBe("not_assessable");
  });

  it("flags a string field carrying the internalLinkAsString role", () => {
    const t = type({ id: "page", fields: [field({ id: "rel", type: "text" })] });
    const sa = semantic({ roleMap: { types: {}, fields: { "page.rel": [{ role: "internalLinkAsString", confidence: 0.9 }] } } });
    const checks = dim({ model: model({ contentTypes: [t] }), semantic: sa });
    expect(checks.find((c) => c.id === "refs.notStringly")?.status).toBe("fail");
  });

  it("excludes a refuted orphan and fails a confirmed one", () => {
    const lonely = type({ id: "lonely" });
    const confirmed = semantic({ judgments: [{ kind: "orphanIsDebt", checkId: "refs.noOrphans", subject: "lonely", verdict: "confirmed", confidence: 0.9, rationale: "dead" }] });
    const refuted = semantic({ judgments: [{ kind: "orphanIsDebt", checkId: "refs.noOrphans", subject: "lonely", verdict: "refuted", confidence: 0.9, rationale: "entry point" }] });
    expect(dim({ model: model({ contentTypes: [lonely] }), semantic: confirmed }).find((c) => c.id === "refs.noOrphans")?.status).toBe("fail");
    expect(dim({ model: model({ contentTypes: [lonely] }), semantic: refuted }).find((c) => c.id === "refs.noOrphans")?.status).toBe("pass");
  });
});
