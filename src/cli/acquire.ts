import type { Access, CmsAdapter, FetchedModel, FetchedPage } from "../core/adapter.js";

export interface AcquireArgs {
  url?: string;
  token?: string;
  spaceId?: string;
  environment?: string;
  region?: "global" | "eu";
  debug?: boolean;
}

export interface AcquireDeps {
  fetchPage: (url: string) => Promise<FetchedPage>;
  adapter: CmsAdapter;
}

export interface AcquiredModel {
  access: Access;
  fetched: FetchedModel;
}

const EMPTY_PAGE: FetchedPage = {
  url: "",
  finalUrl: "",
  html: "",
  scripts: [],
  requests: [],
  responseBodies: [],
  cookies: [],
  storage: {
    local: {},
    session: {},
  },
};

export async function acquireModel(args: AcquireArgs, deps: AcquireDeps): Promise<AcquiredModel> {
  if (!args.url && !args.spaceId) {
    throw new Error("Provide a url or --space-id to audit.");
  }

  const page = args.url ? await deps.fetchPage(args.url) : EMPTY_PAGE;
  const detect =
    args.url ? deps.adapter.detect(page) : { isMatch: true, spaceId: args.spaceId, region: args.region, signals: [] };

  if (args.url && !detect.isMatch && !args.spaceId) {
    throw new Error("No Contentful detected on this site. If you know the space, pass --space-id and --token.");
  }

  const access = await deps.adapter.acquireAccess(detect, {
    page,
    providedToken: args.token,
    providedSpaceId: args.spaceId,
    environment: args.environment,
    region: args.region,
    debug: args.debug,
  });

  const fetched = await deps.adapter.fetchModel(access);

  return { access, fetched };
}
