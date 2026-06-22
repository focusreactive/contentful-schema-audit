import type { DimensionDefinition } from "./types.js";
import { seoDimension } from "./seo.js";
import { modelingDimension } from "./modeling.js";
import { referentialIntegrityDimension } from "./referential-integrity.js";
import { validationDimension } from "./validation.js";
import { slugDimension } from "./slug.js";
import { assetsDimension } from "./assets.js";
import { i18nDimension } from "./i18n.js";
import { composableDimension } from "./composable.js";
import { globalConfigDimension } from "./global-config.js";
import { schemaDebtDimension } from "./schema-debt.js";

export const DIMENSIONS: DimensionDefinition[] = [
  seoDimension,
  modelingDimension,
  referentialIntegrityDimension,
  validationDimension,
  slugDimension,
  assetsDimension,
  i18nDimension,
  composableDimension,
  globalConfigDimension,
  schemaDebtDimension,
];

export type { DimensionDefinition } from "./types.js";
export { TIER_WEIGHT } from "./constants.js";
