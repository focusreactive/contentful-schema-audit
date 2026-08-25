# contentful-schema-audit

## Overview

`contentful-schema-audit` checks the **health of a Contentful content model** and turns it into a clear, shareable report. Point it at a live website (or at a Contentful space directly) and it inspects how the content is structured behind the scenes — then grades that structure and explains what's working, what's quietly costing the site, and what to fix first.

### What it looks at

It doesn't review the content itself (the words and images an editor typed) — it reviews the **shape** of the content: the schema editors work inside. In plain terms, it checks things like:

- **SEO readiness** — are there fields for meta titles, descriptions, canonical URLs, and social images?
- **Content modeling** — is content split into sensible, reusable pieces, or dumped into a few giant catch-all types?
- **Links between content** — are relationships real references (that can't silently break) or fragile pasted-in text?
- **Validation** — are there guardrails so editors can't save bad or inconsistent data?
- **URLs & routing** — does every page have a clean, unique web address (slug)?
- **Images & media** — are they properly attached and given alt text?
- **Translations, global settings, and leftover clutter** from past changes to the schema.

### What you get

A Markdown report file containing:

- an **overall grade** out of 100, banded as _good_, _warn_, or _poor_;
- a **scoreboard** with a score for each area above;
- a short **summary** of the biggest risks;
- a **prioritized list of fixes**, each explaining what's at stake and what "good" looks like.

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

## Usage - AI-assisted audit via Claude Code

AI semantic analysis and prose narration run **inside a Claude Code session**. Open this repo in Claude Code and run:

```
/validate-cms https://example.com
/validate-cms --space-id <id> --token <cda-token> --report out.md
```

Under the hood the skill drives a three-phase pipeline:

```
cms-validate digest …      # fetch + normalize, prints an AI brief
cms-validate score …       # validates semantic.json, scores, prints the narration brief
cms-validate finalize …    # validates narration.json, emits the final report
```

### Flag reference

| Flag                   | Argument     | Default                     | Description                                                                                                                                            |
| ---------------------- | ------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--token`              | `<token>`    | —                           | CDA delivery token. Falls back when token sniffing fails (URL mode) or replaces it entirely (direct mode).                                             |
| `--space-id`           | `<id>`       | —                           | Skip URL detection and audit this space directly.                                                                                                      |
| `--environment`        | `<env>`      | `master`                    | Contentful environment to audit.                                                                                                                       |
| `--region`             | `global\|eu` | `global`                    | Contentful region.                                                                                                                                     |
| `--json`               | `[file]`     | off                         | Also write the JSON result file. Optional value overrides the file name (default `{domain}.json`).                                                     |
| `--include-model`      | —            | off                         | Embed the full normalized content model in the JSON output.                                                                                            |
| `--include-raw-schema` | —            | off                         | Embed the raw, un-normalized CMS schema (content types + locales, exactly as fetched) in the JSON under `rawSchema`. Independent of `--include-model`. |
| `--debug`              | —            | off                         | Print detection diagnostics (space ID, token, and the source each was resolved from) to **stderr**. See [Debugging detection](#debugging-detection).   |
| `--out`                | `<dir>`      | `detected-schemas/{domain}` | Output folder for all written files, used verbatim.                                                                                                    |
| `--report`             | `[file]`     | on                          | The Markdown report is always written. Optional value overrides the file name (default `{domain}.md`).                                                 |

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


## About

Built by [FocusReactive](https://focusreactive.com/), a headless CMS and eCommerce engineering agency. Content-model audits are part of how we scope a [Contentful](https://focusreactive.com/contentful-expert-agency/) build or migration - [talk to us](https://focusreactive.com/#contacts) if you want one run on your space.
