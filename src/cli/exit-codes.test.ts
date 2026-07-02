import { describe, expect, it } from "vitest";
import { AiInputError, EXIT_AI_INPUT, EXIT_OK, EXIT_OPERATIONAL } from "./exit-codes.js";

describe("exit codes", () => {
  it("defines the 0/1/2 contract", () => {
    expect(EXIT_OK).toBe(0);
    expect(EXIT_OPERATIONAL).toBe(1);
    expect(EXIT_AI_INPUT).toBe(2);
  });
});

describe("AiInputError", () => {
  it("formats a numbered issue list naming the file", () => {
    const err = new AiInputError("semantic.json", ["first problem", "second problem"]);

    expect(err.message).toBe("semantic.json failed validation:\n  1. first problem\n  2. second problem");
    expect(err.issues).toEqual(["first problem", "second problem"]);
    expect(err.file).toBe("semantic.json");
  });
});
