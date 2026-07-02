import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { DimensionResult, OverallGrade } from "../result.js";
import type { NarrationInput } from "../narration/narrator.js";

export const SCORED_SCHEMA_VERSION = 1;
export const SCORED_FILE = "scored.json";

export interface ScoredFile {
  schemaVersion: typeof SCORED_SCHEMA_VERSION;
  overall: OverallGrade;
  dimensions: DimensionResult[];
  semantic: { model: string } | null;
  narrationInput: NarrationInput;
}

const isRecord = (value: unknown): boolean => typeof value === "object" && value !== null;

const scoredFileSchema = z.object({
  schemaVersion: z.literal(SCORED_SCHEMA_VERSION),
  overall: z.custom<OverallGrade>(isRecord),
  dimensions: z.array(z.custom<DimensionResult>(isRecord)),
  semantic: z.union([z.object({ model: z.string().min(1) }), z.null()]),
  narrationInput: z.custom<NarrationInput>(isRecord),
});

export async function writeScoredFile(workDir: string, scored: ScoredFile): Promise<void> {
  await writeFile(join(workDir, SCORED_FILE), JSON.stringify(scored, null, 2), "utf8");
}

export async function readScoredFile(workDir: string): Promise<ScoredFile> {
  const path = join(workDir, SCORED_FILE);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`No ${SCORED_FILE} in ${workDir}. Run "cms-validate score" first.`);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`${path} is not valid JSON. Re-run "cms-validate score".`);
  }

  const version = isRecord(data) ? (data as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (version !== SCORED_SCHEMA_VERSION) {
    throw new Error(
      `${path} has schema version ${String(version)}; this build expects ${SCORED_SCHEMA_VERSION}. Re-run "cms-validate score".`,
    );
  }

  const parsed = scoredFileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `${path} is malformed (${parsed.error.issues[0]?.message ?? "unknown"}). Re-run "cms-validate score".`,
    );
  }

  return parsed.data;
}
