# CMS Schema Health · handgadvocates.com

| CMS        | Space          | Environment | Types | Fields | Generated  |
| ---------- | -------------- | ----------- | ----: | -----: | ---------- |
| Contentful | `j3e6q038l6io` | `master`    |    15 |    108 | 2026-07-02 |

## Score: 42 / 100

`████████░░░░░░░░░░░░` `Poor`

This content model scores 42/100 (poor): the structure is clean — naming is clear, references are intact, and there is little schema debt — but the editorial guardrails around it are almost entirely missing. The biggest risk is SEO: none of the 7 page-like types (homePage, blogPost, service, teamMember, career, industry, aboutUs) carry meta title, meta description, canonical, OG image, or noindex fields, so search appearance is entirely hardcoded or absent. Compounding that, no slug is unique or pattern-validated, so two blog posts or services can silently claim the same URL. The most valuable next fix is a shared SEO component type linked from every page type, followed by unique + regexp validations on the 5 existing slug fields.

---

### Scoreboard

| Dimension                | Score |              | Band             | Tier          | Passed checks |
| ------------------------ | ----: | :----------- | :--------------- | :------------ | ------------: |
| SEO Readiness            |     0 | `░░░░░░░░░░` | `Poor`           | `HIGH`        |         0 / 5 |
| Content Modeling Quality |   100 | `██████████` | `Good`           | `HIGH`        |         4 / 4 |
| Referential Integrity    |   100 | `██████████` | `Good`           | `HIGH`        |         3 / 3 |
| Validation Discipline    |     0 | `░░░░░░░░░░` | `Poor`           | `MEDIUM`      |         0 / 3 |
| Slug & Routing Hygiene   |     0 | `░░░░░░░░░░` | `Poor`           | `MEDIUM`      |         0 / 3 |
| Asset Management         |    40 | `████░░░░░░` | `Poor`           | `MEDIUM`      |         1 / 3 |
| Internationalization     |     — |              | `Not applicable` | `SITUATIONAL` |             — |
| Composable Content       |     0 | `░░░░░░░░░░` | `Poor`           | `SITUATIONAL` |         0 / 1 |
| Global Configuration     |     0 | `░░░░░░░░░░` | `Poor`           | `SITUATIONAL` |         0 / 3 |
| Schema Debt              |    80 | `████████░░` | `Good`           | `SITUATIONAL` |         3 / 4 |

### Check totals

| Status           | Count | Distribution         |
| ---------------- | ----: | -------------------- |
| `Passed`         |    11 | `███████████`        |
| `Failed`         |    18 | `██████████████████` |
| `Not assessable` |     0 |                      |

### Priorities

|   # | Check                          | Severity   | Dimension              |
| --: | ------------------------------ | ---------- | ---------------------- |
|   1 | Canonical URL field present    | `Critical` | SEO Readiness          |
|   2 | Meta title field present       | `Major`    | SEO Readiness          |
|   3 | Meta description field present | `Major`    | SEO Readiness          |
|   4 | Page types have a slug field   | `Critical` | Slug & Routing Hygiene |
|   5 | Fields carry validations       | `Major`    | Validation Discipline  |

---

## Dimensions

### 1. SEO Readiness

| Score |              | Band   | Tier   | Passed checks |
| ----- | :----------- | :----- | :----- | ------------: |
| 0     | `░░░░░░░░░░` | `Poor` | `HIGH` |         0 / 5 |

Scores 0 because not one of the 7 page-like types declares any SEO field — no meta title, meta description, canonical URL, OG image, or noindex control.

#### Checks

| Check                          | Severity   | Status   | Evidence                                                |
| ------------------------------ | ---------- | -------- | ------------------------------------------------------- |
| Canonical URL field present    | `Critical` | `Failed` | 0 of 7 page-like types declare a canonical field        |
| Meta title field present       | `Major`    | `Failed` | 0 of 7 page-like types declare a meta-title field       |
| Meta description field present | `Major`    | `Failed` | 0 of 7 page-like types declare a meta-description field |
| Social/OG image field present  | `Minor`    | `Failed` | 0 of 7 page-like types declare a social-image field     |
| Robots/noindex control present | `Minor`    | `Failed` | 0 of 7 page-like types expose a robots/noindex control  |

