import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { AiInputError } from "../../cli/exit-codes.js";
import type { Narration, NarrationInput } from "../narration/narrator.js";
import { zodIssues } from "./issues.js";

export const NARRATION_FILE = "narration.json";

export const narrationFileSchema = z.object({
  overall: z.string().min(1),
  dimensions: z.array(
    z.object({
      id: z.string(),
      narration: z.string().min(1),
    }),
  ),
  findings: z.array(
    z.object({
      id: z.string(),
      impact: z.string().min(1),
      fix: z.string().min(1),
    }),
  ),
  model: z.string().min(1),
});

export type NarrationFile = z.infer<typeof narrationFileSchema>;

function idSetIssues(file: NarrationFile, input: NarrationInput): string[] {
  const issues: string[] = [];
  const dimensionIds = new Set<string>(input.dimensions.map((d) => d.id));
  const failedCheckIds = new Set(input.dimensions.flatMap((d) => d.failedChecks.map((c) => c.id)));

  for (const entry of file.dimensions) {
    if (!dimensionIds.has(entry.id)) issues.push(`unknown dimension id "${entry.id}"`);
  }
  for (const id of dimensionIds) {
    if (!file.dimensions.some((entry) => entry.id === id)) issues.push(`missing dimensions entry for id "${id}"`);
  }
  for (const entry of file.findings) {
    if (!failedCheckIds.has(entry.id)) issues.push(`unknown finding id "${entry.id}"`);
  }
  for (const id of failedCheckIds) {
    if (!file.findings.some((entry) => entry.id === id)) {
      issues.push(`missing findings entry for failed check "${id}"`);
    }
  }

  return issues;
}

export function validateNarrationData(
  data: unknown,
  input: NarrationInput,
): { file?: NarrationFile; issues: string[] } {
  const parsed = narrationFileSchema.safeParse(data);
  if (!parsed.success) return { issues: zodIssues(parsed.error) };

  const issues = idSetIssues(parsed.data, input);

  return issues.length > 0 ? { issues } : { file: parsed.data, issues: [] };
}

export function toNarration(file: NarrationFile): Narration {
  return {
    overall: file.overall,
    dimensions: Object.fromEntries(file.dimensions.map((d) => [d.id, d.narration])) as Narration["dimensions"],
    findings: Object.fromEntries(file.findings.map((f) => [f.id, { impact: f.impact, fix: f.fix }])),
  };
}

export async function readNarrationFile(workDir: string, input: NarrationInput): Promise<NarrationFile> {
  const path = join(workDir, NARRATION_FILE);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new AiInputError(NARRATION_FILE, [
      `expected file at ${path} — write it as instructed in ${join(workDir, "brief-narration.md")}`,
    ]);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new AiInputError(NARRATION_FILE, [
      `file is not valid JSON (${detail}) — write raw JSON with no markdown fences or comments`,
    ]);
  }

  const { file, issues } = validateNarrationData(data, input);
  if (!file) throw new AiInputError(NARRATION_FILE, issues);

  return file;
}
