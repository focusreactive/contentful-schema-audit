import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import type { NormalizedModel } from "../model/index.js";
import type { SemanticAnalysis, SemanticAnalyzer } from "./types.js";
import { semanticOutputSchema } from "./schema.js";
import { toSemanticAnalysis } from "./mapper.js";
import { buildSemanticMessages } from "./prompt.js";

const DEFAULT_MODEL = "gpt-4.1-mini";

export function createAiSemanticAnalyzer(opts: { model?: string } = {}): SemanticAnalyzer {
  const modelName = opts.model ?? DEFAULT_MODEL;

  return {
    async analyze(model: NormalizedModel): Promise<SemanticAnalysis | undefined> {
      const { system, prompt } = buildSemanticMessages(model);

      try {
        const { object } = await generateObject({
          model: openai(modelName),
          schema: semanticOutputSchema,
          temperature: 0,
          system,
          prompt,
        });
        return toSemanticAnalysis(object, modelName);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Semantic analysis unavailable, scoring without it: ${message}`);
        return undefined;
      }
    },
  };
}
