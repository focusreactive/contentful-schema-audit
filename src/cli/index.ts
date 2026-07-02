#!/usr/bin/env node
import { parseArgs } from "./parse-args.js";
import { run } from "./run.js";
import { runDigest } from "./commands/digest.js";
import { runScore } from "./commands/score.js";
import { runFinalize } from "./commands/finalize.js";
import { emitResult } from "./emit-result.js";
import { AiInputError, EXIT_AI_INPUT, EXIT_OPERATIONAL } from "./exit-codes.js";
import { contentfulAdapter } from "../adapters/contentful/index.js";
import { fetchPage } from "../adapters/contentful/fetch-page.js";

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv);
  const acquireDeps = { fetchPage, adapter: contentfulAdapter };
  const now = (): string => new Date().toISOString();

  switch (parsed.command) {
    case "digest": {
      const { brief } = await runDigest(parsed.args, acquireDeps);
      process.stdout.write(`${brief}\n`);
      return;
    }
    case "score": {
      const { brief } = await runScore(parsed.args);
      process.stdout.write(`${brief}\n`);
      return;
    }
    case "finalize": {
      const result = await runFinalize(parsed.args, { now });
      await emitResult(result, parsed.args, { aiHint: false });
      return;
    }
    case "bare": {
      const result = await run(parsed.args, { ...acquireDeps, now });
      await emitResult(result, parsed.args, { aiHint: !parsed.args.json });
      return;
    }
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);

  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = err instanceof AiInputError ? EXIT_AI_INPUT : EXIT_OPERATIONAL;
});
