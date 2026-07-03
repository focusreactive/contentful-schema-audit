---
name: validate-cms
description: Audit a Contentful content model with AI semantic analysis and narration. Use when asked to validate, audit, or health-check a CMS schema / Contentful space, or when the user invokes /validate-cms with a URL or --space-id/--token.
---

# validate-cms

Run the cms-schema-validator pipeline. The CLI does all deterministic work
and tells you exactly what to do at each step — follow its briefs.

## Command runner

All commands run from the repo root as:

    pnpm exec tsx src/cli/index.ts <subcommand> [flags]

## Flag routing

From the user's request, split flags into:

- Acquisition (go to `digest`): the URL argument, --space-id, --token,
  --environment, --region, --debug
- Presentation (hold until `finalize`): --json, --out, --report,
  --include-model, --include-raw-schema

Presentation semantics: the Markdown report is always written to a file
(default `detected-schemas/{domain}/{domain}.md`; space ID replaces the
domain when there is no URL). --json additionally writes the JSON result.
--report/--json take an optional bare file name; --out sets the folder.

## Pipeline

1. `digest <url|--space-id X --token Y> [acquisition flags]`
   Prints a brief. Follow it exactly: produce the classification JSON and
   Write it to the exact path in "## Write to". Fill `model` with your own
   model id.
2. `score --work-dir <dir>` (the dir is named in the brief's "## Next")
   Prints the narration brief. Follow it the same way.
3. `finalize --work-dir <dir> [presentation flags]`
   Writes the report file(s) and prints their paths.
4. Tell the user the written file paths, exactly as the CLI printed them.
   Never paste the report content into the chat.

## Retry contract (exit code 2)

Exit 2 means YOUR file was rejected. stderr lists numbered issues.
Fix the file per the issues and rerun the same command. At most 2 fixes
per phase; after that, fall back and tell the user which AI layer was
skipped and why:

- `score --work-dir <dir> --no-semantic`
- `finalize --work-dir <dir> --no-narration`

A persisted copy of each brief lives in the work dir
(brief-semantic.md / brief-narration.md) if the printed one has scrolled
out of context.

## Troubleshooting (exit code 1)

- "No Contentful detected" / "No Contentful space id detected": ask the
  user for --space-id and --token.
- "Could not find a valid Contentful delivery token": ask the user for
  --token (read-only CDA token).
- Playwright/browser errors in URL mode: run
  `pnpm exec playwright install chromium`, then retry, or ask for
  --space-id/--token to skip the browser entirely.
- "schema version ... Re-run": start over from `digest`.

Never write the delivery token into any file. Do not edit state.json or
scored.json — they are CLI-owned.
