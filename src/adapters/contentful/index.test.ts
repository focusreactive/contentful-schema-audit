import { contentfulAdapter, AccessError } from "./index.js";
import type { DetectResult, FetchedPage } from "../../core/adapter.js";

function page(partial: Partial<FetchedPage>): FetchedPage {
  return {
    url: "x",
    finalUrl: "x",
    html: "",
    scripts: [],
    requests: [],
    responseBodies: [],
    cookies: [],
    storage: { local: {}, session: {} },
    ...partial,
  };
}

const emptyPage = page({});
const detected: DetectResult = { isMatch: true, spaceId: "sp", region: "global", signals: [] };
const okFetch = () => vi.fn(async () => new Response(null, { status: 200 }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("contentfulAdapter.acquireAccess", () => {
  it("prefers a provided token and marks acquisition provided", async () => {
    const access = await contentfulAdapter.acquireAccess(detected, { page: emptyPage, providedToken: "tok" });
    expect(access).toMatchObject({ spaceId: "sp", deliveryToken: "tok", acquisition: "provided", environment: "master" });
  });

  it("throws AccessError when no token can be resolved", async () => {
    await expect(contentfulAdapter.acquireAccess(detected, { page: emptyPage })).rejects.toBeInstanceOf(AccessError);
  });

  it("returns the first sniffed candidate that validates against the CDA", async () => {
    vi.stubGlobal("fetch", okFetch());
    const pageWithToken = page({
      requests: [{ url: "https://cdn.contentful.com/spaces/sp/entries?access_token=sniffedToken123", method: "GET", headers: {} }],
    });
    const access = await contentfulAdapter.acquireAccess(detected, { page: pageWithToken });
    expect(access).toMatchObject({ deliveryToken: "sniffedToken123", acquisition: "sniffed", region: "global" });
  });

  it("skips a candidate the CDA rejects and tries the next", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const pageWithTwo = page({
      requests: [{ url: "https://cdn.contentful.com/spaces/sp/entries?access_token=badToken00001", method: "GET", headers: {} }],
      responseBodies: ['{"accessToken":"goodToken00002"}'],
    });
    const access = await contentfulAdapter.acquireAccess(detected, { page: pageWithTwo });
    expect(access).toMatchObject({ deliveryToken: "goodToken00002", acquisition: "sniffed" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws AccessError when no candidate validates", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    const pageWithToken = page({
      requests: [{ url: "https://cdn.contentful.com/spaces/sp/entries?access_token=badToken00001", method: "GET", headers: {} }],
    });
    await expect(contentfulAdapter.acquireAccess(detected, { page: pageWithToken })).rejects.toBeInstanceOf(AccessError);
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

  it("logs the detected spaceId source and the validated token source", async () => {
    vi.stubGlobal("fetch", okFetch());
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const pageWithToken = page({
      requests: [{ url: "https://cdn.contentful.com/spaces/sp/entries?access_token=sniffedToken123", method: "GET", headers: {} }],
    });
    await contentfulAdapter.acquireAccess(
      { isMatch: true, spaceId: "sp", spaceIdSource: "asset-host", region: "global", signals: [] },
      { page: pageWithToken, debug: true },
    );
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=spaceId value=sp source=asset-host\n");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=sniffedToken123 source=query-param\n");
    spy.mockRestore();
  });

  it("logs a truncation line when candidates exceed MAX_CANDIDATES", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const cookies = Array.from({ length: 26 }, (_, i) => ({ name: "access_token", value: `cookieTokenValue${i}` }));
    await expect(
      contentfulAdapter.acquireAccess(
        { isMatch: true, spaceId: "sp", region: "global", signals: [] },
        { page: page({ cookies }), debug: true },
      ),
    ).rejects.toBeInstanceOf(AccessError);
    expect(spy).toHaveBeenCalledWith("[contentful] token candidates truncated: 26 found, trying first 25\n");
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
    vi.stubGlobal("fetch", okFetch());
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const pageWithToken = page({
      requests: [{ url: "https://cdn.contentful.com/spaces/sp/entries?access_token=sniffedToken123", method: "GET", headers: {} }],
    });
    await contentfulAdapter.acquireAccess(
      { isMatch: true, spaceId: "sp", spaceIdSource: "asset-host", region: "global", signals: [] },
      { page: pageWithToken },
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
