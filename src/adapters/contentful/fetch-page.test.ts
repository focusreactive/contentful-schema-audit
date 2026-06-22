import { collectFetchedPage } from "./fetch-page.js";

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
