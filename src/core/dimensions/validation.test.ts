import { validationDimension as validation } from "./validation.js";
import { field, type, model, semantic } from "../../../test/fixtures/models/factories.js";

const dim = validation.evaluate;

describe("validationDimension", () => {
  it("marks identifierUnique not_assessable without AI but keeps coverage scored", () => {
    const checks = dim({ model: model({ contentTypes: [type({ id: "a", fields: [field({ id: "x", validations: [{ kind: "size" }] })] })] }) });
    expect(checks.find((c) => c.id === "validation.identifierUnique")?.status).toBe("not_assessable");
    expect(["pass", "fail"]).toContain(checks.find((c) => c.id === "validation.coverage")?.status);
  });

  it("fails identifierUnique when a slug-role field lacks a unique validation", () => {
    const t = type({ id: "page", fields: [field({ id: "s", validations: [] })] });
    const sa = semantic({ roleMap: { types: {}, fields: { "page.s": [{ role: "slug", confidence: 0.9 }] } } });
    expect(dim({ model: model({ contentTypes: [t] }), semantic: sa }).find((c) => c.id === "validation.identifierUnique")?.status).toBe("fail");
  });
});
