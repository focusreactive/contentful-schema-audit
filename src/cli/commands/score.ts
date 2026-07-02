import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { contentfulAdapter } from "../../adapters/contentful/index.js";
import { readStateFile } from "../../core/artifacts/state.js";
import { readSemanticFile } from "../../core/artifacts/semantic-file.js";
import { SCORED_SCHEMA_VERSION, writeScoredFile } from "../../core/artifacts/scored-file.js";
import { toSemanticAnalysis } from "../../core/semantic/mapper.js";
import { scoreModel } from "../../core/scoring.js";
import { toNarrationInput } from "../../core/narration/input.js";
import { renderNarrationBrief } from "../../core/briefs/narration-brief.js";

export const NARRATION_BRIEF_FILE = "brief-narration.md";

export interface ScoreArgs {
  workDir: string;
  semantic: boolean;
}

export interface ScoreResult {
  brief: string;
}

export async function runScore(args: ScoreArgs): Promise<ScoreResult> {
  const state = await readStateFile(args.workDir);

  const semanticFile = args.semantic ? await readSemanticFile(args.workDir, state.digest) : undefined;
  const semantic = semanticFile ? toSemanticAnalysis(semanticFile, semanticFile.model) : undefined;

  const { overall, dimensions } = scoreModel(state.model, contentfulAdapter.capabilities(), semantic);
  const narrationInput = toNarrationInput(overall, dimensions);

  await writeScoredFile(args.workDir, {
    schemaVersion: SCORED_SCHEMA_VERSION,
    overall,
    dimensions,
    semantic: semanticFile ? { model: semanticFile.model } : null,
    narrationInput,
  });

  const brief = renderNarrationBrief({ narrationInput, workDir: args.workDir });
  await writeFile(join(args.workDir, NARRATION_BRIEF_FILE), brief, "utf8");

  return { brief };
}