##### 1. Canonical URL field present — `Critical`

**Evidence** — 0 of 7 page-like types declare a canonical field

**Affects** — `teamMember` `aboutUs` `blogPost` `service` `career` `industry` `homePage`

**Impact** — Without a canonical field, duplicate routes to the same content (e.g. a blog post reachable under multiple paths or with query parameters) split ranking signal and risk duplicate-content penalties across all 7 page types.

**Fix** — Add a canonicalUrl Symbol field with a regexp validation for absolute URLs to each page-like type so editors can consolidate duplicates.

---

##### 2. Meta title field present — `Major`

**Evidence** — 0 of 7 page-like types declare a meta-title field

**Affects** — `teamMember` `aboutUs` `blogPost` `service` `career` `industry` `homePage`

**Impact** — Search engines fall back to the on-page title for all 7 page-like types, so blog posts, service pages, and attorney profiles cannot be tuned for search snippets — a direct traffic cost for a professional-services site that competes on search.

**Fix** — Add a metaTitle Symbol field (with a size validation around 60 characters) to homePage, blogPost, service, teamMember, career, industry, and aboutUs — ideally via one shared SEO component type linked from each.

---

##### 3. Meta description field present — `Major`

**Evidence** — 0 of 7 page-like types declare a meta-description field

**Affects** — `teamMember` `aboutUs` `blogPost` `service` `career` `industry` `homePage`

**Impact** — With no meta description on any page type, Google composes snippets from arbitrary page text, so editors cannot influence click-through rates on blog posts, services, or team profiles.

**Fix** — Add a metaDescription Text field with a size validation (~155 characters) to the same 7 page types, ideally inside the shared SEO component.

---

##### 4. Social/OG image field present — `Minor`

**Evidence** — 0 of 7 page-like types declare a social-image field

**Affects** — `teamMember` `aboutUs` `blogPost` `service` `career` `industry` `homePage`

**Impact** — Links to any page shared on LinkedIn or X render without a preview image, which measurably suppresses clicks — notable for a firm whose blog posts and attorney profiles are shared professionally.

**Fix** — Add an ogImage asset link (with an assetImageDimensions validation of at least 1200×630) to each page-like type or the shared SEO component.

---

##### 5. Robots/noindex control present — `Minor`

**Evidence** — 0 of 7 page-like types expose a robots/noindex control

**Affects** — `teamMember` `aboutUs` `blogPost` `service` `career` `industry` `homePage`

**Impact** — Editors cannot exclude thin or temporary pages (a draft industry page, an expired career posting) from search without a code deploy.

**Fix** — Add a noindex Boolean field to each page-like type and wire it to the robots meta tag in the frontend.

---

### 2. Content Modeling Quality

| Score |              | Band   | Tier   | Passed checks |
| ----- | :----------- | :----- | :----- | ------------: |
| 100   | `██████████` | `Good` | `HIGH` |         4 / 4 |

Scores 100: types are cohesive and well-scoped, the flagged orphans (career, download, industry, termsAndPrivacy) are all deliberately standalone collections or singletons, and no god types exist.

#### Checks

| Check                          | Severity | Status   | Evidence                                                              |
| ------------------------------ | -------- | -------- | --------------------------------------------------------------------- |
| Body fields use rich text      | `Major`  | `Passed` | 7 of 7 body-like fields use rich text                                 |
| No oversized content types     | `Minor`  | `Passed` | No oversized content types, or large types are justified              |
| Reusable building blocks exist | `Minor`  | `Passed` | At least one type is reused across multiple types                     |
| Few escape-hatch JSON fields   | `Minor`  | `Passed` | 0 of 108 fields are untyped JSON (bypass validation and localisation) |

---

### 3. Referential Integrity

| Score |              | Band   | Tier   | Passed checks |
| ----- | :----------- | :----- | :----- | ------------: |
| 100   | `██████████` | `Good` | `HIGH` |         3 / 3 |

