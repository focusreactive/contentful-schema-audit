import { run } from "./run.js";
import { contentfulAdapter } from "../adapters/contentful/index.js";
import { nullNarrator } from "../core/narration/null-narrator.js";
import { nullSemanticAnalyzer } from "../core/semantic/null-analyzer.js";
import { model, type, semantic } from "../../test/fixtures/models/factories.js";
import type { CmsAdapter, FetchedPage } from "../core/adapter.js";
import type { SemanticAnalyzer } from "../core/semantic/types.js";

const fetchedPage: FetchedPage = { url: "https://site.com", finalUrl: "https://site.com", html: "", scripts: [], requests: [] };

const stubAdapter: CmsAdapter = {
  id: "contentful",
  detect: () => ({ isMatch: true, spaceId: "sp", region: "global", signals: [] }),
  acquireAccess: async () => ({ spaceId: "sp", environment: "master", deliveryToken: "t", region: "global", acquisition: "provided" }),
  fetchModel: async () => model({ contentTypes: [type({ id: "article", fields: [] })] }),
  capabilities: () => contentfulAdapter.capabilities(),
};

const deps = { fetchPage: async () => fetchedPage, adapter: stubAdapter, narrator: nullNarrator, analyzer: nullSemanticAnalyzer, now: () => "2026-06-22T00:00:00Z" };

describe("run", () => {
  it("scores without semantic dimensions when ai is off", async () => {
    const result = await run({ url: "https://site.com", ai: false, includeModel: false }, deps);
    expect(result.dimensions.find((d) => d.id === "seo")?.state).toBe("not_assessable");
  });

  it("uses the analyzer when ai is on", async () => {
    const analyzer: SemanticAnalyzer = {
      analyze: async () => semantic({ roleMap: { types: { article: [{ role: "page", confidence: 0.9 }] }, fields: {} } }),
    };
    const result = await run({ url: "https://site.com", ai: true, includeModel: false }, { ...deps, analyzer });
    expect(result.dimensions.find((d) => d.id === "seo")?.state).not.toBe("not_assessable");
  });

  it("throws when no url and no space-id are given", async () => {
    await expect(run({ ai: false, includeModel: false }, deps)).rejects.toThrow(/url or --space-id/i);
  });
});
