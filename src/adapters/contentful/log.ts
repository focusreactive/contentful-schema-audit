export type DetectionField = "spaceId" | "token";

export type DetectionSource =
  | "provided-flag"
  | "asset-host"
  | "api-host"
  | "query-param"
  | "bearer-header"
  | "page-body"
  | "not-found";

export function logDetection(
  debug: boolean,
  field: DetectionField,
  value: string | undefined,
  source: DetectionSource,
): void {
  if (!debug) return;

  const rendered = value && value.length > 0 ? value : "<none>";

  process.stderr.write(`[contentful] detect field=${field} value=${rendered} source=${source}\n`);
}
