import { isPageLikeType, isSlugField, isStringlyTypedLink, isSeoField } from "./helpers.js";
import { field, type } from "../../../test/fixtures/models/factories.js";

describe("isSlugField", () => {
  it("matches text fields named like a slug", () => {
    expect(isSlugField(field({ id: "slug", type: "text" }))).toBe(true);
    expect(isSlugField(field({ id: "permalink", type: "text" }))).toBe(true);
    expect(isSlugField(field({ id: "title", type: "text" }))).toBe(false);
    expect(isSlugField(field({ id: "slug", type: "number" }))).toBe(false);
  });
});

describe("isPageLikeType", () => {
  it("matches by slug field or page-ish name", () => {
    expect(isPageLikeType(type({ id: "article", fields: [] }))).toBe(true);
    expect(isPageLikeType(type({ id: "x", fields: [field({ id: "slug", type: "text" })] }))).toBe(true);
    expect(isPageLikeType(type({ id: "color", fields: [] }))).toBe(false);
  });
});

describe("isStringlyTypedLink", () => {
  it("flags link-ish string fields but not slugs or SEO urls", () => {
    expect(isStringlyTypedLink(field({ id: "relatedPage", type: "text" }))).toBe(true);
    expect(isStringlyTypedLink(field({ id: "slug", type: "text" }))).toBe(false);
    expect(isStringlyTypedLink(field({ id: "canonicalUrl", type: "text" }))).toBe(false);
    expect(isStringlyTypedLink(field({ id: "relatedPage", type: "link" }))).toBe(false);
    expect(isStringlyTypedLink(field({ id: "crossReference", type: "text" }))).toBe(false);
    expect(isStringlyTypedLink(field({ id: "children", type: "text" }))).toBe(false);
    expect(isStringlyTypedLink(field({ id: "parentPage", type: "text" }))).toBe(true);
  });
});

describe("isSeoField", () => {
  it("matches canonical fields for the canonical kind", () => {
    expect(isSeoField(field({ id: "canonicalUrl" }), "canonical")).toBe(true);
    expect(isSeoField(field({ id: "metaTitle" }), "canonical")).toBe(false);
  });
});
