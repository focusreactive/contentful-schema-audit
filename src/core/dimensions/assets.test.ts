import { assetsDimension } from "./assets.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

describe("assetsDimension", () => {
  it("is not applicable when there are no asset fields", () => {
    expect(assetsDimension.isApplicable?.({ model: model({ contentTypes: [type({ id: "page", fields: [field({ id: "title" })] })] }) })).toBe(false);
  });

  it("fails altText when an asset-owning type has no alt field", () => {
    const t = type({ id: "gallery", fields: [field({ id: "image", type: "link", linkTarget: "asset" })] });
    const c = assetsDimension.evaluate({ model: model({ contentTypes: [t] }) }).find((x) => x.id === "assets.altText");
    expect(c?.status).toBe("fail");
  });
});
