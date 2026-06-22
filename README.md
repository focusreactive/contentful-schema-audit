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

| Flag              | Argument     | Default  | Description                                                                                                |
| ----------------- | ------------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `--token`         | `<token>`    | —        | CDA delivery token. Falls back when token sniffing fails (URL mode) or replaces it entirely (direct mode). |
| `--space-id`      | `<id>`       | —        | Skip URL detection and audit this space directly.                                                          |
| `--environment`   | `<env>`      | `master` | Contentful environment to audit.                                                                           |
| `--region`        | `global\|eu` | `global` | Contentful region.                                                                                         |
| `--no-ai`         | —            | AI on    | Skip AI narration. Use this when `ANTHROPIC_API_KEY` is not set or narration is not needed.                |
| `--json`          | —            | off      | Print JSON output only (no pretty terminal summary).                                                       |
| `--include-model` | —            | off      | Embed the full normalized content model in the JSON output.                                                |
| `--out`           | `<file>`     | —        | Write the JSON result to a file in addition to printing.                                                   |

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

## Dimensions

Dimensions are evaluated in the following order. Each dimension has a **tier** that controls its weight in the overall score, and each runs a fixed set of **checks**. Every check carries a severity (`critical` / `major` / `minor`) that determines its penalty weight when it fails.

| #   | ID                     | Title                    | Tier        | Checks |
| --- | ---------------------- | ------------------------ | ----------- | ------ |
| 1   | `seo`                  | SEO Readiness            | high        | 5      |
| 2   | `modeling`             | Content Modeling Quality | high        | 4      |
| 3   | `referentialIntegrity` | Referential Integrity    | high        | 3      |
| 4   | `validation`           | Validation Discipline    | medium      | 3      |
| 5   | `slug`                 | Slug & Routing Hygiene   | medium      | 3      |
| 6   | `assets`               | Asset Management         | medium      | 3      |
| 7   | `i18n`                 | Internationalization     | situational | 2      |
| 8   | `composable`           | Composable Content       | situational | 1      |
| 9   | `globalConfig`         | Global Configuration     | situational | 3      |
| 10  | `schemaDebt`           | Schema Debt              | situational | 3      |

### 1. `seo` — SEO Readiness (`high`)

Evaluates search-engine readiness on page-like content types. **Not applicable** when the space has no page-like content types.

| Check             | Severity | What it verifies                                                                               |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `seo.title`       | major    | ≥ 80% of page-like types declare a meta-title field.                                           |
| `seo.description` | major    | ≥ 80% of page-like types declare a meta-description field.                                     |
| `seo.canonical`   | critical | ≥ 80% of page-like types declare a canonical URL field (prevents duplicate-content penalties). |
| `seo.ogImage`     | minor    | ≥ 80% of page-like types declare a social/OG image field.                                      |
| `seo.noindex`     | minor    | ≥ 50% of page-like types expose a robots/noindex control.                                      |

### 2. `modeling` — Content Modeling Quality (`high`)

Assesses how well the schema uses Contentful's structured-modeling primitives.

| Check                 | Severity | What it verifies                                                                            |
| --------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `modeling.richText`   | major    | ≥ 70% of body-like fields use rich text rather than long plain text.                        |
| `modeling.godTypes`   | minor    | No content type exceeds 30 fields (avoids oversized "god" types).                           |
| `modeling.reuse`      | minor    | At least one content type is reused (referenced by 2+ other types).                         |
| `modeling.jsonFields` | minor    | < 10% of fields are untyped JSON escape hatches (which bypass validation and localization). |

### 3. `referentialIntegrity` — Referential Integrity (`high`)

Checks that relationships are modeled as real references rather than free text.

