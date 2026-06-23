import { vi } from "vitest";

const { generateObject } = vi.hoisted(() => ({ generateObject: vi.fn() }));
vi.mock("ai", () => ({ generateObject }));
vi.mock("@ai-sdk/openai", () => ({ openai: () => "model" }));

import { createAiSemanticAnalyzer } from "./ai-analyzer.js";
import { model, type } from "../../../test/fixtures/models/factories.js";

const m = model({ contentTypes: [type({ id: "page" })] });

describe("createAiSemanticAnalyzer", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps raw output into a keyed SemanticAnalysis", async () => {
    generateObject.mockResolvedValue({
      object: {
        typeRoles: [{ typeId: "page", role: "page", confidence: 0.9 }],
        fieldRoles: [],
        judgments: [],
      },
    });
    const analysis = await createAiSemanticAnalyzer({ model: "m" }).analyze(m);
    expect(analysis?.roleMap.types.page).toEqual([{ role: "page", confidence: 0.9 }]);
    expect(analysis?.model).toBe("m");
  });

  it("returns undefined and does not throw when the model errors", async () => {
    generateObject.mockRejectedValue(new Error("rate limit"));
    await expect(createAiSemanticAnalyzer().analyze(m)).resolves.toBeUndefined();
  });
});
