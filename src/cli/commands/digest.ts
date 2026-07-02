import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { acquireModel, type AcquireArgs, type AcquireDeps } from "../acquire.js";
import { buildSemanticDigest } from "../../core/semantic/digest.js";
import { createWorkDir, STATE_SCHEMA_VERSION, writeStateFile } from "../../core/artifacts/state.js";
import { renderSemanticBrief } from "../../core/briefs/semantic-brief.js";

export const SEMANTIC_BRIEF_FILE = "brief-semantic.md";

export interface DigestArgs extends AcquireArgs {
  workDir?: string;
}

export interface DigestResult {
  workDir: string;
  brief: string;
}

async function ensureWorkDir(requested?: string): Promise<string> {
  if (!requested) return createWorkDir();

  await mkdir(requested, { recursive: true });
  return requested;
}

export async function runDigest(args: DigestArgs, deps: AcquireDeps): Promise<DigestResult> {
  const { access, fetched } = await acquireModel(args, deps);
  const digest = buildSemanticDigest(fetched.model);
  const workDir = await ensureWorkDir(args.workDir);

  await writeStateFile(workDir, {
    schemaVersion: STATE_SCHEMA_VERSION,
    source: {
      url: args.url,
      cms: deps.adapter.id,
      spaceId: access.spaceId,
      environment: access.environment,
      region: access.region,
      acquisition: access.acquisition,
    },
    model: fetched.model,
    rawSchema: fetched.rawSchema,
    digest,
  });

  const brief = renderSemanticBrief({ digest, workDir });
  await writeFile(join(workDir, SEMANTIC_BRIEF_FILE), brief, "utf8");

  return { workDir, brief };
}
