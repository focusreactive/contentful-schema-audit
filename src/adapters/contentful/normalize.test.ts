import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalize } from "./normalize.js";
import { contentTypesResponseSchema, localesResponseSchema } from "./raw-types.js";

function loadFixture(name: string): unknown {
  const path = fileURLToPath(new URL(`../../../test/fixtures/contentful/${name}`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("normalize", () => {
  it("maps Contentful field types to the agnostic model", () => {
    const contentTypes = contentTypesResponseSchema.parse(loadFixture("cfexampleapi.content_types.json")).items;
    const locales = localesResponseSchema.parse(loadFixture("cfexampleapi.locales.json")).items;
    const model = normalize({ contentTypes, locales, spaceId: "cfexampleapi", environment: "master", fetchedAt: "2026-01-01T00:00:00Z" });

    const cat = model.contentTypes.find((t) => t.id === "cat");
    expect(cat?.displayField).toBe("name");
    expect(cat?.fields.find((f) => f.id === "name")?.type).toBe("text");
    const bestFriend = cat?.fields.find((f) => f.id === "bestFriend");
    expect(bestFriend?.type).toBe("link");
    expect(bestFriend?.linkTarget).toBe("entry");
    expect(bestFriend?.allowedLinkTypes).toEqual(["cat"]);
    const likes = cat?.fields.find((f) => f.id === "likes");
    expect(likes?.type).toBe("array");
    expect(likes?.items?.type).toBe("text");
  });

  it("normalizes locale fallback chains", () => {
    const locales = localesResponseSchema.parse(loadFixture("cfexampleapi.locales.json")).items;
    const model = normalize({ contentTypes: [], locales, spaceId: "x", environment: "master", fetchedAt: "2026-01-01T00:00:00Z" });
    expect(model.locales.find((l) => l.code === "tlh")?.fallbackCode).toBe("en-US");
  });
});
