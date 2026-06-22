import { detectContentful } from "./detect.js";
import type { FetchedPage } from "../../core/adapter.js";

function page(partial: Partial<FetchedPage>): FetchedPage {
  return { url: "https://site.com", finalUrl: "https://site.com", html: "", scripts: [], requests: [], ...partial };
}

describe("detectContentful", () => {
  it("extracts the space id from a ctfassets asset URL", () => {
    const result = detectContentful(page({ html: '<img src="//images.ctfassets.net/yadj1kx9rmg0/abc/def/x.png">' }));
    expect(result.isMatch).toBe(true);
    expect(result.spaceId).toBe("yadj1kx9rmg0");
    expect(result.region).toBe("global");
  });

  it("detects the EU asset domain", () => {
    const result = detectContentful(page({ scripts: ["https://images.eu.ctfassets.net/euspace1234/a/b/c.jpg"] }));
    expect(result.region).toBe("eu");
    expect(result.spaceId).toBe("euspace1234");
  });

  it("returns no match when no ctfassets host is present", () => {
    expect(detectContentful(page({ html: "<img src='/local.png'>" })).isMatch).toBe(false);
  });
});
