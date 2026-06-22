import type { Signal } from "./types.js";

export * from "./types.js";

export function isAssessable(required: Signal[], provided: Signal[]): boolean {
  return required.every((signal) => provided.includes(signal));
}
