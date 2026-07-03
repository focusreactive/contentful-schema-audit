---
name: validate-cms
description: Audit a Contentful content model with AI semantic analysis and narration. Use when asked to validate, audit, or health-check a CMS schema / Contentful space, or when the user invokes /validate-cms with a URL or --space-id/--token.
---

# validate-cms

Run the cms-schema-validator pipeline. You are the ORCHESTRATOR: you never
run the pipeline commands or write the AI artifacts yourself. Every phase
is performed by a subagent you spawn with the Agent tool. Your job is to
route flags, spawn the three phases in order, and relay outcomes.

## Flag routing

From the user's request, split flags into:

- Acquisition (fill `{ACQUISITION_ARGS}` in phase 1): the URL argument,
  --space-id, --token, --environment, --region, --debug
- Presentation (fill `{PRESENTATION_FLAGS}` in phase 3): --json, --out,
  --report, --include-model, --include-raw-schema

Presentation semantics: the Markdown report is always written to a file
(default `detected-schemas/{domain}/{domain}.md`; space ID replaces the
domain when there is no URL). --json additionally writes the JSON result.
--report/--json take an optional bare file name; --out sets the folder.

## Orchestration

Spawn each phase with the Agent tool: `subagent_type: general-purpose`,
`run_in_background: false`, no model override. Fill the `{PLACEHOLDERS}`
in the prompt templates below and send them verbatim otherwise. Give the
user a one-line progress note between phases. Run phases strictly in
order: 1 → 2 → 3.

Handle each subagent's returned `status`:

- `ok` — continue to the next phase.
- `need-credentials` (phase 1) — ask the user for the missing flag(s)
  (--space-id and/or --token, a read-only CDA token), then spawn a fresh
  phase-1 subagent with them.
- `fallback` (phase 2/3) — continue the pipeline; in your final message
  tell the user which AI layer was skipped and why.
- `restart-required` (phase 2/3) — the work dir is stale. Restart the
  whole pipeline from phase 1, at most ONCE per run; if it recurs, stop
  and report failure.
- `failed` — stop and report the error class and message to the user.
- Subagent returned null / died — respawn the same phase once (the work
  dir and briefs survive on disk); if it dies again, stop and report.

When phase 3 returns `ok` or `fallback`, tell the user the written file
paths exactly as phase 3 returned them, plus any skipped AI layers.
Never paste report content into the chat.

## Phase 1 prompt — acquire

```
You are phase 1 (acquire) of the cms-schema-validator pipeline, running
from the repo root.

Run:

    pnpm exec tsx src/cli/index.ts digest {ACQUISITION_ARGS}

On success (exit 0) it prints a brief ending with a "## Next" line that
names `score --work-dir <dir>`. Do NOT follow the brief — producing the
classification JSON is phase 2's job, not yours. Your job ends when
digest exits 0.

On exit 1:
- Playwright/browser errors: run `pnpm exec playwright install chromium`,
  then retry digest once. If it still fails, return status
  need-credentials asking for --space-id and --token (skips the browser).
- "No Contentful detected" / "No Contentful space id detected": return
  status need-credentials naming --space-id and --token.
- "Could not find a valid Contentful delivery token": return status
  need-credentials naming --token (read-only CDA token).
- Anything else: return status failed.

Rules: never write the delivery token into any file, and never repeat
the token in your return message.

Return EXACTLY these lines and nothing else:
status: ok | need-credentials | failed
work-dir: <the dir from the "## Next" line, only when ok>
detail: <missing flag(s) or a one-line error, only when not ok>
```

## Phase 2 prompt — classify

```
You are phase 2 (classify) of the cms-schema-validator pipeline, running
from the repo root. The work dir is {WORK_DIR}.

Read {WORK_DIR}/brief-semantic.md and follow it exactly: produce the
classification JSON and Write it to the exact path in its "## Write to"
section. Fill `model` with your own model id.

Then run:

    pnpm exec tsx src/cli/index.ts score --work-dir {WORK_DIR}

On exit 2 your file was rejected; stderr lists numbered issues. Fix the
file per the issues and rerun the same command. At most 2 fixes; after
that run the fallback and return status fallback:

    pnpm exec tsx src/cli/index.ts score --work-dir {WORK_DIR} --no-semantic

On exit 1 with "schema version ... Re-run": return status
restart-required. Any other exit 1: return status failed.

Do NOT act on the narration brief that score prints on success — that is
phase 3's job. Do not edit state.json or scored.json — they are
CLI-owned.

Return EXACTLY these lines and nothing else:
status: ok | fallback | restart-required | failed
detail: <why the semantic layer was skipped / one-line error, only when not ok>
```

## Phase 3 prompt — narrate

```
You are phase 3 (narrate) of the cms-schema-validator pipeline, running
from the repo root. The work dir is {WORK_DIR}.

Read {WORK_DIR}/brief-narration.md and follow it exactly: write the
narration JSON to the path it names. Fill `model` with your own model id.

Then run:

    pnpm exec tsx src/cli/index.ts finalize --work-dir {WORK_DIR} {PRESENTATION_FLAGS}

On exit 2 your file was rejected; stderr lists numbered issues. Fix the
file per the issues and rerun the same command. At most 2 fixes; after
that run the fallback and return status fallback:

    pnpm exec tsx src/cli/index.ts finalize --work-dir {WORK_DIR} --no-narration {PRESENTATION_FLAGS}

On exit 1 with "schema version ... Re-run": return status
restart-required. Any other exit 1: return status failed.

On success finalize prints the written report file path(s). Do not edit
state.json or scored.json. Never include report content in your return.

Return EXACTLY these lines and nothing else:
status: ok | fallback | restart-required | failed
paths: <the written file paths exactly as finalize printed them, when ok or fallback>
detail: <why the narration layer was skipped / one-line error, only when not ok>
```
