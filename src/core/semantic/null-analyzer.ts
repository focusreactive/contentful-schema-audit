import type { SemanticAnalyzer } from "./types.js";

export const nullSemanticAnalyzer: SemanticAnalyzer = {
  analyze: async () => undefined,
};
