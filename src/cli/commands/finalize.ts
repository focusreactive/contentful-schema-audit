import type { ValidationResult } from "../../core/result.js";
import { readStateFile } from "../../core/artifacts/state.js";
import { readScoredFile } from "../../core/artifacts/scored-file.js";
import { readNarrationFile, toNarration } from "../../core/artifacts/narration-file.js";

export interface FinalizeArgs {
  workDir: string;
  narration: boolean;
  includeModel: boolean;
  includeRawSchema: boolean;
}

export interface FinalizeDeps {
  now: () => string;
}

export async function runFinalize(args: FinalizeArgs, deps: FinalizeDeps): Promise<ValidationResult> {
  const state = await readStateFile(args.workDir);
  const scored = await readScoredFile(args.workDir);

  const narrationFile = args.narration ? await readNarrationFile(args.workDir, scored.narrationInput) : undefined;

  return {
    source: {
      url: state.source.url,
      cms: state.source.cms,
      spaceId: state.source.spaceId,
      environment: state.source.environment,
      acquisition: state.source.acquisition,
    },
    overall: scored.overall,
    dimensions: scored.dimensions,
    narration: narrationFile ? toNarration(narrationFile) : undefined,
    model: args.includeModel ? state.model : undefined,
    rawSchema: args.includeRawSchema ? state.rawSchema : undefined,
    generatedAt: deps.now(),
  };
}
