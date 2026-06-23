import { createHash } from "node:crypto";
import type { NormalizedModel } from "../model/index.js";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function hashModel(model: NormalizedModel): string {
  const schema = { cms: model.cms, contentTypes: model.contentTypes, locales: model.locales };
  return createHash("sha256").update(stableStringify(schema)).digest("hex");
}
