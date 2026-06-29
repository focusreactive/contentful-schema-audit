import { collectFetchedPage, fetchPage } from "./fetch-page.js";

const launch = vi.fn();
vi.mock("playwright", () => ({ chromium: { launch: () => launch() } }));

describe("collectFetchedPage", () => {
  it("assembles html, scripts and observed requests", async () => {
    const observed = [
      { url: "https://cdn.contentful.com/spaces/x/entries?access_token=tok123456", method: "GET", headers: {} },
    ];
    const fakePage = {
      url: () => "https://site.com/final",
      content: async () => "<html><img src='//images.ctfassets.net/sp/a/b/c.png'></html>",
    };
    const result = await collectFetchedPage("https://site.com", fakePage as never, observed, ["bundle.js contents"]);
    expect(result.finalUrl).toBe("https://site.com/final");
    expect(result.requests).toEqual(observed);
    expect(result.scripts).toEqual(["bundle.js contents"]);
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
