import { slugDimension } from "./slug.js";
import { field, type, model, semantic } from "../../../test/fixtures/models/factories.js";

const page = type({ id: "page", fields: [field({ id: "s", validations: [{ kind: "unique" }, { kind: "regexp" }] })] });
const pageRole = semantic({
  roleMap: { types: { page: [{ role: "page", confidence: 0.9 }] }, fields: { "page.s": [{ role: "slug", confidence: 0.9 }] } },
});

describe("slugDimension", () => {
  it("passes present/unique/pattern when the slug role carries validations", () => {
    const checks = slugDimension.evaluate({ model: model({ contentTypes: [page] }), semantic: pageRole });
    expect(checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("fails present (critical) when a page type has no slug-role field", () => {
    const noSlug = semantic({ roleMap: { types: { page: [{ role: "page", confidence: 0.9 }] }, fields: {} } });
    const checks = slugDimension.evaluate({ model: model({ contentTypes: [page] }), semantic: noSlug });
    const present = checks.find((c) => c.id === "slug.present");
    expect(present?.status).toBe("fail");
    expect(present?.severity).toBe("critical");
  });
});
