import type { CmsAdapter, FetchedPage } from "../../src/core/adapter.js";
import { contentfulAdapter } from "../../src/adapters/contentful/index.js";
import { field, model, type } from "./models/factories.js";

export const fetchedPage: FetchedPage = {
  url: "https://site.com",
  finalUrl: "https://site.com",
  html: "",
  scripts: [],
  requests: [],
  responseBodies: [],
  cookies: [],
  storage: { local: {}, session: {} },
};

export function stubAdapter(overrides: Partial<CmsAdapter> = {}): CmsAdapter {
  return {
    id: "contentful",
    detect: () => ({ isMatch: true, spaceId: "space1", region: "global", signals: [] }),
    acquireAccess: async () => ({
      spaceId: "space1",
      environment: "master",
      deliveryToken: "secret-token",
      region: "global",
      acquisition: "provided",
    }),
    fetchModel: async () => ({
      model: model({
        contentTypes: [type({ id: "article", fields: [field({ id: "title" })] })],
      }),
      rawSchema: { contentTypes: [], locales: [] },
    }),
    capabilities: () => contentfulAdapter.capabilities(),
    ...overrides,
  };
}
