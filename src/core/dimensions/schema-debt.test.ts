import { schemaDebtDimension as debt } from "./schema-debt.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

describe("schemaDebtDimension", () => {
  it("fails hiddenFields when many fields are hidden", () => {
    const hiddenFields = Array.from({ length: 5 }, (_, i) =>
      field({ id: `f${i}`, editorState: { hidden: true } }),
    );
    const visibleFields = Array.from({ length: 5 }, (_, i) => field({ id: `v${i}` }));
    const t = type({ id: "page", description: "A page type", fields: [...hiddenFields, ...visibleFields] });
    const c = debt.evaluate(model({ contentTypes: [t] })).find((x) => x.id === "schemaDebt.hiddenFields");
    expect(c?.status).toBe("fail");
  });

  it("fails noDescription when a content type has no description", () => {
    const t = type({ id: "page", fields: [] }); // no description set
    const c = debt.evaluate(model({ contentTypes: [t] })).find((x) => x.id === "schemaDebt.noDescription");
    expect(c?.status).toBe("fail");
  });

  it("passes noDescription when all types have descriptions", () => {
    const t = type({ id: "page", description: "Landing pages for campaigns", fields: [] });
    const c = debt.evaluate(model({ contentTypes: [t] })).find((x) => x.id === "schemaDebt.noDescription");
    expect(c?.status).toBe("pass");
  });
});
