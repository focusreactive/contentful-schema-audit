import { contentfulAdapter, AccessError } from "./index.js";
import type { DetectResult, FetchedPage } from "../../core/adapter.js";

const emptyPage: FetchedPage = { url: "x", finalUrl: "x", html: "", scripts: [], requests: [] };
const detected: DetectResult = { isMatch: true, spaceId: "sp", region: "global", signals: [] };

describe("contentfulAdapter.acquireAccess", () => {
  it("prefers a provided token and marks acquisition provided", async () => {
    const access = await contentfulAdapter.acquireAccess(detected, { page: emptyPage, providedToken: "tok" });
    expect(access).toMatchObject({ spaceId: "sp", deliveryToken: "tok", acquisition: "provided", environment: "master" });
  });

  it("throws AccessError when no token can be resolved", async () => {
    await expect(contentfulAdapter.acquireAccess(detected, { page: emptyPage })).rejects.toBeInstanceOf(AccessError);
  });

  it("falls back to a sniffed delivery token and marks acquisition sniffed", async () => {
    const pageWithToken: FetchedPage = {
      url: "x",
      finalUrl: "x",
      html: "",
      scripts: [],
      requests: [
        { url: "https://cdn.contentful.com/spaces/sp/entries?access_token=sniffedToken123", method: "GET", headers: {} },
      ],
    };
    const access = await contentfulAdapter.acquireAccess(detected, { page: pageWithToken });
    expect(access).toMatchObject({ deliveryToken: "sniffedToken123", acquisition: "sniffed", region: "global" });
  });
});

describe("contentfulAdapter.capabilities", () => {
  it("provides every signal except entries.sample", () => {
    const caps = contentfulAdapter.capabilities();
    expect(caps.providedSignals).not.toContain("entries.sample");
    expect(caps.providedSignals).toContain("field.validations");
    expect(caps.notes?.composable).toMatch(/management token/i);
  });
});
