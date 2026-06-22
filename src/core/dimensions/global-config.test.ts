import { globalConfigDimension as cfg } from "./global-config.js";
import { type, model } from "../../../test/fixtures/models/factories.js";

describe("globalConfigDimension", () => {
  it("passes settingsType when a singleton settings type exists", () => {
    const c = cfg.evaluate(model({ contentTypes: [type({ id: "siteSettings" })] })).find((x) => x.id === "globalConfig.settingsType");
    expect(c?.status).toBe("pass");
  });

  it("fails redirects when no redirect type is modeled", () => {
    const c = cfg.evaluate(model({ contentTypes: [type({ id: "page" })] })).find((x) => x.id === "globalConfig.redirects");
    expect(c?.status).toBe("fail");
  });
});
