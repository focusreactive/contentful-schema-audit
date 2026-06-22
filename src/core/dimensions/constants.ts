import type { Tier } from "./types.js";

export const TIER_WEIGHT: Record<Tier, number> = {
  high: 1.5,
  medium: 1.0,
  situational: 0.5,
};
