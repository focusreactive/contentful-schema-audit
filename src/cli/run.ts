import type { CmsAdapter, FetchedPage } from "../core/adapter.js";
import type { Narrator } from "../core/narration/narrator.js";
import type { ValidationResult } from "../core/result.js";
import type { SemanticAnalyzer } from "../core/semantic/types.js";
import { scoreModel } from "../core/scoring.js";
import { toNarrationInput } from "../core/narration/input.js";

export interface RunArgs {
  url?: string;
  token?: string;
  spaceId?: string;
  environment?: string;
  region?: "global" | "eu";
  ai: boolean;
  includeModel: boolean;
  includeRawSchema: boolean;
  debug?: boolean;
}

export interface RunDeps {
  fetchPage: (url: string) => Promise<FetchedPage>;
  adapter: CmsAdapter;
  narrator: Narrator;
  analyzer: SemanticAnalyzer;
  now: () => string;
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

export async function run(args: RunArgs, deps: RunDeps): Promise<ValidationResult> {
  if (!args.url && !args.spaceId) {
    throw new Error("Provide a url or --space-id to audit.");
  }

  const page = args.url ? await deps.fetchPage(args.url) : { ...EMPTY_PAGE, url: "", finalUrl: "" };
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
  const model = fetched.model;
  const semantic = args.ai ? await deps.analyzer.analyze(model) : undefined;
  const { overall, dimensions } = scoreModel(model, deps.adapter.capabilities(), semantic);
  const narration = args.ai ? await deps.narrator.narrate(toNarrationInput(overall, dimensions)) : undefined;

  return {
    source: {
      url: args.url,
      cms: deps.adapter.id,
      spaceId: access.spaceId,
      environment: access.environment,
      acquisition: access.acquisition,
    },
    overall,
    dimensions,
    narration,
    model: args.includeModel ? model : undefined,
    rawSchema: args.includeRawSchema ? fetched.rawSchema : undefined,
    generatedAt: deps.now(),
  };
}
