import type { CmsId } from "../model/index.js";

export type DimensionId =
  | "seo"
  | "modeling"
  | "referentialIntegrity"
  | "validation"
  | "slug"
  | "assets"
  | "i18n"
  | "composable"
  | "globalConfig"
  | "schemaDebt";

export type Signal =
  | "contentType.fields"
  | "contentType.displayField"
  | "contentType.description"
  | "contentType.timestamps"
  | "field.type"
  | "field.required"
  | "field.localized"
  | "field.validations"
  | "field.editorState"
  | "field.linkTarget"
  | "field.allowedLinkTypes"
  | "locales"
  | "locales.fallbackCode"
  | "locales.fallbackSupported"
  | "referenceGraph"
  | "entries.sample";

export interface CapabilityManifest {
  cms: CmsId;
  providedSignals: Signal[];
  notes?: Partial<Record<DimensionId, string>>;
}
