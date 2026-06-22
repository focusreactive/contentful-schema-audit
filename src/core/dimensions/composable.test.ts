import { composableDimension } from "./composable.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

describe("composableDimension", () => {
  it("passes modularArrays when a multi-type entry array exists", () => {
    const t = type({ id: "page", fields: [field({ id: "blocks", type: "array",
      items: { type: "link", linkTarget: "entry", allowedLinkTypes: ["hero", "cta"], validations: [] } })] });
    const c = composableDimension.evaluate(model({ contentTypes: [t] })).find((x) => x.id === "composable.modularArrays");
    expect(c?.status).toBe("pass");
  });

  it("fails modularArrays when no multi-type entry array exists", () => {
    const t = type({ id: "page", fields: [field({ id: "title" })] });
    const c = composableDimension.evaluate(model({ contentTypes: [t] })).find((x) => x.id === "composable.modularArrays");
    expect(c?.status).toBe("fail");
  });
});