Scores 100: every reference resolves to existing types and most entry links (e.g. homePage.slider, service.team, blogPost.authors) restrict their allowed content types.

#### Checks

| Check                                      | Severity   | Status   | Evidence                                                      |
| ------------------------------------------ | ---------- | -------- | ------------------------------------------------------------- |
| Internal links use references, not strings | `Critical` | `Passed` | 0 fields store internal links as plain strings                |
| Entry links restrict their target types    | `Major`    | `Passed` | 13 of 15 entry-link fields restrict allowed target types      |
| No orphaned content types                  | `Minor`    | `Passed` | No orphaned content types, or all are deliberate entry points |

---

### 4. Validation Discipline

| Score |              | Band   | Tier     | Passed checks |
| ----- | :----------- | :----- | :------- | ------------: |
| 0     | `░░░░░░░░░░` | `Poor` | `MEDIUM` |         0 / 3 |

Scores 0 because only 3 of 108 fields carry any validation, all 5 slug fields lack a unique constraint, and none of the 15 types marks even one field as required.

#### Checks

| Check                         | Severity | Status   | Evidence                                               |
| ----------------------------- | -------- | -------- | ------------------------------------------------------ |
| Fields carry validations      | `Major`  | `Failed` | 3 of 108 fields carry at least one validation          |
| Identifier fields are unique  | `Major`  | `Failed` | 5 of 5 slug/identifier fields lack a unique constraint |
| Types declare required fields | `Minor`  | `Failed` | 15 content types have no required field                |

##### 1. Fields carry validations — `Major`

**Evidence** — 3 of 108 fields carry at least one validation

**Impact** — With only 3 of 108 fields validated, nothing stops empty titles, malformed emails on teamMember, or arbitrary strings in enum-like fields such as timeline.imagePosition and download.category — inconsistencies surface as frontend bugs instead of editor errors.

**Fix** — Add validations type by type: size limits on titles and descriptions, a regexp on teamMember.email and phoneNumber, and 'accept only specified values' lists on option fields like imagePosition and arrowDirection.

---

##### 2. Identifier fields are unique — `Major`

**Evidence** — 5 of 5 slug/identifier fields lack a unique constraint

**Impact** — All 5 slug fields accept duplicates, so two services or two blog posts can share a slug and one silently becomes unreachable or renders the wrong content, depending on frontend query order.

**Fix** — Enable the unique validation on the slug field of blogPost, service, teamMember, career, and industry in each content type's field settings.

---

##### 3. Types declare required fields — `Minor`

**Evidence** — 15 content types have no required field

**Affects** — `timeline` `ourHistory` `teamMember` `aboutUs` `blogPost` `termsAndPrivacy` `service` `whatWeStandFor` +7 more

**Impact** — No type requires any field, so an editor can publish a blog post without a title or slug, or a slide without an image, and the frontend must defensively handle every missing value.

**Fix** — Mark each type's essential fields as required — at minimum the displayField (title/name), slugs on routable types, and the primary media field on visual components like slide.

---

### 5. Slug & Routing Hygiene

| Score |              | Band   | Tier     | Passed checks |
| ----- | :----------- | :----- | :------- | ------------: |
| 0     | `░░░░░░░░░░` | `Poor` | `MEDIUM` |         0 / 3 |

Scores 0: aboutUs and homePage have no slug at all, and the 5 slugs that do exist (blogPost, service, teamMember, career, industry) are neither unique nor pattern-validated.

#### Checks

| Check                             | Severity   | Status   | Evidence                                           |
| --------------------------------- | ---------- | -------- | -------------------------------------------------- |
| Page types have a slug field      | `Critical` | `Failed` | 5 of 7 page-like types declare a slug field        |
| Slug fields are unique            | `Major`    | `Failed` | 0 of 7 page-like types have a unique slug          |
| Slug fields are pattern-validated | `Minor`    | `Failed` | 0 of 7 page-like types pattern-validate their slug |

##### 1. Page types have a slug field — `Critical`

**Evidence** — 5 of 7 page-like types declare a slug field

**Affects** — `aboutUs` `homePage`

