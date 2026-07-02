import { Command } from "commander";
import type { AcquireArgs } from "./acquire.js";
import type { DigestArgs } from "./commands/digest.js";
import type { FinalizeArgs } from "./commands/finalize.js";
import type { ScoreArgs } from "./commands/score.js";

export interface OutputFlags {
  json: boolean;
  out?: string;
  report?: string;
}

export interface BareCliArgs extends AcquireArgs, OutputFlags {
  includeModel: boolean;
  includeRawSchema: boolean;
}

export type ParsedCli =
  | { command: "bare"; args: BareCliArgs }
  | { command: "digest"; args: DigestArgs }
  | { command: "score"; args: ScoreArgs }
  | { command: "finalize"; args: FinalizeArgs & OutputFlags };

function toRegion(value: unknown): "global" | "eu" {
  return value === "eu" ? "eu" : "global";
}

function withAcquisitionFlags(command: Command): Command {
  return command
    .option("--token <token>", "CDA delivery token (fallback when sniffing fails)")
    .option("--space-id <id>", "skip detection; audit this space directly")
    .option("--environment <env>", "Contentful environment", "master")
    .option("--region <region>", "Contentful region (global|eu)", "global")
    .option("--debug", "print detection diagnostics (spaceId, token + source) to stderr");
}

function withPresentationFlags(command: Command): Command {
  return command
    .option("--json", "print JSON only")
    .option("--include-model", "embed the normalized model in the JSON")
    .option("--include-raw-schema", "embed the raw, un-normalized CMS schema in the JSON")
    .option("--out <file>", "write the JSON result to a file")
    .option("--report <file>", "write a Markdown report to a file");
}

function toAcquireArgs(url: string | undefined, opts: Record<string, unknown>): AcquireArgs {
  return {
    url,
    token: opts.token as string | undefined,
    spaceId: opts.spaceId as string | undefined,
    environment: opts.environment as string,
    region: toRegion(opts.region),
    debug: Boolean(opts.debug),
  };
}

function toOutputFlags(
  opts: Record<string, unknown>,
): OutputFlags & { includeModel: boolean; includeRawSchema: boolean } {
  return {
    json: Boolean(opts.json),
    out: opts.out as string | undefined,
    report: opts.report as string | undefined,
    includeModel: Boolean(opts.includeModel),
    includeRawSchema: Boolean(opts.includeRawSchema),
  };
}

export function parseArgs(argv: string[]): ParsedCli {
  let parsed: ParsedCli | undefined;
  const program = new Command();

  program.enablePositionalOptions().exitOverride().allowExcessArguments(false);

  withAcquisitionFlags(
    program
      .command("digest [url]")
      .description("fetch a content model, persist pipeline state, print the semantic brief"),
  )
    .option("--work-dir <dir>", "pipeline work directory (default: new temp dir)")
    .exitOverride()
    .allowExcessArguments(false)
    .action((url: string | undefined, opts: Record<string, unknown>) => {
      parsed = {
        command: "digest",
        args: { ...toAcquireArgs(url, opts), workDir: opts.workDir as string | undefined },
      };
    });

  program
    .command("score")
    .description("validate semantic.json, score the model, print the narration brief")
    .requiredOption("--work-dir <dir>", "pipeline work directory from digest")
    .option("--no-semantic", "score without AI semantic analysis")
    .exitOverride()
    .allowExcessArguments(false)
    .action((opts: Record<string, unknown>) => {
      parsed = { command: "score", args: { workDir: opts.workDir as string, semantic: opts.semantic !== false } };
    });

  withPresentationFlags(
    program
      .command("finalize")
      .description("validate narration.json and emit the final report")
      .requiredOption("--work-dir <dir>", "pipeline work directory from digest")
      .option("--no-narration", "finalize without AI narration"),
  )
    .exitOverride()
    .allowExcessArguments(false)
    .action((opts: Record<string, unknown>) => {
      parsed = {
        command: "finalize",
        args: {
          workDir: opts.workDir as string,
          narration: opts.narration !== false,
          ...toOutputFlags(opts),
        },
      };
    });

  withPresentationFlags(withAcquisitionFlags(program.argument("[url]", "public site URL to audit"))).action(
    (url: string | undefined, opts: Record<string, unknown>) => {
      parsed = {
        command: "bare",
        args: { ...toAcquireArgs(url, opts), ...toOutputFlags(opts) },
      };
    },
  );

  program.parse(argv);
  if (!parsed) throw new Error("No command parsed.");

  return parsed;
}
