import { fetchContentTypes, PAGE_LIMIT, validateDeliveryToken } from "./cda-client.js";
import type { Access } from "../../core/adapter.js";

const access: Access = { spaceId: "x", environment: "master", deliveryToken: "t", region: "global", acquisition: "provided" };

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("fetchContentTypes", () => {
  it("paginates until all items are collected", async () => {
    const page1Items = Array.from({ length: PAGE_LIMIT }, (_, i) => ({ sys: { id: `a${i}` }, name: "A", fields: [] }));
    const page2Items = [{ sys: { id: "b" }, name: "B", fields: [] }];
    const pages = [
      { items: page1Items },
      { items: page2Items },
    ];
    let call = 0;
    const fetch = vi.fn(async () => jsonResponse(pages[call++]));
    const result = await fetchContentTypes(access, { fetch });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(PAGE_LIMIT + 1);
    expect(result.at(-1)?.sys.id).toBe("b");
  });

  it("throws a typed error on a 401", async () => {
    const fetch = vi.fn(async () => new Response("nope", { status: 401 }));
    await expect(fetchContentTypes(access, { fetch })).rejects.toThrow(/401/);
  });
});

describe("validateDeliveryToken", () => {
  it("returns true on a 200 and hits the regional space root with the token", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    const ok = await validateDeliveryToken("sp", "eu", "tok123456789", { fetch });
    expect(ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith("https://cdn.eu.contentful.com/spaces/sp?access_token=tok123456789");
  });

  it("returns false on a non-2xx", async () => {
    const fetch = vi.fn(async () => new Response("nope", { status: 401 }));
    expect(await validateDeliveryToken("sp", "global", "bad", { fetch })).toBe(false);
  });
});
