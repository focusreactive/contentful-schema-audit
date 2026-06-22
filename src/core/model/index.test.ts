import { buildReferenceGraph } from "./index.js";
import type { NormalizedContentType } from "./index.js";

const author: NormalizedContentType = { id: "author", name: "Author", fields: [] };
const article: NormalizedContentType = {
  id: "article",
  name: "Article",
  fields: [
    { id: "writtenBy", name: "Written By", type: "link", required: false,
      validations: [], linkTarget: "entry", allowedLinkTypes: ["author"] },
    { id: "related", name: "Related", type: "array", required: false,
      validations: [],
      items: { type: "link", linkTarget: "entry", allowedLinkTypes: ["article"], validations: [] } },
  ],
};

describe("buildReferenceGraph", () => {
  it("creates an edge per entry-link field with its allowed targets", () => {
    const graph = buildReferenceGraph([author, article]);
    expect(graph.typeIds).toEqual(["author", "article"]);
    expect(graph.edges).toEqual([
      { fromType: "article", fromField: "writtenBy", toTypes: ["author"], viaArray: false },
      { fromType: "article", fromField: "related", toTypes: ["article"], viaArray: true },
    ]);
  });

  it("ignores asset links and non-link fields", () => {
    const t: NormalizedContentType = {
      id: "page", name: "Page",
      fields: [
        { id: "hero", name: "Hero", type: "link", required: false,
          validations: [], linkTarget: "asset" },
        { id: "title", name: "Title", type: "text", required: false,
          validations: [] },
      ],
    };
    expect(buildReferenceGraph([t]).edges).toEqual([]);
  });

  it("defaults toTypes to an empty array when an entry link has no allowed types", () => {
    const t: NormalizedContentType = {
      id: "post", name: "Post",
      fields: [
        { id: "ref", name: "Ref", type: "link", required: false,
          validations: [], linkTarget: "entry" },
      ],
    };
    expect(buildReferenceGraph([t]).edges).toEqual([
      { fromType: "post", fromField: "ref", toTypes: [], viaArray: false },
    ]);
  });
});
