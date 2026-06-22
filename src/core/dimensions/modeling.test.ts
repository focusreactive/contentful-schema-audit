import { modelingDimension } from "./modeling.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

describe("modelingDimension", () => {
  it("passes richText check when body fields are richText", () => {
    const t = type({ id: "article", fields: [field({ id: "body", type: "richText" })] });
    const checks = modelingDimension.evaluate(model({ contentTypes: [t] }));
    expect(checks.find((c) => c.id === "modeling.richText")?.status).toBe("pass");
  });

  it("does not count SEO description fields as richText candidates", () => {
    const t = type({ id: "article", fields: [field({ id: "metaDescription", type: "text" })] });
    const checks = modelingDimension.evaluate(model({ contentTypes: [t] }));
    // metaDescription is an SEO field — should not trigger a richText fail
    expect(checks.find((c) => c.id === "modeling.richText")?.status).toBe("pass");
  });

  it("fails jsonFields when more than 10% of fields are JSON", () => {
    const fields = [
      field({ id: "data", type: "json" }),
      field({ id: "moreData", type: "json" }),
      ...Array.from({ length: 8 }, (_, i) => field({ id: `text${i}`, type: "text" })),
    ];
    const t = type({ id: "article", fields });
    const checks = modelingDimension.evaluate(model({ contentTypes: [t] }));
    expect(checks.find((c) => c.id === "modeling.jsonFields")?.status).toBe("fail");
  });
});
