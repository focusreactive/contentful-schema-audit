import { collectTokenCandidates, MAX_CANDIDATES } from "./sniff-token.js";
import type { FetchedPage } from "../../core/adapter.js";

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

describe("collectTokenCandidates", () => {
  it("lifts the access_token query param from a CDA request", () => {
    const [candidate] = collectTokenCandidates(page({
      requests: [{ url: "https://cdn.contentful.com/spaces/x/entries?access_token=ABC123token_value", method: "GET", headers: {} }],
    }));
    expect(candidate).toMatchObject({ token: "ABC123token_value", source: "query-param", region: "global" });
  });

  it("lifts a bearer token from an Authorization header on an EU host", () => {
    const [candidate] = collectTokenCandidates(page({
      requests: [{ url: "https://cdn.eu.contentful.com/spaces/x/entries", method: "GET", headers: { authorization: "Bearer EUtoken_value_123" } }],
    }));
    expect(candidate).toMatchObject({ token: "EUtoken_value_123", source: "bearer-header", region: "eu" });
  });

  it("lifts a token from a POST body", () => {
    const [candidate] = collectTokenCandidates(page({
      requests: [{ url: "https://graphql.contentful.com/content/v1/spaces/x", method: "POST", headers: {}, postData: '{"accessToken":"postBodyToken123"}' }],
    }));
    expect(candidate).toMatchObject({ token: "postBodyToken123", source: "post-body" });
  });

  it("lifts a token from a form-encoded POST body via the access_token param", () => {
    const [candidate] = collectTokenCandidates(page({
      requests: [{ url: "https://graphql.contentful.com/content/v1/spaces/x", method: "POST", headers: {}, postData: "foo=bar&access_token=postParamToken123" }],
    }));
    expect(candidate).toMatchObject({ token: "postParamToken123", source: "post-body" });
  });

  it("lifts a token from an XHR/fetch response body", () => {
    const [candidate] = collectTokenCandidates(page({
      responseBodies: ['{"contentful":{"deliveryToken":"responseToken123"}}'],
    }));
    expect(candidate).toMatchObject({ token: "responseToken123", source: "response-body" });
  });

  it("lifts tokens from localStorage and sessionStorage", () => {
    const candidates = collectTokenCandidates(page({
      storage: { local: { cfg: "access_token=localToken123" }, session: { s: "cdaToken=sessionToken99" } },
    }));
    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ token: "localToken123", source: "local-storage" }),
      expect.objectContaining({ token: "sessionToken99", source: "session-storage" }),
    ]));
  });

  it("lifts a token from a cookie value", () => {
    const [candidate] = collectTokenCandidates(page({
      cookies: [{ name: "cda_token", value: "cookieToken1234" }],
    }));
    expect(candidate).toMatchObject({ token: "cookieToken1234", source: "cookie" });
  });

  it("lifts an inline token from the page body", () => {
    const [candidate] = collectTokenCandidates(page({ html: "<script>fetch('?access_token=inlineToken123')</script>" }));
    expect(candidate).toMatchObject({ token: "inlineToken123", source: "page-body" });
  });

  it("orders candidates by source reliability", () => {
    const candidates = collectTokenCandidates(page({
      requests: [{ url: "https://cdn.contentful.com/spaces/x/entries?access_token=queryToken1234", method: "GET", headers: {} }],
      cookies: [{ name: "access_token", value: "cookieToken1234" }],
    }));
    expect(candidates.map((candidate) => candidate.source)).toEqual(["query-param", "cookie"]);
  });

  it("dedupes a repeated token value keeping the most reliable source", () => {
    const candidates = collectTokenCandidates(page({
      requests: [{ url: "https://cdn.contentful.com/spaces/x/entries?access_token=sharedToken123", method: "GET", headers: {} }],
      cookies: [{ name: "access_token", value: "sharedToken123" }],
    }));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ source: "query-param" });
  });

  it("returns nothing when no source matches", () => {
    expect(collectTokenCandidates(page({ html: "<p>hello</p>" }))).toEqual([]);
  });

  it("exposes a positive candidate cap", () => {
    expect(MAX_CANDIDATES).toBeGreaterThan(0);
  });
});
