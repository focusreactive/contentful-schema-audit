import { slugDimension } from "./slug.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

describe("slugDimension", () => {
  it("is not applicable without page-like types", () => {
    expect(slugDimension.isApplicable?.({ model: model({ contentTypes: [type({ id: "color" })] }) })).toBe(false);
  });

  it("fails slug.present (critical) when a page type has no slug", () => {
    const t = type({ id: "article", fields: [field({ id: "title" })] });
    const c = slugDimension.evaluate({ model: model({ contentTypes: [t] }) }).find((x) => x.id === "slug.present");
    expect(c?.status).toBe("fail");
    expect(c?.severity).toBe("critical");
  });
});
