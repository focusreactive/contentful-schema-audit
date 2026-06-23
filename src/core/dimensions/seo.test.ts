import { seoDimension } from "./seo.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

const fullyOptimised = type({
  id: "article",
  fields: [
    field({ id: "metaTitle" }), field({ id: "metaDescription" }),
    field({ id: "canonicalUrl" }), field({ id: "ogImage" }), field({ id: "noindex", type: "boolean" }),
  ],
});
const seoBlind = type({ id: "page", fields: [field({ id: "slug" })] });

describe("seoDimension", () => {
  it("is not applicable when there are no page-like types", () => {
    const m = model({ contentTypes: [type({ id: "color", fields: [] })] });
    expect(seoDimension.isApplicable?.({ model: m })).toBe(false);
  });

  it("passes every check for a fully optimised page type", () => {
    const checks = seoDimension.evaluate({ model: model({ contentTypes: [fullyOptimised] }) });
    expect(checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("fails canonical (critical) when no page type has one", () => {
    const checks = seoDimension.evaluate({ model: model({ contentTypes: [seoBlind] }) });
    const canonical = checks.find((c) => c.id === "seo.canonical");
    expect(canonical?.status).toBe("fail");
    expect(canonical?.severity).toBe("critical");
  });
});
