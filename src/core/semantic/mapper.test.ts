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
          { kind: "orphanIsDebt", checkId: "refs.noOrphans", subject: "blog", verdict: "refuted", confidence: 0.7, rationale: "ok" },
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
});
