import { Command } from "commander";
import type { RunArgs } from "./run.js";

export interface CliArgs extends RunArgs {
  json: boolean;
  out?: string;
  report?: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const program = new Command();
  program
    .argument("[url]", "public site URL to audit")
    .option("--token <token>", "CDA delivery token (fallback when sniffing fails)")
    .option("--space-id <id>", "skip detection; audit this space directly")
    .option("--environment <env>", "Contentful environment", "master")
    .option("--region <region>", "Contentful region (global|eu)", "global")
    .option("--no-ai", "skip AI narration")
    .option("--json", "print JSON only")
    .option("--include-model", "embed the normalized model in the JSON")
    .option("--include-raw-schema", "embed the raw, un-normalized CMS schema in the JSON")
    .option("--debug", "print detection diagnostics (spaceId, token + source) to stderr")
    .option("--out <file>", "write the JSON result to a file")
    .option("--report <file>", "write a Markdown report to a file")
    .allowExcessArguments(false);

  program.parse(argv);
  const opts = program.opts();
  const [url] = program.args;

  return {
    url,
    token: opts.token,
    spaceId: opts.spaceId,
    environment: opts.environment,
    region: opts.region === "eu" ? "eu" : "global",
    ai: opts.ai !== false,
    includeModel: Boolean(opts.includeModel),
    includeRawSchema: Boolean(opts.includeRawSchema),
    debug: Boolean(opts.debug),
    json: Boolean(opts.json),
    out: opts.out,
    report: opts.report,
  };
}
