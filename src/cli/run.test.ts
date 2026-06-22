import { run } from "./run.js";
import { contentfulAdapter } from "../adapters/contentful/index.js";
import { nullNarrator } from "../core/narration/null-narrator.js";
import { model, type } from "../../test/fixtures/models/factories.js";
import type { CmsAdapter, FetchedPage } from "../core/adapter.js";

const fetchedPage: FetchedPage = { url: "https://site.com", finalUrl: "https://site.com", html: "", scripts: [], requests: [] };

const stubAdapter: CmsAdapter = {
  id: "contentful",
  detect: () => ({ isMatch: true, spaceId: "sp", region: "global", signals: [] }),
  acquireAccess: async () => ({ spaceId: "sp", environment: "master", deliveryToken: "t", region: "global", acquisition: "provided" }),
  fetchModel: async () => model({ contentTypes: [type({ id: "article" })] }),
  capabilities: () => contentfulAdapter.capabilities(),
};

const deps = { fetchPage: async () => fetchedPage, adapter: stubAdapter, narrator: nullNarrator, now: () => "2026-06-22T00:00:00Z" };

describe("run", () => {
  it("produces a scored result with no narration when ai is off", async () => {
    const result = await run({ url: "https://site.com", ai: false, includeModel: false }, deps);
    expect(result.overall.scoredCount).toBeGreaterThan(0);
    expect(result.narration).toBeUndefined();
    expect(result.source.acquisition).toBe("provided");
    expect(result.generatedAt).toBe("2026-06-22T00:00:00Z");
  });

  it("omits the model unless includeModel is set", async () => {
    const result = await run({ url: "https://site.com", ai: false, includeModel: false }, deps);
    expect(result.model).toBeUndefined();
  });

  it("throws when no url and no space-id are given", async () => {
    await expect(run({ ai: false, includeModel: false }, deps)).rejects.toThrow(/url or --space-id/i);
  });
});
