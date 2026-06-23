import { globalConfigDimension as gc } from "./global-config.js";
import { type, model, semantic } from "../../../test/fixtures/models/factories.js";

const dim = gc.evaluate;

describe("globalConfigDimension", () => {
  it("passes settings/nav when those roles exist", () => {
    const sa = semantic({ roleMap: { types: { cfg: [{ role: "settings", confidence: 0.9 }], topbar: [{ role: "nav", confidence: 0.9 }] }, fields: {} } });
    const checks = dim({ model: model({ contentTypes: [type({ id: "cfg" }), type({ id: "topbar" })] }), semantic: sa });
    expect(checks.find((c) => c.id === "globalConfig.settingsType")?.status).toBe("pass");
    expect(checks.find((c) => c.id === "globalConfig.navModeled")?.status).toBe("pass");
  });

  it("passes redirects when absence is refuted (handled at the edge)", () => {
    const sa = semantic({ judgments: [{ kind: "redirectsAreMissing", checkId: "globalConfig.redirects", subject: "_dimension", verdict: "refuted", confidence: 0.9, rationale: "edge redirects" }] });
    expect(dim({ model: model({ contentTypes: [type({ id: "cfg" })] }), semantic: sa }).find((c) => c.id === "globalConfig.redirects")?.status).toBe("pass");
  });

  it("fails redirects when a missing redirect type is confirmed a real gap", () => {
    const sa = semantic({ judgments: [{ kind: "redirectsAreMissing", checkId: "globalConfig.redirects", subject: "_dimension", verdict: "confirmed", confidence: 0.9, rationale: "no redirect handling" }] });
    expect(dim({ model: model({ contentTypes: [type({ id: "cfg" })] }), semantic: sa }).find((c) => c.id === "globalConfig.redirects")?.status).toBe("fail");
  });
});
