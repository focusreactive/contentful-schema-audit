import { validationDimension } from "./validation.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

describe("validationDimension", () => {
  it("fails identifierUnique when a slug field lacks a unique rule", () => {
    const t = type({ id: "page", fields: [field({ id: "slug", type: "text" })] });
    const c = validationDimension.evaluate(model({ contentTypes: [t] })).find((x) => x.id === "validation.identifierUnique");
    expect(c?.status).toBe("fail");
  });

  it("passes coverage when at least half of fields are validated", () => {
    const t = type({ id: "page", fields: [
      field({ id: "slug", validations: [{ kind: "unique" }] }),
      field({ id: "title" }),
    ] });
    const c = validationDimension.evaluate(model({ contentTypes: [t] })).find((x) => x.id === "validation.coverage");
    expect(c?.status).toBe("pass");
  });
});
