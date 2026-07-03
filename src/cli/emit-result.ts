import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ValidationResult } from "../core/result.js";
import type { OutputFlags } from "./parse-args.js";
import { resolveOutputTargets } from "./output-paths.js";
import { renderReport } from "./report/index.js";

export async function emitResult(result: ValidationResult, flags: OutputFlags): Promise<void> {
  const { reportPath, jsonPath } = resolveOutputTargets(flags, result.source);

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderReport(result), "utf8");
  process.stdout.write(`Report written to ${reportPath}\n`);

  if (jsonPath) {
    await writeFile(jsonPath, JSON.stringify(result, null, 2), "utf8");
    process.stdout.write(`JSON written to ${jsonPath}\n`);
  }
}
