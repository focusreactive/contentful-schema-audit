import type { Severity } from "./types.js";

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 3,
  major: 2,
  minor: 1,
};

export const GOOD_THRESHOLD = 80;
export const WARN_THRESHOLD = 60;
