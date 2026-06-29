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
    expect(result.spaceIdSource).toBe("asset-host");
  });

  it("detects the EU asset domain", () => {
    const result = detectContentful(page({ scripts: ["https://images.eu.ctfassets.net/euspace1234/a/b/c.jpg"] }));
    expect(result.region).toBe("eu");
    expect(result.spaceId).toBe("euspace1234");
    expect(result.spaceIdSource).toBe("asset-host");
  });

  it("extracts the space id from a Content Delivery API request", () => {
    const result = detectContentful(
      page({
        requests: [
          {
            url: "https://cdn.contentful.com/spaces/qlpjwgocwz50/environments/master/entries?content_type=media&limit=10",
            method: "GET",
            headers: {},
          },
        ],
      }),
    );
    expect(result.isMatch).toBe(true);
    expect(result.spaceId).toBe("qlpjwgocwz50");
    expect(result.region).toBe("global");
    expect(result.spaceIdSource).toBe("api-host");
  });

  it("detects the Content Preview API host", () => {
    const result = detectContentful(
      page({ scripts: ["fetch('https://preview.contentful.com/spaces/prev12345/environments/master/entries')"] }),
    );
    expect(result.isMatch).toBe(true);
    expect(result.spaceId).toBe("prev12345");
    expect(result.spaceIdSource).toBe("api-host");
  });

  it("returns no match when no Contentful host is present", () => {
    expect(detectContentful(page({ html: "<img src='/local.png'>" })).isMatch).toBe(false);
  });
});
