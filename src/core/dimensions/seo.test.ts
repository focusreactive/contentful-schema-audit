import { seoDimension } from "./seo.js";
import { field, type, model, semantic } from "../../../test/fixtures/models/factories.js";

const article = type({
  id: "article",
  fields: [field({ id: "mt" }), field({ id: "md" }), field({ id: "cu" }), field({ id: "oi" }), field({ id: "ni", type: "boolean" })],
});

const fullRoles = semantic({
  roleMap: {
    types: { article: [{ role: "page", confidence: 0.9 }] },
    fields: {
      "article.mt": [{ role: "metaTitle", confidence: 0.9 }],
      "article.md": [{ role: "metaDescription", confidence: 0.9 }],
      "article.cu": [{ role: "canonical", confidence: 0.9 }],
      "article.oi": [{ role: "ogImage", confidence: 0.9 }],
      "article.ni": [{ role: "noindex", confidence: 0.9 }],
    },
  },
});

describe("seoDimension", () => {
  it("is not applicable when no type has the page role", () => {
    const ctx = { model: model({ contentTypes: [type({ id: "color" })] }), semantic: semantic() };
    expect(seoDimension.isApplicable?.(ctx)).toBe(false);
  });

  it("passes every check when page fields carry SEO roles", () => {
    const checks = seoDimension.evaluate({ model: model({ contentTypes: [article] }), semantic: fullRoles });
    expect(checks.every((c) => c.status === "pass")).toBe(true);
  });

  it("fails canonical (critical) when no page field has the canonical role", () => {
    const noCanonical = semantic({
      roleMap: { types: { article: [{ role: "page", confidence: 0.9 }] }, fields: {} },
    });
    const checks = seoDimension.evaluate({ model: model({ contentTypes: [article] }), semantic: noCanonical });
    const canonical = checks.find((c) => c.id === "seo.canonical");
    expect(canonical?.status).toBe("fail");
    expect(canonical?.severity).toBe("critical");
  });
});
