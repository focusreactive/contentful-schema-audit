import { scoreModel } from "./scoring.js";
import { type, model, semantic } from "../../test/fixtures/models/factories.js";
import type { CapabilityManifest } from "./signals/index.js";

const allSignals: CapabilityManifest = {
  cms: "contentful",
  providedSignals: ["contentType.fields", "contentType.displayField", "contentType.description",
    "contentType.timestamps", "field.type", "field.required", "field.localized", "field.validations",
    "field.editorState", "field.linkTarget", "field.allowedLinkTypes", "locales", "locales.fallbackCode",
    "locales.fallbackSupported", "referenceGraph"],
};

describe("scoreModel", () => {
  it("marks a dimension not_assessable when a required signal is missing", () => {
    const limited: CapabilityManifest = { cms: "contentful", providedSignals: ["contentType.fields"] };
    const result = scoreModel(model({ contentTypes: [type({ id: "article" })] }), limited);
    const refs = result.dimensions.find((d) => d.id === "referentialIntegrity");
    expect(refs?.state).toBe("not_assessable");
    expect(refs?.score).toBeUndefined();
  });

  it("marks i18n not_applicable for a single-locale space", () => {
    const result = scoreModel(model({ contentTypes: [type({ id: "article" })] }), allSignals);
    expect(result.dimensions.find((d) => d.id === "i18n")?.state).toBe("not_applicable");
  });

  it("averages only scored dimensions weighted by tier", () => {
    const result = scoreModel(model({ contentTypes: [type({ id: "article" })] }), allSignals);
    expect(result.overall.score).not.toBeNull();
    expect(result.overall.score as number).toBeGreaterThanOrEqual(0);
    expect(result.overall.score as number).toBeLessThanOrEqual(100);
    expect(result.overall.scoredCount + result.overall.notApplicableCount + result.overall.notAssessableCount).toBe(10);
  });

  it("returns not_assessed band when no dimensions can be scored", () => {
    const noSignals: CapabilityManifest = { cms: "contentful", providedSignals: [] };
    const result = scoreModel(model({ contentTypes: [type({ id: "article" })] }), noSignals);
    expect(result.overall.score).toBeNull();
    expect(result.overall.band).toBe("not_assessed");
  });
});

describe("scoreModel semantic wiring", () => {
  it("adds semantic.analysis to provided signals only when analysis is supplied", () => {
    const m = model({ contentTypes: [type({ id: "article" })] });
    const withoutAi = scoreModel(m, allSignals);
    const withAi = scoreModel(m, allSignals, semantic());
    expect(withoutAi.dimensions.find((d) => d.id === "seo")?.state).toBe("not_assessable");
    // seo becomes assessable (here: not_applicable, since no page role is present in the empty stub)
    expect(withAi.dimensions.find((d) => d.id === "seo")?.state).not.toBe("not_assessable");
  });
});