| Check                  | Severity | What it verifies                                                                                              |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `refs.notStringly`     | critical | No fields store internal links as plain strings (links should be Link/Entry references so they can't dangle). |
| `refs.linkContentType` | major    | ≥ 80% of entry-link fields restrict their allowed target types via `linkContentType`.                         |
| `refs.noOrphans`       | minor    | No content types are orphaned (neither referenced by nor referencing any other type).                         |

### 4. `validation` — Validation Discipline (`medium`)

Measures how aggressively the schema constrains editor input.

| Check                           | Severity | What it verifies                                                                     |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `validation.coverage`           | major    | ≥ 50% of fields carry at least one validation (size, regexp, range, allowed values). |
| `validation.identifierUnique`   | major    | Every slug/identifier field has a `unique` constraint.                               |
| `validation.requiredDiscipline` | minor    | Every content type marks at least one field as required.                             |

### 5. `slug` — Slug & Routing Hygiene (`medium`)

Checks routable slug fields on page-like content types. **Not applicable** when the space has no page-like content types.

| Check          | Severity | What it verifies                                                                             |
| -------------- | -------- | -------------------------------------------------------------------------------------------- |
| `slug.present` | critical | 100% of page-like types declare a slug field.                                                |
| `slug.unique`  | major    | ≥ 80% of page-like types have a `unique` constraint on their slug (prevents colliding URLs). |
| `slug.pattern` | minor    | ≥ 50% of page-like types pattern-validate their slug with a `regexp` (keeps slugs URL-safe). |

### 6. `assets` — Asset Management (`medium`)

Evaluates how media is referenced and constrained. **Not applicable** when the model has no asset/media fields.

| Check                 | Severity | What it verifies                                                                       |
| --------------------- | -------- | -------------------------------------------------------------------------------------- |
| `assets.modeledAsRef` | major    | Media is referenced via Link/Asset fields rather than URL strings.                     |
| `assets.altText`      | major    | Every asset-owning type provides an alt-text or caption field (accessibility and SEO). |
| `assets.constraints`  | minor    | ≥ 50% of asset fields enforce size, dimension, or mime-group constraints.              |

### 7. `i18n` — Internationalization (`situational`)

Checks localization configuration. **Not applicable** when the space has a single locale.

| Check                  | Severity | What it verifies                                                                                                                                     |
| ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `i18n.fallbackChain`   | major    | Every non-default locale defines a fallback so missing translations degrade gracefully. _(Only evaluated when the space supports locale fallbacks.)_ |
| `i18n.localizedFields` | minor    | At least one field is actually marked localized (locales are configured _and_ used).                                                                 |

### 8. `composable` — Composable Content (`situational`)

Looks for page-builder-style composition. Note: editor UX (widgets, sidebar layout) is not assessable from public/CDA data — only the modeling is scored.

| Check                      | Severity | What it verifies                                                                |
| -------------------------- | -------- | ------------------------------------------------------------------------------- |
| `composable.modularArrays` | minor    | At least one multi-type entry array exists to support page-builder composition. |

### 9. `globalConfig` — Global Configuration (`situational`)

Checks whether site-wide concerns are modeled as content rather than hardcoded.

| Check                       | Severity | What it verifies                                                                                         |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `globalConfig.settingsType` | minor    | A centralized site-settings/config (singleton) type is present.                                          |
| `globalConfig.navModeled`   | minor    | Navigation/menus are modeled as content so editors can manage them without code changes.                 |
| `globalConfig.redirects`    | minor    | Redirects are modeled as entries (platform/edge redirects outside the CMS are not visible from the CDA). |

### 10. `schemaDebt` — Schema Debt (`situational`)

Surfaces accumulated cruft and inconsistency in the schema.

| Check                      | Severity | What it verifies                                                                       |
| -------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `schemaDebt.hiddenFields`  | major    | < 10% of fields are hidden/read-only from editors (dead schema left after migrations). |
| `schemaDebt.naming`        | minor    | ≥ 90% of field ids follow a single casing convention (camelCase).                      |
| `schemaDebt.noDescription` | minor    | Every content type has a description so editors know when and how to use it.           |

---

## How scoring works

### Severity weights

Each check within a dimension carries a severity. Failing checks deduct penalty points proportional to their severity weight:

| Severity   | Weight |
| ---------- | ------ |
| `critical` | 3      |
| `major`    | 2      |
| `minor`    | 1      |

A dimension score is a 0–100 value derived from the ratio of weighted passes to the total weighted checks.

### Tier weights

The overall grade is a weighted average across all scored dimensions. Each dimension's tier sets its weight:

| Tier          | Weight |
| ------------- | ------ |
| `high`        | 1.5    |
| `medium`      | 1.0    |
| `situational` | 0.5    |

### Grade bands

| Band | Score range |
| ---- | ----------- |
| good | ≥ 80        |
| warn | ≥ 60        |
| poor | < 60        |

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
