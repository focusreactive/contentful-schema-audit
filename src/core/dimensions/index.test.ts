import { DIMENSIONS } from "./index.js";

describe("DIMENSIONS registry", () => {
  it("contains all ten dimensions with unique ids", () => {
    expect(DIMENSIONS).toHaveLength(10);
    expect(new Set(DIMENSIONS.map((d) => d.id)).size).toBe(10);
  });
});
