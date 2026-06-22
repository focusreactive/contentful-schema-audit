# cms-schema-validator

`cms-schema-validator` audits a Contentful content model across 10 deterministic health dimensions and produces a scored, tier-weighted report. It connects directly to the Contentful Delivery API — no management token needed — and emits both a pretty terminal summary and structured JSON. An optional AI narration layer (powered by Anthropic Claude) adds a prose summary to each dimension; this never affects the numeric grade, which is always pure and deterministic.

---

## Requirements

- Node ≥ 20
- pnpm

---

## Install

```bash
pnpm install
```

Playwright is only needed for **URL mode** (auto-detection of a Contentful space from a live site). If you plan to use URL mode, install the Chromium browser:

```bash
pnpm exec playwright install chromium
```

If you already have a space ID and delivery token, URL mode is not needed and you can skip the Playwright step.

Build the project before running the installed binary:

```bash
pnpm build
```

---

## Usage

The CLI binary is `cms-validate`. During development you can run without building:

```bash
pnpm exec tsx src/cli/index.ts <args>
```

### Mode 1 — Direct (space ID + token)

Pass a space ID and a read-only CDA delivery token directly. No browser is launched.

```bash
cms-validate --space-id <id> --token <cda-token>
```

**Example** — the public Contentful example space:

```bash
cms-validate --space-id cfexampleapi --token b4c0n73n7fu1 --no-ai
```

This space scores **Overall 43 / 100 (poor)**. The SEO and Slug dimensions are reported as "not applicable" because the example space has no page-like content types.

### Mode 2 — URL (auto-detect)

Pass a public site URL. A headless Chromium browser fetches the page and sniffs the Contentful space ID and delivery token from the page source. Requires Playwright (see Install above).

```bash
cms-validate https://example.com
```

If the delivery token cannot be sniffed automatically, pass it explicitly:

```bash
cms-validate https://example.com --token <cda-token>
```

### Flag reference

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--token` | `<token>` | — | CDA delivery token. Falls back when token sniffing fails (URL mode) or replaces it entirely (direct mode). |
| `--space-id` | `<id>` | — | Skip URL detection and audit this space directly. |
| `--environment` | `<env>` | `master` | Contentful environment to audit. |
| `--region` | `global\|eu` | `global` | Contentful region. |
| `--no-ai` | — | AI on | Skip AI narration. Use this when `ANTHROPIC_API_KEY` is not set or narration is not needed. |
| `--json` | — | off | Print JSON output only (no pretty terminal summary). |
| `--include-model` | — | off | Embed the full normalized content model in the JSON output. |
| `--out` | `<file>` | — | Write the JSON result to a file in addition to printing. |

---

## AI narration

When `ANTHROPIC_API_KEY` is set in the environment, the tool adds a prose explanation to each scored dimension. Narration is advisory only — it never changes the numeric score or grade.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
cms-validate --space-id <id> --token <cda-token>
```

To disable narration explicitly:

```bash
cms-validate --space-id <id> --token <cda-token> --no-ai
```

If the AI model call fails (network error, quota exceeded, etc.), narration degrades gracefully and the deterministic score is still returned.

---

## The 10 dimensions

Dimensions are evaluated in the following order. Each dimension has a **tier** that controls its weight in the overall score.

| # | ID | Title | Tier | What it measures |
|---|-----|-------|------|-----------------|
| 1 | `seo` | SEO Readiness | high | Presence of meta-title, meta-description, canonical URL, OG image, and robots/noindex controls on page-like content types. |
| 2 | `modeling` | Content Modeling Quality | high | Use of rich text for body fields, avoidance of oversized "god" types, reusable building blocks, and minimal untyped JSON fields. |
| 3 | `referentialIntegrity` | Referential Integrity | high | Internal links modeled as entry references (not strings), entry links scoped to allowed target types, and no orphaned content types. |
| 4 | `validation` | Validation Discipline | medium | Field-level validation coverage, unique constraints on slug/identifier fields, and required-field discipline across content types. |
| 5 | `slug` | Slug & Routing Hygiene | medium | Presence, uniqueness, and pattern validation of slug fields on page-like content types. |
| 6 | `assets` | Asset Management | medium | Assets modeled as Link/Asset references, alt-text fields alongside media fields, and size/type constraints on asset fields. |
| 7 | `i18n` | Internationalization | situational | Fallback locale chains configured, and localized fields actually used. Only scored when the space has more than one locale. |
| 8 | `composable` | Composable Content | situational | Presence of multi-type entry arrays supporting page-builder style composition. |
| 9 | `globalConfig` | Global Configuration | situational | Centralized settings type, navigation modeled as content, and redirects modeled as entries. |
| 10 | `schemaDebt` | Schema Debt | situational | Hidden/read-only field accumulation, consistent field naming convention, and content type descriptions. |

---

## How scoring works

### Severity weights

Each check within a dimension carries a severity. Failing checks deduct penalty points proportional to their severity weight:

| Severity | Weight |
|----------|--------|
| `critical` | 3 |
| `major` | 2 |
| `minor` | 1 |

A dimension score is a 0–100 value derived from the ratio of weighted passes to the total weighted checks.

### Tier weights

The overall grade is a weighted average across all scored dimensions. Each dimension's tier sets its weight:

| Tier | Weight |
|------|--------|
| `high` | 1.5 |
| `medium` | 1.0 |
| `situational` | 0.5 |

### Grade bands

| Band | Score range |
|------|-------------|
| good | ≥ 80 |
| warn | ≥ 60 |
| poor | < 60 |

### Dimension states

A dimension can be in one of three states:

- **Scored** — all required signals are present and the dimension applies to this space. Contributes to the overall grade.
- **`not_applicable`** — the dimension does not apply to this space (e.g. SEO on a space with no page-like types, i18n on a single-locale space). These are excluded from the overall grade and are never treated as zero.
- **`not_assessable`** — one or more required signals are missing (e.g. a signal that requires a management token). Also excluded from the overall grade.

The overall score is re-normalized over only the dimensions that are actually scored. If no dimensions can be scored the overall grade is `not_assessed` (null).

---

## Contentful capability boundaries

The adapter uses only the **Contentful Delivery API** (CDA). This has the following implications:

- **Composable / editor UX** — editor-interface configuration (widgets, sidebar layout, appearance) requires a management token and is not accessible from a public URL or a delivery token. Only the content modeling (field types, validations, link targets) is scored; the `composable` dimension reflects this limitation.
- **Redirects** — only redirects modeled as Contentful entries (via a redirect content type) are visible from the CDA. Platform-level or edge-level redirects managed outside the CMS are not assessable.
- **Content instances not sampled** — the audit inspects the schema (content types, fields, locales, reference graph) only. No entries or assets are fetched or analyzed.
