import type { NarrationInput } from "./narrator.js";

const SYSTEM_PROMPT = [
  "You are a senior content-modeling consultant writing a CMS schema health report.",
  "Explain each finding's business and SEO impact in plain language, then give a concrete fix.",
  "Use ONLY the findings provided. Never invent fields, types, or numbers, and never contradict the scores.",
  "Be concise and specific.",
  "Write an `overall` summary of the whole report.",
  "Add one `dimensions` entry per dimension, reusing its `id`, with a one-line narration.",
  "Add one `findings` entry per failed check, reusing its `id`, with an `impact` and a `fix`.",
].join(" ");

interface NarrationMessagesResult {
  system: string;
  prompt: string;
}

export function buildNarrationMessages(input: NarrationInput): NarrationMessagesResult {
  return {
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(input, null, 2),
  };
}
