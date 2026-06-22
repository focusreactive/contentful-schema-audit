import { referentialIntegrityDimension as refs } from "./referential-integrity.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

describe("referentialIntegrityDimension", () => {
  it("fails notStringly (critical) when any link is a plain string", () => {
    const t = type({ id: "article", fields: [field({ id: "relatedUrl", type: "text" })] });
    const c = refs.evaluate(model({ contentTypes: [t] })).find((x) => x.id === "refs.notStringly");
    expect(c?.status).toBe("fail");
    expect(c?.severity).toBe("critical");
  });

  it("passes linkContentType when entry links restrict targets", () => {
    const t = type({ id: "article", fields: [field({ id: "author", type: "link", linkTarget: "entry", allowedLinkTypes: ["author"] })] });
    const c = refs.evaluate(model({ contentTypes: [t] })).find((x) => x.id === "refs.linkContentType");
    expect(c?.status).toBe("pass");
  });
});
