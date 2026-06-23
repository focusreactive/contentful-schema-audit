import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { Narration, NarrationInput, Narrator } from "./narrator.js";
import { buildNarrationMessages } from "./prompt.js";

const DEFAULT_MODEL = "gpt-4.1-mini";

export const narrationSchema = z.object({
  overall: z.string(),
  dimensions: z.array(z.object({ id: z.string(), narration: z.string() })),
  findings: z.array(z.object({ id: z.string(), impact: z.string(), fix: z.string() })),
});

export function createAiNarrator(opts: { model?: string } = {}): Narrator {
  return {
    async narrate(input: NarrationInput): Promise<Narration | undefined> {
      const { system, prompt } = buildNarrationMessages(input);

      try {
        const { object } = await generateObject({
          model: openai(opts.model ?? DEFAULT_MODEL),
          schema: narrationSchema,
          system,
          prompt,
        });

        return {
          overall: object.overall,
          dimensions: Object.fromEntries(object.dimensions.map((d) => [d.id, d.narration])) as Narration["dimensions"],
          findings: Object.fromEntries(object.findings.map((f) => [f.id, { impact: f.impact, fix: f.fix }])),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        console.warn(`AI narration unavailable, returning deterministic result only: ${message}`);

        return undefined;
      }
    },
  };
}
