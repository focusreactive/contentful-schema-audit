import { fieldHasRole, fieldKey, judgmentFor, resolveJudgment, typeHasRole } from "./roles.js";
import type { SemanticAnalysis } from "./types.js";

const sa: SemanticAnalysis = {
  roleMap: {
    types: { page: [{ role: "page", confidence: 0.9 }] },
    fields: { "page.slug": [{ role: "slug", confidence: 0.5 }] },
  },
  judgments: [
    { kind: "orphanIsDebt", checkId: "refs.noOrphans", subject: "blog", verdict: "confirmed", confidence: 0.8, rationale: "" },
    { kind: "orphanIsDebt", checkId: "refs.noOrphans", subject: "faq", verdict: "confirmed", confidence: 0.4, rationale: "" },
  ],
  model: "test",
};

describe("role lookups", () => {
  it("finds a type role above the confidence floor", () => {
    expect(typeHasRole(sa, "page", "page")).toBe(true);
    expect(typeHasRole(sa, "page", "settings")).toBe(false);
  });

  it("rejects a field role below the confidence floor", () => {
    expect(fieldHasRole(sa, "page", "slug", "slug")).toBe(false); // 0.5 < 0.6
    expect(fieldHasRole(sa, "page", "slug", "slug", 0.4)).toBe(true);
  });

  it("builds composite field keys", () => {
    expect(fieldKey("page", "slug")).toBe("page.slug");
  });
});

describe("resolveJudgment", () => {
  it("returns the verdict when confident", () => {
    expect(resolveJudgment(judgmentFor(sa, "refs.noOrphans", "blog"))).toBe("confirmed");
  });
  it("returns unknown when below the floor or missing", () => {
    expect(resolveJudgment(judgmentFor(sa, "refs.noOrphans", "faq"))).toBe("unknown");
    expect(resolveJudgment(undefined)).toBe("unknown");
  });
});
