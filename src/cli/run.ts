import type { ValidationResult } from "../core/result.js";
import { scoreModel } from "../core/scoring.js";
import { acquireModel, type AcquireArgs, type AcquireDeps } from "./acquire.js";

export interface RunArgs extends AcquireArgs {
  includeModel: boolean;
  includeRawSchema: boolean;
}

export interface RunDeps extends AcquireDeps {
  now: () => string;
}

export async function run(args: RunArgs, deps: RunDeps): Promise<ValidationResult> {
  const { access, fetched } = await acquireModel(args, deps);
  const { overall, dimensions } = scoreModel(fetched.model, deps.adapter.capabilities(), undefined);

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
    narration: undefined,
    model: args.includeModel ? fetched.model : undefined,
    rawSchema: args.includeRawSchema ? fetched.rawSchema : undefined,
    generatedAt: deps.now(),
  };
}
