import { semanticOutputSchema } from "./schema.js";

const valid = {
  typeRoles: [{ typeId: "page", role: "page", confidence: 0.9 }],
  fieldRoles: [{ typeId: "page", fieldId: "slug", role: "slug", confidence: 0.8 }],
  judgments: [
    { kind: "orphanIsDebt", subject: "blog", verdict: "refuted", confidence: 0.7, rationale: "fetched by slug" },
  ],
};

describe("semanticOutputSchema", () => {
  it("accepts a well-formed payload", () => {
    expect(semanticOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a judgment without a model-supplied checkId", () => {
    const noCheckId = {
      ...valid,
      judgments: [{ kind: "namingIsCryptic", subject: "_dimension", verdict: "refuted", confidence: 0.9, rationale: "clear" }],
    };
    expect(semanticOutputSchema.safeParse(noCheckId).success).toBe(true);
  });

  it("rejects an unknown role", () => {
    const bad = { ...valid, typeRoles: [{ typeId: "x", role: "widget", confidence: 0.9 }] };
    expect(semanticOutputSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects confidence outside 0..1", () => {
    const bad = { ...valid, typeRoles: [{ typeId: "x", role: "page", confidence: 1.4 }] };
    expect(semanticOutputSchema.safeParse(bad).success).toBe(false);
  });
});
