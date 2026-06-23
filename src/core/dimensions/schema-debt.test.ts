import { schemaDebtDimension as debt } from "./schema-debt.js";
import { field, type, model, semantic } from "../../../test/fixtures/models/factories.js";

const dim = debt.evaluate;
const t = type({ id: "a", description: "x", fields: [field({ id: "goodName" })] });

describe("schemaDebtDimension", () => {
  it("keeps consistency scored but marks meaningfulness not_assessable without AI", () => {
    const checks = dim({ model: model({ contentTypes: [t] }) });
    expect(checks.find((c) => c.id === "schemaDebt.namingConsistency")?.status).toBe("pass");
    expect(checks.find((c) => c.id === "schemaDebt.namingMeaningful")?.status).toBe("not_assessable");
  });

  it("fails meaningfulness when a confirmed judgment flags cryptic names", () => {
    const sa = semantic({ judgments: [{ kind: "namingIsCryptic", checkId: "schemaDebt.namingMeaningful", subject: "_dimension", verdict: "confirmed", confidence: 0.9, rationale: "f1, x2" }] });
    expect(dim({ model: model({ contentTypes: [t] }), semantic: sa }).find((c) => c.id === "schemaDebt.namingMeaningful")?.status).toBe("fail");
  });
});
