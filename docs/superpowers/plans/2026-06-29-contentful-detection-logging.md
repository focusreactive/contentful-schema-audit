# Contentful Detection Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in `--debug` logging that reports how the Contentful adapter obtained the `spaceId` and delivery `token`, in one consistent stderr format.

**Architecture:** Detection functions (`detect.ts`, `sniff-token.ts`) return a structured `source` describing where each value came from. A single helper (`log.ts`) owns the line format and the debug gate. `acquireAccess` in `index.ts` is the one place that emits both log lines, since it alone knows provided-vs-discovered for both values. The `--debug` flag is threaded `parse-args → run → acquireAccess`.

**Tech Stack:** TypeScript (ESM, `.js` import specifiers), Vitest (globals enabled), Commander.

## Global Constraints

- ESM imports MUST use `.js` extensions (e.g. `import { logDetection } from "./log.js"`).
- Tests use Vitest globals (`describe`/`it`/`expect`/`vi`) — no test-framework imports needed.
- Log lines go to `process.stderr`, never stdout (stdout carries the JSON/pretty report).
- The token value is logged **in full** (explicit requirement); it only ever appears under `--debug`.
- Log line format is exactly: `[contentful] detect field=<field> value=<value> source=<source>\n`.
- Missing values render as `value=<none>`.
- Region is NOT logged — scope is `spaceId` and `token` only.
- Run `pnpm test` (Vitest) and `pnpm typecheck` to verify.

---

### Task 1: `logDetection` helper + source types

**Files:**
- Create: `src/adapters/contentful/log.ts`
- Test: `src/adapters/contentful/log.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type DetectionField = "spaceId" | "token"`
  - `type DetectionSource = "provided-flag" | "asset-host" | "api-host" | "query-param" | "bearer-header" | "page-body" | "not-found"`
  - `function logDetection(debug: boolean, field: DetectionField, value: string | undefined, source: DetectionSource): void`

- [ ] **Step 1: Write the failing test**

Create `src/adapters/contentful/log.test.ts`:

```ts
import { logDetection } from "./log.js";

describe("logDetection", () => {
  it("writes one line in the canonical format to stderr when debug is on", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logDetection(true, "spaceId", "abc123", "asset-host");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=spaceId value=abc123 source=asset-host\n");
    spy.mockRestore();
  });

  it("renders <none> when the value is missing", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logDetection(true, "token", undefined, "not-found");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=<none> source=not-found\n");
    spy.mockRestore();
  });

  it("renders <none> when the value is an empty string", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logDetection(true, "token", "", "not-found");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=<none> source=not-found\n");
    spy.mockRestore();
  });

  it("writes nothing when debug is off", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logDetection(false, "spaceId", "abc123", "asset-host");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/adapters/contentful/log.test.ts`
Expected: FAIL — `Failed to resolve import "./log.js"` / `logDetection is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/adapters/contentful/log.ts`:

```ts
export type DetectionField = "spaceId" | "token";

export type DetectionSource =
  | "provided-flag"
  | "asset-host"
  | "api-host"
  | "query-param"
  | "bearer-header"
  | "page-body"
  | "not-found";

export function logDetection(
  debug: boolean,
  field: DetectionField,
  value: string | undefined,
  source: DetectionSource,
): void {
  if (!debug) return;
  const rendered = value && value.length > 0 ? value : "<none>";
  process.stderr.write(`[contentful] detect field=${field} value=${rendered} source=${source}\n`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/adapters/contentful/log.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/adapters/contentful/log.ts src/adapters/contentful/log.test.ts
git commit -m "feat(contentful): add logDetection helper for single-format detection logs"
```

---

### Task 2: `sniffToken` returns its source (and stops logging inline)

**Files:**
- Modify: `src/adapters/contentful/sniff-token.ts`
- Modify: `src/adapters/contentful/sniff-token.test.ts`

