import { writeFile } from "node:fs/promises";
import type { ValidationResult } from "../core/result.js";
import type { OutputFlags } from "./parse-args.js";
import { renderPretty } from "./pretty.js";
import { renderReport } from "./report/index.js";

export async function emitResult(
  result: ValidationResult,
  flags: OutputFlags,
  opts: { aiHint: boolean },
): Promise<void> {
  const json = JSON.stringify(result, null, 2);
  if (flags.out) await writeFile(flags.out, json, "utf8");
  if (flags.report) await writeFile(flags.report, renderReport(result), "utf8");
  if (flags.json) {
    process.stdout.write(`${json}\n`);
  } else {
    process.stdout.write(`${renderPretty(result, { aiHint: opts.aiHint })}\n`);

    if (!flags.out) process.stdout.write(`\n${json}\n`);
  }
}
