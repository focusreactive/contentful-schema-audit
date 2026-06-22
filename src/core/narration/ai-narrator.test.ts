import { vi } from "vitest";

const { generateObject } = vi.hoisted(() => ({ generateObject: vi.fn() }));
vi.mock("ai", () => ({ generateObject }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: () => "model" }));

import { createAiNarrator } from "./ai-narrator.js";
import type { NarrationInput } from "./narrator.js";

const input: NarrationInput = {
  overall: { score: 50, band: "poor", scoredCount: 1, notAssessableCount: 0, notApplicableCount: 0 },
  dimensions: [],
};

describe("createAiNarrator", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns the generated narration object", async () => {
    generateObject.mockResolvedValue({ object: { overall: "ok", dimensions: {}, findings: {} } });
    const narrator = createAiNarrator();
    await expect(narrator.narrate(input)).resolves.toEqual({ overall: "ok", dimensions: {}, findings: {} });
  });

  it("returns undefined and does not throw when the model errors", async () => {
    generateObject.mockRejectedValue(new Error("rate limit"));
    const narrator = createAiNarrator();
    await expect(narrator.narrate(input)).resolves.toBeUndefined();
  });
});
