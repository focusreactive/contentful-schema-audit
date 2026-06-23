import { vi } from "vitest";

const { generateObject } = vi.hoisted(() => ({ generateObject: vi.fn() }));
vi.mock("ai", () => ({ generateObject }));
vi.mock("@ai-sdk/openai", () => ({ openai: () => "model" }));

import { createAiNarrator } from "./ai-narrator.js";
import type { NarrationInput } from "./narrator.js";

const input: NarrationInput = {
  overall: { score: 50, band: "poor", scoredCount: 1, notAssessableCount: 0, notApplicableCount: 0 },
  dimensions: [],
};

describe("createAiNarrator", () => {
  afterEach(() => vi.restoreAllMocks());

  it("folds the model's id-keyed arrays into the record-shaped narration", async () => {
    generateObject.mockResolvedValue({
      object: {
        overall: "ok",
        dimensions: [{ id: "seo", narration: "weak seo" }],
        findings: [{ id: "seo.title", impact: "lower CTR", fix: "add metaTitle" }],
      },
    });
    const narrator = createAiNarrator();
    await expect(narrator.narrate(input)).resolves.toEqual({
      overall: "ok",
      dimensions: { seo: "weak seo" },
      findings: { "seo.title": { impact: "lower CTR", fix: "add metaTitle" } },
    });
  });

  it("returns empty records when the model emits no dimensions or findings", async () => {
    generateObject.mockResolvedValue({ object: { overall: "ok", dimensions: [], findings: [] } });
    const narrator = createAiNarrator();
    await expect(narrator.narrate(input)).resolves.toEqual({ overall: "ok", dimensions: {}, findings: {} });
  });

  it("returns undefined and does not throw when the model errors", async () => {
    generateObject.mockRejectedValue(new Error("rate limit"));
    const narrator = createAiNarrator();
    await expect(narrator.narrate(input)).resolves.toBeUndefined();
  });
});
