import { toSemanticAnalysis } from "./mapper.js";

describe("toSemanticAnalysis", () => {
  it("groups flat role arrays into keyed records and keeps judgments", () => {
    const result = toSemanticAnalysis(
      {
        typeRoles: [
          { typeId: "page", role: "page", confidence: 0.9 },
          { typeId: "page", role: "settings", confidence: 0.3 },
        ],
        fieldRoles: [{ typeId: "page", fieldId: "slug", role: "slug", confidence: 0.8 }],
        judgments: [
          { kind: "orphanIsDebt", subject: "blog", verdict: "refuted", confidence: 0.7, rationale: "ok" },
        ],
      },
      "gpt-test",
    );

    expect(result.roleMap.types.page).toEqual([
      { role: "page", confidence: 0.9 },
      { role: "settings", confidence: 0.3 },
    ]);
    expect(result.roleMap.fields["page.slug"]).toEqual([{ role: "slug", confidence: 0.8 }]);
    expect(result.judgments).toHaveLength(1);
    expect(result.model).toBe("gpt-test");
  });

  it("derives the consumer checkId from each judgment kind", () => {
    const result = toSemanticAnalysis(
      {
        typeRoles: [],
        fieldRoles: [],
        judgments: [
          { kind: "orphanIsDebt", subject: "blog", verdict: "confirmed", confidence: 0.9, rationale: "a" },
          { kind: "godTypeIsProblem", subject: "page", verdict: "confirmed", confidence: 0.9, rationale: "b" },
          { kind: "namingIsCryptic", subject: "_dimension", verdict: "refuted", confidence: 0.9, rationale: "c" },
          { kind: "redirectsAreMissing", subject: "_dimension", verdict: "uncertain", confidence: 0.5, rationale: "d" },
        ],
      },
      "gpt-test",
    );

    expect(result.judgments.map((j) => [j.kind, j.checkId])).toEqual([
      ["orphanIsDebt", "refs.noOrphans"],
      ["godTypeIsProblem", "modeling.godTypes"],
      ["namingIsCryptic", "schemaDebt.namingMeaningful"],
      ["redirectsAreMissing", "globalConfig.redirects"],
    ]);
  });
});
