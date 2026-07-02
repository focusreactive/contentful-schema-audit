export const EXIT_OK = 0;
export const EXIT_OPERATIONAL = 1;
export const EXIT_AI_INPUT = 2;

export class AiInputError extends Error {
  constructor(
    public readonly file: string,
    public readonly issues: string[],
  ) {
    super([`${file} failed validation:`, ...issues.map((issue, i) => `  ${i + 1}. ${issue}`)].join("\n"));
    this.name = "AiInputError";
  }
}
