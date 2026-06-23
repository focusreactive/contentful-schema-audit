import { buildSemanticMessages } from "./prompt.js";
import { type, model } from "../../../test/fixtures/models/factories.js";

describe("buildSemanticMessages", () => {
  it("includes role/judgment guidance and the digest payload", () => {
    const { system, prompt } = buildSemanticMessages(model({ contentTypes: [type({ id: "page" })] }));
    expect(system).toMatch(/role/i);
    expect(system).toMatch(/confirmed/i);
    expect(prompt).toContain("page");
    expect(prompt).toContain("orphanCandidates");
  });
});
