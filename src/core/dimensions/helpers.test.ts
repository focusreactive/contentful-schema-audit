import { isAssetLinkField, isEntryLinkField, ratioCheck } from "./helpers.js";
import { field } from "../../../test/fixtures/models/factories.js";

describe("link field predicates", () => {
  it("detects entry and asset links", () => {
    expect(isEntryLinkField(field({ id: "r", type: "link", linkTarget: "entry" }))).toBe(true);
    expect(isAssetLinkField(field({ id: "m", type: "link", linkTarget: "asset" }))).toBe(true);
    expect(isEntryLinkField(field({ id: "m", type: "link", linkTarget: "asset" }))).toBe(false);
  });
});

describe("ratioCheck", () => {
  it("passes when the satisfied ratio meets the threshold", () => {
    const result = ratioCheck({
      id: "x", title: "x", severity: "minor",
      units: [{ id: "a" }, { id: "b" }],
      satisfies: (u) => u.id === "a",
      threshold: 0.5, fixHint: "", describe: () => "",
    });
    expect(result.status).toBe("pass");
  });
});
