import { hashModel } from "./hash.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

const base = model({ contentTypes: [type({ id: "page", fields: [field({ id: "slug" })] })] });

describe("hashModel", () => {
  it("is stable regardless of fetch timestamp", () => {
    const a = model({ ...base, meta: { ...base.meta, fetchedAt: "2026-01-01T00:00:00Z" } });
    const b = model({ ...base, meta: { ...base.meta, fetchedAt: "2030-12-31T00:00:00Z" } });
    expect(hashModel(a)).toBe(hashModel(b));
  });

  it("changes when schema content changes", () => {
    const changed = model({ contentTypes: [type({ id: "page", fields: [field({ id: "title" })] })] });
    expect(hashModel(base)).not.toBe(hashModel(changed));
  });
});