**Interfaces:**
- Consumes: `TokenSource` shape (inline literal union, kept in this file's return type).
- Produces: `sniffToken(page: FetchedPage): { token?: string; region: "global" | "eu"; source?: "query-param" | "bearer-header" | "page-body" }`

- [ ] **Step 1: Add failing test assertions**

Append these tests inside the `describe("sniffToken", …)` block in `src/adapters/contentful/sniff-token.test.ts`:

```ts
  it("reports query-param as the source", () => {
    const result = sniffToken(page({
      requests: [{ url: "https://cdn.contentful.com/spaces/x/entries?access_token=ABC123token_value", method: "GET", headers: {} }],
    }));
    expect(result.source).toBe("query-param");
  });

  it("reports bearer-header as the source", () => {
    const result = sniffToken(page({
      requests: [{ url: "https://cdn.eu.contentful.com/spaces/x/entries", method: "GET", headers: { authorization: "Bearer EUtoken_value_123" } }],
    }));
    expect(result.source).toBe("bearer-header");
  });

  it("reports page-body as the source when the token is inline", () => {
    const result = sniffToken(page({ html: "<script>fetch('?access_token=inlineToken123')</script>" }));
    expect(result.token).toBe("inlineToken123");
    expect(result.source).toBe("page-body");
  });

  it("returns no source when nothing matches", () => {
    expect(sniffToken(page({ html: "<p>hello</p>" })).source).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/adapters/contentful/sniff-token.test.ts`
Expected: FAIL — `expected undefined to be "query-param"` (and the others), because `source` is not returned yet.

- [ ] **Step 3: Implement — return `source`, remove debug logs**

Replace the full contents of `src/adapters/contentful/sniff-token.ts` with:

```ts
import type { FetchedPage } from "../../core/adapter.js";

const CONTENTFUL_API_HOST_RE = /(?:cdn|graphql)(\.eu)?\.contentful\.com/i;
const CONTENTFUL_EU_HOST_RE = /\.eu\.contentful\.com/i;
const ACCESS_TOKEN_PARAM_RE = /[?&]access_token=([A-Za-z0-9_-]{10,})/;
const BEARER_RE = /Bearer\s+([A-Za-z0-9_-]{10,})/i;

export type TokenSource = "query-param" | "bearer-header" | "page-body";

export interface SniffResult {
  token?: string;
  region: "global" | "eu";
  source?: TokenSource;
}

function isApiRequest(url: string): boolean {
  return CONTENTFUL_API_HOST_RE.test(url);
}

export function sniffToken(page: FetchedPage): SniffResult {
  for (const request of page.requests) {
    if (!isApiRequest(request.url)) continue;

    const region = CONTENTFUL_EU_HOST_RE.test(request.url) ? "eu" : "global";
    const paramMatch = ACCESS_TOKEN_PARAM_RE.exec(request.url);

    if (paramMatch) {
      return { token: paramMatch[1], region, source: "query-param" };
    }

    const authHeader = request.headers.authorization ?? request.headers.Authorization;
    const bearerMatch = authHeader ? BEARER_RE.exec(authHeader) : null;

    if (bearerMatch) {
      return { token: bearerMatch[1], region, source: "bearer-header" };
    }
  }

  const body = [page.html, ...page.scripts].join("\n");
  const paramInBody = ACCESS_TOKEN_PARAM_RE.exec(body);

  if (paramInBody) {
    return { token: paramInBody[1], region: "global", source: "page-body" };
  }

  return { region: "global" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/adapters/contentful/sniff-token.test.ts`
Expected: PASS (all existing + 4 new tests).

- [ ] **Step 5: Confirm no debug logs remain**

Run: `grep -n "console.log" src/adapters/contentful/sniff-token.ts`
Expected: no output (exit non-zero / empty).

- [ ] **Step 6: Commit**

```bash
git add src/adapters/contentful/sniff-token.ts src/adapters/contentful/sniff-token.test.ts
git commit -m "refactor(contentful): return token source from sniffToken and drop ad-hoc debug logs"
```

---

### Task 3: `detectContentful` returns `spaceIdSource`

**Files:**
- Modify: `src/core/adapter.ts:18-23` (the `DetectResult` interface)
- Modify: `src/adapters/contentful/detect.ts`
- Modify: `src/adapters/contentful/detect.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `DetectResult` gains `spaceIdSource?: "asset-host" | "api-host"`. `detectContentful` sets it to `"asset-host"` on an asset-host match and `"api-host"` on an API-host match.

- [ ] **Step 1: Add failing test assertions**

In `src/adapters/contentful/detect.test.ts`, add a `spaceIdSource` assertion to the asset-host and API-host tests:

In the test `"extracts the space id from a ctfassets asset URL"`, after the existing asserts add:

```ts
    expect(result.spaceIdSource).toBe("asset-host");
```

In the test `"extracts the space id from a Content Delivery API request"`, after the existing asserts add:

```ts
    expect(result.spaceIdSource).toBe("api-host");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/adapters/contentful/detect.test.ts`
Expected: FAIL — `expected undefined to be "asset-host"`.

- [ ] **Step 3a: Extend the `DetectResult` interface**

In `src/core/adapter.ts`, modify the `DetectResult` interface to add `spaceIdSource`:

```ts
export interface DetectResult {
  isMatch: boolean;
  spaceId?: string;
  spaceIdSource?: "asset-host" | "api-host";
  region?: "global" | "eu";
  signals: string[];
}
```

- [ ] **Step 3b: Set `spaceIdSource` in `detectContentful`**

In `src/adapters/contentful/detect.ts`, add `spaceIdSource` to the two match return objects. The asset-host branch:

```ts
  const assetMatch = ASSET_HOST_RE.exec(haystack);
  if (assetMatch) {
    return {
      isMatch: true,
      spaceId: assetMatch[2],
      spaceIdSource: "asset-host",
      region: assetMatch[1] ? "eu" : "global",
      signals: [`Found Contentful asset host: ${assetMatch[0]}`],
    };
  }
```

The API-host branch:

```ts
  const apiMatch = API_HOST_RE.exec(haystack);
  if (apiMatch) {
    return {
      isMatch: true,
      spaceId: apiMatch[1],
      spaceIdSource: "api-host",
      region: "global",
      signals: [`Found Contentful API host: ${apiMatch[0]}`],
    };
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/adapters/contentful/detect.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/adapter.ts src/adapters/contentful/detect.ts src/adapters/contentful/detect.test.ts
git commit -m "feat(contentful): expose spaceIdSource from detectContentful"
```

---

### Task 4: `acquireAccess` emits both log lines (the single log site)

**Files:**
- Modify: `src/core/adapter.ts:33-39` (the `AcquireOpts` interface)
- Modify: `src/adapters/contentful/index.ts`
- Modify: `src/adapters/contentful/index.test.ts`

**Interfaces:**
- Consumes: `logDetection`, `DetectionSource` from `./log.js`; `DetectResult.spaceIdSource`; `SniffResult.source`.
- Produces: `AcquireOpts` gains `debug?: boolean`. `acquireAccess` emits exactly one `spaceId` line and one `token` line via `logDetection`, before any `AccessError` is thrown.

Source resolution rules inside `acquireAccess`:
- spaceId: `opts.providedSpaceId` present → `"provided-flag"`; else `detect.spaceIdSource ?? "not-found"`.
- token: `opts.providedToken` present → `"provided-flag"`; else the sniffed `source`; else `"not-found"`.

- [ ] **Step 1: Add failing tests**

Add a new `describe` block to `src/adapters/contentful/index.test.ts` (keep existing imports; the file already imports `contentfulAdapter`, `AccessError`, `DetectResult`, `FetchedPage`):

```ts
describe("contentfulAdapter.acquireAccess debug logging", () => {
  const pageWithToken: FetchedPage = {
    url: "x",
    finalUrl: "x",
    html: "",
    scripts: [],
    requests: [
      { url: "https://cdn.contentful.com/spaces/sp/entries?access_token=sniffedToken123", method: "GET", headers: {} },
    ],
  };

  it("logs provided-flag sources for spaceId and token when debug is on", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await contentfulAdapter.acquireAccess(
      { isMatch: true, region: "global", signals: [] },
      { page: emptyPage, providedSpaceId: "sp", providedToken: "tok", debug: true },
    );
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=spaceId value=sp source=provided-flag\n");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=tok source=provided-flag\n");
    spy.mockRestore();
  });

  it("logs the detected spaceId source and the sniffed token source", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await contentfulAdapter.acquireAccess(
      { isMatch: true, spaceId: "sp", spaceIdSource: "asset-host", region: "global", signals: [] },
      { page: pageWithToken, debug: true },
    );
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=spaceId value=sp source=asset-host\n");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=sniffedToken123 source=query-param\n");
    spy.mockRestore();
  });

  it("logs the token not-found line before throwing AccessError", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await expect(
      contentfulAdapter.acquireAccess(
        { isMatch: true, spaceId: "sp", spaceIdSource: "asset-host", region: "global", signals: [] },
        { page: emptyPage, debug: true },
      ),
    ).rejects.toBeInstanceOf(AccessError);
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=<none> source=not-found\n");
    spy.mockRestore();
  });

  it("writes nothing when debug is off", async () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    await contentfulAdapter.acquireAccess(
      { isMatch: true, spaceId: "sp", spaceIdSource: "asset-host", region: "global", signals: [] },
      { page: pageWithToken },
    );
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/adapters/contentful/index.test.ts`
Expected: FAIL — `process.stderr.write` not called (logging not implemented yet).

- [ ] **Step 3a: Extend the `AcquireOpts` interface**

In `src/core/adapter.ts`, modify `AcquireOpts` to add `debug`:

```ts
export interface AcquireOpts {
  page: FetchedPage;
  providedToken?: string;
  providedSpaceId?: string;
  environment?: string;
  region?: "global" | "eu";
  debug?: boolean;
}
```

- [ ] **Step 3b: Emit the log lines in `acquireAccess`**

In `src/adapters/contentful/index.ts`, add the import near the other adapter imports:

```ts
import { logDetection } from "./log.js";
```

Then replace the body of `acquireAccess` (lines currently `50-80`) with:

```ts
  async acquireAccess(detect: DetectResult, opts: AcquireOpts): Promise<Access> {
    const debug = opts.debug ?? false;

    const spaceId = opts.providedSpaceId ?? detect.spaceId;
    logDetection(
      debug,
      "spaceId",
      spaceId,
      opts.providedSpaceId ? "provided-flag" : (detect.spaceIdSource ?? "not-found"),
    );
    if (!spaceId) throw new AccessError("No Contentful space id detected. Pass --space-id.");

    const environment = opts.environment ?? DEFAULT_ENVIRONMENT;

    if (opts.providedToken) {
      logDetection(debug, "token", opts.providedToken, "provided-flag");
      return {
        spaceId,
        environment,
        deliveryToken: opts.providedToken,
        region: opts.region ?? detect.region ?? "global",
        acquisition: "provided",
      };
    }

    const sniffed = sniffToken(opts.page);
    logDetection(debug, "token", sniffed.token, sniffed.source ?? "not-found");
    if (sniffed.token) {
      return {
        spaceId,
        environment,
        deliveryToken: sniffed.token,
        region: opts.region ?? detect.region ?? sniffed.region,
        acquisition: "sniffed",
      };
    }

    throw new AccessError(
      "Could not find a Contentful delivery token on the site. Pass --token with a read-only delivery token.",
    );
  },
```

Note: when `--space-id` is provided but no token resolves, the spaceId line still logs `provided-flag` before the token `not-found` line — both diagnostics appear.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/adapters/contentful/index.test.ts`
Expected: PASS (existing 4 + new 4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/adapter.ts src/adapters/contentful/index.ts src/adapters/contentful/index.test.ts
git commit -m "feat(contentful): log spaceId and token detection sources from acquireAccess"
```

---

### Task 5: Wire the `--debug` CLI flag

**Files:**
- Modify: `src/cli/parse-args.ts`
- Modify: `src/cli/parse-args.test.ts`
- Modify: `src/cli/run.ts:8-16` (the `RunArgs` interface) and `src/cli/run.ts:47-53` (the `acquireAccess` call)

**Interfaces:**
- Consumes: `AcquireOpts.debug` from Task 4.
- Produces: `RunArgs` gains `debug?: boolean`. `parseArgs` sets `debug` to a concrete boolean. `run` passes `debug: args.debug` into the `acquireAccess` opts.

- [ ] **Step 1: Add failing test**

In `src/cli/parse-args.test.ts`, add:

```ts
  it("defaults debug to false and enables it with --debug", () => {
    expect(parseArgs(["node", "cli", "https://site.com"]).debug).toBe(false);
    expect(parseArgs(["node", "cli", "https://site.com", "--debug"]).debug).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/cli/parse-args.test.ts`
Expected: FAIL — `expected undefined to be false`.

- [ ] **Step 3a: Add the `--debug` option in `parse-args.ts`**

In `src/cli/parse-args.ts`, add the option to the Commander chain (after `--include-model`):

```ts
    .option("--debug", "print detection diagnostics (spaceId, token + source) to stderr")
```

And add `debug` to the returned object:

```ts
    includeModel: Boolean(opts.includeModel),
    debug: Boolean(opts.debug),
    json: Boolean(opts.json),
```

- [ ] **Step 3b: Add `debug` to `RunArgs` and pass it through**

In `src/cli/run.ts`, add `debug` to the `RunArgs` interface:

```ts
export interface RunArgs {
  url?: string;
  token?: string;
  spaceId?: string;
  environment?: string;
  region?: "global" | "eu";
  ai: boolean;
  includeModel: boolean;
  debug?: boolean;
}
```

Then pass it into the `acquireAccess` opts:

```ts
  const access = await deps.adapter.acquireAccess(detect, {
    page,
    providedToken: args.token,
    providedSpaceId: args.spaceId,
    environment: args.environment,
    region: args.region,
    debug: args.debug,
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/cli/parse-args.test.ts`
Expected: PASS (existing 4 + new 1).

- [ ] **Step 5: Full verification**

Run: `pnpm typecheck && pnpm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 6: Manual smoke check (optional)**

Run: `pnpm cli https://www.example-contentful-site.com --debug --no-ai --json 1>/dev/null`
Expected (on stderr): two lines like
```
[contentful] detect field=spaceId value=<id> source=asset-host
[contentful] detect field=token value=<token> source=query-param
```
(Exact values depend on the site; the point is the format and that lines appear on stderr only.)

- [ ] **Step 7: Commit**

```bash
git add src/cli/parse-args.ts src/cli/parse-args.test.ts src/cli/run.ts
git commit -m "feat(cli): add --debug flag to print Contentful detection diagnostics"
```

---

## Self-Review notes

- **Spec coverage:** format (Task 1) · source vocabulary for token (Task 2) and spaceId (Task 3) · not-found + single log site + emit-before-throw (Task 4) · `--debug` flag + plumbing (Task 5) · debug-off no-op (Tasks 1 & 4) · token logged in full (Tasks 1 & 4) · removal of ad-hoc `console.log` (Task 2). All covered.
- **Type consistency:** `DetectionSource` (log.ts) is the superset; `DetectResult.spaceIdSource` (`"asset-host" | "api-host"`) and `SniffResult.source` (`"query-param" | "bearer-header" | "page-body"`) are subsets assignable to it; `acquireAccess` supplies `"provided-flag"`/`"not-found"` literals which are also members. Consistent.
- **`debug` optionality:** `RunArgs.debug` and `AcquireOpts.debug` are optional so existing call sites (e.g. `run.test.ts`) still compile; `parseArgs` always returns a concrete boolean.
