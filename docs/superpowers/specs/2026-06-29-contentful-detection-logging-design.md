# Contentful detection logging — design

## Goal

Add opt-in, single-format logging that reports how the Contentful adapter
obtained the two credentials it needs to audit a space: the **spaceId** and the
**delivery access token**. Each log line must state both the value and *how it
was received* (the source). This replaces the scattered, insecure ad-hoc
`console.log` debug lines currently in `sniff-token.ts`.

This is an observability change only. It does not alter detection logic, the
acquisition decision flow, or the JSON/Markdown report output.

## Trigger

Logging is **off by default** and enabled with a `--debug` CLI flag. Lines are
written to **stderr** so they never mix with the JSON/pretty report on stdout.

## Log format

One line per value, all the same shape:

```
[contentful] detect field=<field> value=<value> source=<source>
```

Examples:

```
[contentful] detect field=spaceId value=abc123xyz source=asset-host
[contentful] detect field=token value=CFPAT-9f2...full-token... source=query-param
[contentful] detect field=token value=<none> source=not-found
```

- `value` carries the **full token** verbatim (explicit user choice; acceptable
  because it only appears under the opt-in `--debug` flag). The `spaceId` is not
  secret and is logged in full.
- When a value cannot be found, a line is still emitted with `value=<none>` and
  `source=not-found` — the primary diagnostic for "why did detection fail?".
- Region is intentionally **not** logged; only `spaceId` and `token` are in scope.

## Source vocabulary ("how it was received")

**spaceId**
- `provided-flag` — supplied via `--space-id`
- `asset-host` — matched a `*.ctfassets.net` asset URL
- `api-host` — matched a `cdn`/`preview`.contentful.com API URL
- `not-found` — no spaceId determined

**token**
- `provided-flag` — supplied via `--token`
- `query-param` — found in an `?access_token=` query parameter
- `bearer-header` — found in an `Authorization: Bearer` request header
- `page-body` — found in the page HTML or an inline script
- `not-found` — no token determined

## Components

### `logDetection` helper (new)

A single small function owns the line template and the verbose gate, so the
"one format" requirement is enforced in exactly one place.

```
logDetection(debug: boolean, field: string, value: string | undefined, source: string): void
```

- No-ops when `debug` is false.
- Renders `value=<none>` when `value` is undefined/empty.
- Writes one line to `process.stderr`.

Lives in the Contentful adapter folder (the field/source vocabulary is
Contentful-specific). Suggested path: `src/adapters/contentful/log.ts`.

### `detect.ts` (change)

`detectContentful` returns a structured `spaceIdSource` (`"asset-host"` or
`"api-host"`) alongside the existing `spaceId`/`region`/`signals`. The existing
human-readable `signals` strings are unchanged.

### `sniff-token.ts` (change)

`sniffToken` returns a `source` field (`"query-param" | "bearer-header" |
"page-body"`) alongside `token`/`region`. The three ad-hoc
`console.log("paramMatch"/"bearerMatch"/"paramInBody", …)` lines are **removed**;
the source is now carried in the return value instead of logged inline.

### `index.ts › acquireAccess` (change — single log site)

`acquireAccess` is the one place that knows everything:
- whether `spaceId` came from `--space-id` (`provided-flag`) or from
  `detect.spaceIdSource`;
- whether `token` came from `--token` (`provided-flag`) or from the `source`
  returned by its own `sniffToken` call (or `not-found`).

It emits exactly the spaceId line and the token line via `logDetection`, gated on
`opts.debug`. No other file logs detection.

### `adapter.ts` (change — interfaces)

- `DetectResult` gains `spaceIdSource?: SpaceIdSource`.
- `AcquireOpts` gains `debug?: boolean`.
- `sniffToken` return type gains `source?: TokenSource`.

### `run.ts` + `parse-args.ts` (change — plumbing)

- `parse-args.ts` adds a `--debug` option ("print detection diagnostics to stderr").
- `RunArgs` gains `debug: boolean`.
- `run` passes `debug` into the `acquireAccess` opts.

## Data flow

```
parse-args (--debug) ─▶ RunArgs.debug
                              │
run() ─▶ adapter.detect(page) ─▶ DetectResult { spaceId, spaceIdSource }
   │                                      │
   └─▶ adapter.acquireAccess(detect, { ..., debug })
              │
              ├─ spaceId: provided-flag | detect.spaceIdSource | not-found
              │     └─▶ logDetection(debug, "spaceId", value, source) ─▶ stderr
              │
              └─ token: provided-flag | sniffToken().source | not-found
                    └─▶ logDetection(debug, "token", value, source) ─▶ stderr
```

## Error handling

No new error paths. When acquisition throws (no spaceId / no token), the
`not-found` log line is emitted *before* the existing `AccessError` is thrown, so
`--debug` runs still show what was searched.

## Testing

- `sniff-token.test.ts`: assert the returned `source` for each path
  (`query-param`, `bearer-header`, `page-body`, and absent → no source/token).
- `detect.test.ts`: assert `spaceIdSource` is `asset-host` vs `api-host`.
- `logDetection`: unit-test that it no-ops when `debug` is false, renders
  `value=<none>` for missing values, and produces the exact line format.
- Verify no `console.log` debug lines remain in `sniff-token.ts`.
