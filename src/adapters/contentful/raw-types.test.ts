import { rawContentTypeSchema, rawLocaleSchema } from "./raw-types.js";

describe("raw-types passthrough", () => {
  it("keeps unknown keys on a content type and its fields", () => {
    const parsed = rawContentTypeSchema.parse({
      sys: { id: "page", revision: 4, space: { sys: { id: "sp" } } },
      name: "Page",
      displayField: "title",
      fields: [{ id: "title", name: "Title", type: "Symbol", extraFieldKey: "keep-me" }],
      surpriseKey: "keep-me-too",
    });
    expect((parsed as Record<string, unknown>).surpriseKey).toBe("keep-me-too");
    expect((parsed.sys as Record<string, unknown>).revision).toBe(4);
    expect((parsed.fields[0] as Record<string, unknown>).extraFieldKey).toBe("keep-me");
  });

  it("keeps unknown keys on a locale", () => {
    const parsed = rawLocaleSchema.parse({
      code: "en-US",
      default: true,
      fallbackCode: null,
      optional: true,
    });
    expect((parsed as Record<string, unknown>).optional).toBe(true);
  });
});
