import { join } from "node:path";
import type { OutputFlags } from "./parse-args.js";

export interface OutputTargets {
  reportPath: string;
  jsonPath?: string;
}

const DEFAULT_ROOT = "detected-schemas";

function deriveName(source: { url?: string; spaceId: string }): string {
  if (!source.url) return source.spaceId;

  const withProtocol = source.url.includes("://") ? source.url : `https://${source.url}`;
  return new URL(withProtocol).hostname.replace(/^www\./, "");
}

function toFileName(value: string | true | undefined, fallback: string, flag: string, extension: string): string {
  const base = typeof value === "string" ? value : fallback;

  if (base.includes("/") || base.includes("\\")) {
    throw new Error(`${flag} expects a bare file name (got "${base}"); use --out to choose the folder.`);
  }

  return base.endsWith(extension) ? base : `${base}${extension}`;
}

export function resolveOutputTargets(flags: OutputFlags, source: { url?: string; spaceId: string }): OutputTargets {
  const name = deriveName(source);
  const dir = flags.out ?? join(DEFAULT_ROOT, name);
  const reportPath = join(dir, toFileName(flags.report, name, "--report", ".md"));

  if (!flags.json) return { reportPath };

  return { reportPath, jsonPath: join(dir, toFileName(flags.json, name, "--json", ".json")) };
}
