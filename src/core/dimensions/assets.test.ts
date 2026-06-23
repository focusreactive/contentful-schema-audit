import { assetsDimension as assets } from "./assets.js";
import { field, type, model, semantic } from "../../../test/fixtures/models/factories.js";

const withAsset = type({ id: "post", fields: [field({ id: "img", type: "link", linkTarget: "asset" })] });
const dim = assets.evaluate;

describe("assetsDimension", () => {
  it("marks altText not_assessable without AI but keeps modeledAsRef scored", () => {
    const checks = dim({ model: model({ contentTypes: [withAsset] }) });
    expect(checks.find((c) => c.id === "assets.altText")?.status).toBe("not_assessable");
    expect(checks.find((c) => c.id === "assets.modeledAsRef")?.status).toBe("pass");
  });

  it("passes altText when an asset-owning type has an altText-role field", () => {
    const t = type({ id: "post", fields: [field({ id: "img", type: "link", linkTarget: "asset" }), field({ id: "a" })] });
    const sa = semantic({ roleMap: { types: {}, fields: { "post.a": [{ role: "altText", confidence: 0.9 }] } } });
    expect(dim({ model: model({ contentTypes: [t] }), semantic: sa }).find((c) => c.id === "assets.altText")?.status).toBe("pass");
  });
});
