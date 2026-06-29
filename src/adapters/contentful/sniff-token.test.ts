import { sniffToken } from "./sniff-token.js";
import type { FetchedPage } from "../../core/adapter.js";

function page(partial: Partial<FetchedPage>): FetchedPage {
  return { url: "x", finalUrl: "x", html: "", scripts: [], requests: [], ...partial };
}

describe("sniffToken", () => {
  it("lifts the access_token query param from a CDA request", () => {
    const result = sniffToken(page({
      requests: [{ url: "https://cdn.contentful.com/spaces/x/entries?access_token=ABC123token_value", method: "GET", headers: {} }],
    }));
    expect(result.token).toBe("ABC123token_value");
    expect(result.region).toBe("global");
  });

  it("lifts a bearer token from an Authorization header on an EU host", () => {
    const result = sniffToken(page({
      requests: [{ url: "https://cdn.eu.contentful.com/spaces/x/entries", method: "GET", headers: { authorization: "Bearer EUtoken_value_123" } }],
    }));
    expect(result.token).toBe("EUtoken_value_123");
    expect(result.region).toBe("eu");
  });

  it("returns no token when nothing matches", () => {
    expect(sniffToken(page({ html: "<p>hello</p>" })).token).toBeUndefined();
  });

  it("reports query-param as the source", () => {
    const result = sniffToken(page({
      requests: [{ url: "https://cdn.contentful.com/spaces/x/entries?access_token=ABC123token_value", method: "GET", headers: {} }],
    }));
    expect(result.source).toBe("query-param");
  });

  it("reports bearer-header as the source", () => {
    const result = sniffToken(page({
      requests: [{ url: "https://cdn.eu.contentful.com/spaces/x/entries", method: "GET", headers: { authorization: "Bearer EUtoken_value_123" } }],
    }));
    expect(result.source).toBe("bearer-header");
  });

  it("reports page-body as the source when the token is inline", () => {
    const result = sniffToken(page({ html: "<script>fetch('?access_token=inlineToken123')</script>" }));
    expect(result.token).toBe("inlineToken123");
    expect(result.source).toBe("page-body");
  });

  it("returns no source when nothing matches", () => {
    expect(sniffToken(page({ html: "<p>hello</p>" })).source).toBeUndefined();
  });
});
