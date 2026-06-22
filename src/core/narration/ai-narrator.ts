import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { Narration, NarrationInput, Narrator } from "./narrator.js";
import { buildNarrationMessages } from "./prompt.js";

const DEFAULT_MODEL = "claude-opus-4-8";

const findingNarrationSchema = z.object({
  impact: z.string(),
  fix: z.string(),
});

export const narrationSchema = z.object({
  overall: z.string(),
  dimensions: z.record(z.string(), z.string()),
  findings: z.record(z.string(), findingNarrationSchema),
});

export function createAiNarrator(opts: { model?: string } = {}): Narrator {
  return {
    async narrate(input: NarrationInput): Promise<Narration | undefined> {
      const { system, prompt } = buildNarrationMessages(input);

      try {
        const { object } = await generateObject({
          model: anthropic(opts.model ?? DEFAULT_MODEL),
          schema: narrationSchema,
          system,
          prompt,
        });

        return object;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        console.warn(`AI narration unavailable, returning deterministic result only: ${message}`);

        return undefined;
      }
    },
  };
}
