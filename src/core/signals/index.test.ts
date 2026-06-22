import { isAssessable } from "./index.js";

describe("isAssessable", () => {
  it("is true only when all required signals are provided", () => {
    expect(isAssessable(["field.type", "locales"], ["field.type", "locales", "referenceGraph"])).toBe(true);
    expect(isAssessable(["entries.sample"], ["field.type"])).toBe(false);
  });

  it("is true for an empty requirement", () => {
    expect(isAssessable([], ["field.type"])).toBe(true);
  });
});
