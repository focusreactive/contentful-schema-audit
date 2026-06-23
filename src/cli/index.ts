#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { parseArgs } from "./parse-args.js";
import { run } from "./run.js";
import { renderPretty } from "./pretty.js";
import { renderReport } from "./report.js";
import { contentfulAdapter } from "../adapters/contentful/index.js";
import { fetchPage } from "../adapters/contentful/fetch-page.js";
import { createAiNarrator } from "../core/narration/ai-narrator.js";
import { nullNarrator } from "../core/narration/null-narrator.js";
import { createAiSemanticAnalyzer } from "../core/semantic/ai-analyzer.js";
import { nullSemanticAnalyzer } from "../core/semantic/null-analyzer.js";

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  const result = await run(args, {
    fetchPage,
    adapter: contentfulAdapter,
    narrator: args.ai ? createAiNarrator() : nullNarrator,
    analyzer: args.ai ? createAiSemanticAnalyzer() : nullSemanticAnalyzer,
    now: () => new Date().toISOString(),
  });

  const json = JSON.stringify(result, null, 2);
  if (args.out) await writeFile(args.out, json, "utf8");
  if (args.report) await writeFile(args.report, renderReport(result), "utf8");
  if (args.json) {
    process.stdout.write(`${json}\n`);
  } else {
    process.stdout.write(`${renderPretty(result)}\n`);

    if (!args.out) process.stdout.write(`\n${json}\n`);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);

  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
