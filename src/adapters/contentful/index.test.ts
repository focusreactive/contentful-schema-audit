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

describe("contentfulAdapter.acquireAccess debug logging", () => {
  const pageWithToken: FetchedPage = {
    url: "x",
    finalUrl: "x",
    html: "",
    scripts: [],
    requests: [
      { url: "https://cdn.contentful.com/spaces/sp/entries?access_token=sniffedToken123", method: "GET", headers: {} },
    ],
  };

  it("logs provided-flag sources for spaceId and token when debug is on", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await contentfulAdapter.acquireAccess(
      { isMatch: true, region: "global", signals: [] },
      { page: emptyPage, providedSpaceId: "sp", providedToken: "tok", debug: true },
    );
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=spaceId value=sp source=provided-flag\n");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=tok source=provided-flag\n");
    spy.mockRestore();
  });

  it("logs the detected spaceId source and the sniffed token source", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await contentfulAdapter.acquireAccess(
      { isMatch: true, spaceId: "sp", spaceIdSource: "asset-host", region: "global", signals: [] },
      { page: pageWithToken, debug: true },
    );
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=spaceId value=sp source=asset-host\n");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=sniffedToken123 source=query-param\n");
    spy.mockRestore();
  });

  it("logs the token not-found line before throwing AccessError", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await expect(
      contentfulAdapter.acquireAccess(
        { isMatch: true, spaceId: "sp", spaceIdSource: "asset-host", region: "global", signals: [] },
        { page: emptyPage, debug: true },
      ),
    ).rejects.toBeInstanceOf(AccessError);
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=<none> source=not-found\n");
    spy.mockRestore();
  });

  it("writes nothing when debug is off", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await contentfulAdapter.acquireAccess(
      { isMatch: true, spaceId: "sp", spaceIdSource: "asset-host", region: "global", signals: [] },
      { page: pageWithToken },
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