**Impact** — aboutUs and homePage have no slug, so their routes are hardcoded in the frontend; editors cannot restructure those URLs, and the types cannot participate in slug-driven routing or sitemap generation.

**Fix** — Add a slug Symbol field (unique + regexp-validated) to aboutUs; for homePage, either add a fixed slug or explicitly treat it as the root singleton in routing code.

---

##### 2. Slug fields are unique — `Major`

**Evidence** — 0 of 7 page-like types have a unique slug

**Affects** — `teamMember` `aboutUs` `blogPost` `service` `career` `industry` `homePage`

**Impact** — None of the page types enforces slug uniqueness, so colliding URLs between entries are possible at any time — the highest-likelihood routing defect in this model given multiple editors and no constraint.

**Fix** — Turn on the unique validation for every slug field across the 7 page-like types in Contentful's field validation settings.

---

##### 3. Slug fields are pattern-validated — `Minor`

**Evidence** — 0 of 7 page-like types pattern-validate their slug

**Affects** — `teamMember` `aboutUs` `blogPost` `service` `career` `industry` `homePage`

**Impact** — Slugs accept spaces, uppercase, and special characters, which produce encoded or broken URLs (e.g. '/team/John Smith') and inconsistent link formats across the site.

**Fix** — Add a regexp validation such as ^[a-z0-9]+(?:-[a-z0-9]+)*$ to every slug field so only URL-safe kebab-case values can be saved.

---

### 6. Asset Management

| Score |              | Band   | Tier     | Passed checks |
| ----- | :----------- | :----- | :------- | ------------: |
| 40    | `████░░░░░░` | `Poor` | `MEDIUM` |         1 / 3 |

Scores 40 because all 11 asset-owning types lack an alt-text or caption field and none of the 19 asset fields constrains file size, dimensions, or mime type.

#### Checks

| Check                               | Severity | Status   | Evidence                                                     |
| ----------------------------------- | -------- | -------- | ------------------------------------------------------------ |
| Asset-owning types provide alt text | `Major`  | `Failed` | 11 of 11 asset-owning types lack an alt/caption field        |
| Asset fields constrain size/type    | `Minor`  | `Failed` | 0 of 19 asset fields enforce size/dimension/mime constraints |
| Assets modeled as references        | `Major`  | `Passed` | 19 asset reference fields found                              |

##### 1. Asset-owning types provide alt text — `Major`

**Evidence** — 11 of 11 asset-owning types lack an alt/caption field

**Affects** — `timeline` `teamMember` `aboutUs` `blogPost` `service` `whatWeStandFor` `download` `industry` +3 more

**Impact** — All 11 image-owning types (blogPost featured images, teamMember avatars, slide images, etc.) ship without alt text, hurting accessibility compliance and forfeiting image-search traffic.

**Fix** — Add a companion altText Symbol field next to each image link field, or standardize on filling the asset's built-in description and enforcing it editorially.

---

##### 2. Asset fields constrain size/type — `Minor`

**Evidence** — 0 of 19 asset fields enforce size/dimension/mime constraints

**Impact** — None of the 19 asset fields limits size, dimensions, or file type, so an editor can attach a 40 MB PNG as a slide background or a PDF as an avatar, degrading page performance unpredictably.

**Fix** — Add assetFileSize and mime-group (images only) validations to image fields, and assetImageDimensions minimums on layout-critical ones like slide.image and blogPost.wideImage.

---

### 7. Internationalization

| Score |     | Band             | Tier          | Passed checks |
| ----- | :-- | :--------------- | :------------ | ------------: |
| —     |     | `Not applicable` | `SITUATIONAL` |             — |

Not applicable: this is a single-locale space, so internationalization is not assessed.

---

### 8. Composable Content

| Score |              | Band   | Tier          | Passed checks |
| ----- | :----------- | :----- | :------------ | ------------: |
| 0     | `░░░░░░░░░░` | `Poor` | `SITUATIONAL` |         0 / 1 |

Scores 0 because no multi-type entry arrays exist — pages like homePage hard-wire single-purpose sections instead of a flexible block/page-builder pattern.

