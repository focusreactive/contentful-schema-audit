import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { CmsId, NormalizedModel } from "../model/index.js";
import type { RawSchema } from "../adapter.js";
import type { SemanticDigest } from "../semantic/digest.js";

export const STATE_SCHEMA_VERSION = 1;
export const STATE_FILE = "state.json";

export interface StateSource {
  url?: string;
  cms: CmsId;
  spaceId: string;
  environment: string;
  region: "global" | "eu";
  acquisition: "sniffed" | "provided";
}

export interface StateFile {
  schemaVersion: typeof STATE_SCHEMA_VERSION;
  source: StateSource;
  model: NormalizedModel;
  rawSchema: RawSchema;
  digest: SemanticDigest;
}

const isRecord = (value: unknown): boolean => typeof value === "object" && value !== null;

const stateFileSchema = z.object({
  schemaVersion: z.literal(STATE_SCHEMA_VERSION),
  source: z.object({
    url: z.string().optional(),
    cms: z.enum(["contentful", "sanity"]),
    spaceId: z.string(),
    environment: z.string(),
    region: z.enum(["global", "eu"]),
    acquisition: z.enum(["sniffed", "provided"]),
  }),
  model: z.custom<NormalizedModel>(isRecord),
  rawSchema: z.custom<RawSchema>(isRecord),
  digest: z.custom<SemanticDigest>(isRecord),
});

export function createWorkDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "cms-validate-"));
}

export async function writeStateFile(workDir: string, state: StateFile): Promise<void> {
  await writeFile(join(workDir, STATE_FILE), JSON.stringify(state, null, 2), "utf8");
}

export async function readStateFile(workDir: string): Promise<StateFile> {
  const path = join(workDir, STATE_FILE);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`No ${STATE_FILE} in ${workDir}. Run "cms-validate digest" first.`);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`${path} is not valid JSON. Re-run "cms-validate digest".`);
  }

  const version = isRecord(data) ? (data as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (version !== STATE_SCHEMA_VERSION) {
    throw new Error(
      `${path} has schema version ${String(version)}; this build expects ${STATE_SCHEMA_VERSION}. Re-run "cms-validate digest".`,
    );
  }

  const parsed = stateFileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `${path} is malformed (${parsed.error.issues[0]?.message ?? "unknown"}). Re-run "cms-validate digest".`,
    );
  }

  return parsed.data;
}
