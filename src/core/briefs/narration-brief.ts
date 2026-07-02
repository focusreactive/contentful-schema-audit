import { join } from "node:path";
import { z } from "zod";
import type { NarrationInput } from "../narration/narrator.js";
import { NARRATION_FILE, narrationFileSchema } from "../artifacts/narration-file.js";
import { fence } from "./fence.js";

export function renderNarrationBrief(opts: { narrationInput: NarrationInput; workDir: string }): string {
  const outputPath = join(opts.workDir, NARRATION_FILE);
  const schema = z.toJSONSchema(narrationFileSchema);

  return `# Narration — CMS schema audit report

You are a senior content-modeling consultant. Below is a scored audit of a
Contentful content model. Write the prose layer, then save it as raw JSON
to the path in "Write to". Audience: an engineering lead and a
content/marketing operations lead reading the same report.

## Grounding rules (hard)
- Use ONLY the findings, scores, and evidence provided. Never invent
  fields, types, numbers, or percentages. Never contradict a score, band,
  or dimension state.
- Name concrete types/fields from the evidence (\`affectedTypes\`,
  \`evidenceSummary\`) whenever they exist.
- No filler ("it's important to note", "in today's digital landscape").
  Every sentence must carry information.

## What to write
- \`overall\`: 3–6 sentences, ≤120 words. Lead with the model's overall
  state, then the single biggest risk, then the most valuable next fix.
- \`dimensions\`: one entry per dimension listed in the data, reusing its
  \`id\`, one sentence each. For scored dimensions say what drives the
  score; for not_applicable / not_assessable restate the reason plainly.
- \`findings\`: one entry per failed check listed (exactly those), reusing
  its \`id\`:
  - \`impact\` — 1–2 sentences of concrete business, SEO, or editorial
    consequence of THIS failure in THIS model.
  - \`fix\` — one actionable instruction naming the Contentful mechanism
    (field validation, link restriction, content type change…), grounded
    in the provided fixHint and evidence.

## Output contract
Write RAW JSON — no markdown fences, no comments, no trailing commas —
matching this JSON Schema:
${fence(schema)}
Ids must match the provided dimension and check ids exactly — unknown or
missing ids are rejected (exit code 2). \`model\` = your model id string.

## Data
${fence(opts.narrationInput)}

## Write to
${outputPath}

## Next
cms-validate finalize --work-dir ${opts.workDir} [your output flags]
Exit 2 → fix ${NARRATION_FILE}, rerun (max 2 fixes; then
cms-validate finalize --work-dir ${opts.workDir} --no-narration).
`;
}
