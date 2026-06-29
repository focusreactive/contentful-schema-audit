import { collectFetchedPage, fetchPage, isSniffableResponse } from "./fetch-page.js";

const launch = vi.fn();
vi.mock("playwright", () => ({ chromium: { launch: () => launch() } }));

describe("collectFetchedPage", () => {
  it("assembles html, scripts, requests, response bodies, cookies and storage", async () => {
    const observed = [
      { url: "https://cdn.contentful.com/spaces/x/entries?access_token=tok123456", method: "GET", headers: {} },
    ];
    const fakePage = {
      url: () => "https://site.com/final",
      content: async () => "<html><img src='//images.ctfassets.net/sp/a/b/c.png'></html>",
    };
    const result = await collectFetchedPage(
      "https://site.com",
      fakePage as never,
      observed,
      ["bundle.js contents"],
      ['{"accessToken":"x"}'],
      [{ name: "c", value: "v" }],
      { local: { k: "v" }, session: {} },
    );
    expect(result.finalUrl).toBe("https://site.com/final");
    expect(result.requests).toEqual(observed);
    expect(result.scripts).toEqual(["bundle.js contents"]);
    expect(result.responseBodies).toEqual(['{"accessToken":"x"}']);
    expect(result.cookies).toEqual([{ name: "c", value: "v" }]);
    expect(result.storage).toEqual({ local: { k: "v" }, session: {} });
    expect(result.html).toContain("ctfassets.net");
  });
});

describe("fetchPage", () => {
  it("captures the html before the finally block tears the browser down", async () => {
    // Regression: a bare `return collectFetchedPage(...)` let `finally` close the context
    // while page.content() was still pending, crashing with "Target page... has been closed".
    let closed = false;

    const page = {
      on: () => {},
      goto: async () => undefined,
      waitForLoadState: async () => undefined,
      evaluate: async () => ({ local: {}, session: {} }),
      url: () => "https://site.com/final",
      content: async () => {
        // Resolve on a later tick so a premature close() in `finally` would win the race.
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (closed) throw new Error("Target page, context or browser has been closed");
        return "<html>ok</html>";
      },
    };
    const context = {
      newPage: async () => page,
      cookies: async () => [],
      close: async () => {
        closed = true;
      },
    };
    launch.mockResolvedValue({
      newContext: async () => context,
      close: async () => {
        closed = true;
      },
    });

    const result = await fetchPage("https://site.com");
    expect(result.html).toBe("<html>ok</html>");
    expect(result.finalUrl).toBe("https://site.com/final");
  });
});

describe("isSniffableResponse", () => {
  it("accepts json and text xhr/fetch responses", () => {
    expect(isSniffableResponse("xhr", "application/json; charset=utf-8")).toBe(true);
    expect(isSniffableResponse("fetch", "text/plain")).toBe(true);
  });

  it("rejects non-xhr/fetch resource types", () => {
    expect(isSniffableResponse("image", "application/json")).toBe(false);
    expect(isSniffableResponse("document", "text/html")).toBe(false);
  });

  it("rejects binary and missing content types", () => {
    expect(isSniffableResponse("fetch", "image/png")).toBe(false);
    expect(isSniffableResponse("xhr", undefined)).toBe(false);
  });
});