#### Checks

| Check                        | Severity | Status   | Evidence                         |
| ---------------------------- | -------- | -------- | -------------------------------- |
| Modular content arrays exist | `Minor`  | `Failed` | No multi-type entry arrays found |

##### 1. Modular content arrays exist — `Minor`

**Evidence** — No multi-type entry arrays found

**Impact** — homePage wires each section into a dedicated field (slider, aboutSection, servicesSection), so adding or reordering a landing-page section requires a schema change and deploy instead of an editor action.

**Fix** — Introduce a sections array on page types that accepts multiple block content types (pageSection, slider, and future blocks) to enable a page-builder pattern.

---

### 9. Global Configuration

| Score |              | Band   | Tier          | Passed checks |
| ----- | :----------- | :----- | :------------ | ------------: |
| 0     | `░░░░░░░░░░` | `Poor` | `SITUATIONAL` |         0 / 3 |

Scores 0: there is no centralized settings type, navigation is not modeled as content, and no redirect type exists despite the model managing slug-addressed pages.

#### Checks

| Check                            | Severity | Status   | Evidence                                                  |
| -------------------------------- | -------- | -------- | --------------------------------------------------------- |
| Centralized settings type exists | `Minor`  | `Failed` | No centralized settings/config type found                 |
| Navigation is modeled as content | `Minor`  | `Failed` | No navigation/menu type found                             |
| Redirects are modeled as entries | `Minor`  | `Failed` | No redirect type, and redirects are not handled elsewhere |

##### 1. Centralized settings type exists — `Minor`

**Evidence** — No centralized settings/config type found

**Impact** — Site-wide values like the logo, contact details, and social links have no home in the CMS, so they live hardcoded in the frontend and every change needs a developer.

**Fix** — Create a siteSettings singleton content type holding logo, contact info, social profiles, and footer text, and read it once at build/render time.

---

##### 2. Navigation is modeled as content — `Minor`

**Evidence** — No navigation/menu type found

**Impact** — Header and footer menus cannot be edited in Contentful; adding an industry page or reordering services in the nav requires a code change.

**Fix** — Add a navigation content type (label + list of menu-item entries referencing page types or URLs) and render the menus from it.

---

##### 3. Redirects are modeled as entries — `Minor`

**Evidence** — No redirect type, and redirects are not handled elsewhere

**Impact** — The model manages slug-addressed pages but has no redirect entries, so renaming a service or attorney slug breaks inbound links and accumulated SEO equity with no editorial remedy.

**Fix** — Add a redirect content type (fromPath, toPath, statusCode) and have the frontend or edge layer consume it before 404ing.

---

### 10. Schema Debt

| Score |              | Band   | Tier          | Passed checks |
| ----- | :----------- | :----- | :------------ | ------------: |
| 80    | `████████░░` | `Good` | `SITUATIONAL` |         3 / 4 |

Scores 80 (good): the only debt is that 3 of 15 types — ourHistory, termsAndPrivacy, pageSection — lack a description telling editors when to use them.

#### Checks

| Check                           | Severity | Status   | Evidence                                            |
| ------------------------------- | -------- | -------- | --------------------------------------------------- |
| Content types have descriptions | `Minor`  | `Failed` | 3 of 15 content types lack a description            |
| Few hidden/read-only fields     | `Major`  | `Passed` | 0 of 108 fields are hidden from editors             |
| Consistent field naming         | `Minor`  | `Passed` | 100% of field ids follow a single casing convention |
| Field names are meaningful      | `Minor`  | `Passed` | Field/type names are meaningful                     |

##### 1. Content types have descriptions — `Minor`

**Evidence** — 3 of 15 content types lack a description

**Affects** — `ourHistory` `termsAndPrivacy` `pageSection`

**Impact** — ourHistory, termsAndPrivacy, and pageSection give editors no guidance on their purpose, and the ambiguity is real — pageSection is reused across homePage sections while aboutUs also has its own ourHistory rich-text field.

**Fix** — Fill in the description on these 3 content types in the Contentful type editor, stating what each is for and where it renders.

---
