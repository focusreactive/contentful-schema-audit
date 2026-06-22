import type { Narrator } from "./narrator.js";

export const nullNarrator: Narrator = {
  narrate: async () => undefined,
};
