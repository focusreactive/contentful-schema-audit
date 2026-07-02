import { describe, expect, it } from "vitest";
import { fetchedPage, stubAdapter } from "../../test/fixtures/cli.js";
import { run } from "./run.js";

const deps = { fetchPage: async () => fetchedPage, adapter: stubAdapter(), now: () => "2026-06-22T00:00:00Z" };

describe("run", () => {
  it("scores deterministically — semantic-gated dimensions are not assessable", async () => {
    const result = await run({ url: "https://site.com", includeModel: false, includeRawSchema: false }, deps);

    expect(result.dimensions.find((d) => d.id === "seo")?.state).toBe("not_assessable");
    expect(result.narration).toBeUndefined();
  });

  it("throws when no url and no space-id are given", async () => {
    await expect(run({ includeModel: false, includeRawSchema: false }, deps)).rejects.toThrow(/url or --space-id/i);
  });

  it("omits rawSchema by default and includes it when includeRawSchema is set", async () => {
    const without = await run({ url: "https://site.com", includeModel: false, includeRawSchema: false }, deps);
    expect(without.rawSchema).toBeUndefined();

    const withRaw = await run({ url: "https://site.com", includeModel: false, includeRawSchema: true }, deps);
    expect(withRaw.rawSchema).toEqual({ contentTypes: [], locales: [] });
  });

  it("emits rawSchema independently of includeModel", async () => {
    const result = await run({ url: "https://site.com", includeModel: false, includeRawSchema: true }, deps);

    expect(result.model).toBeUndefined();
    expect(result.rawSchema).toBeDefined();
  });
});
