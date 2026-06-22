import type { DimensionDefinition } from "./types.js";
import type { NormalizedModel } from "../model/index.js";
import { allFields } from "./helpers.js";

export const i18nDimension: DimensionDefinition = {
  id: "i18n",
  title: "Internationalization",
  tier: "situational",
  requiredSignals: ["locales", "locales.fallbackSupported", "field.localized"],
  isApplicable: (model) => model.locales.length > 1,
  applicabilityReason: "Single-locale space — internationalization does not apply.",
  evaluate: (model: NormalizedModel) => {
    const nonDefault = model.locales.filter((l) => !l.default);
    const supportsFallback = model.locales.some((l) => l.supportsFallback);
    const deadEnds = supportsFallback ? nonDefault.filter((l) => l.supportsFallback && l.fallbackCode === null) : [];
    const localizedFields = allFields(model).filter((f) => f.localized === true);

    return [
      ...(supportsFallback ?
        [
          {
            id: "i18n.fallbackChain",
            title: "Locales have fallback chains",
            severity: "major" as const,
            status: deadEnds.length === 0 ? ("pass" as const) : ("fail" as const),
            evidence: {
              summary: `${deadEnds.length} of ${nonDefault.length} non-default locales have no fallback`,
              detail: { locales: deadEnds.map((l) => l.code) },
            },
            fixHint: "Set a fallbackCode on every non-default locale so missing translations degrade gracefully.",
          },
        ]
      : []),
      {
        id: "i18n.localizedFields",
        title: "Localization is actually used",
        severity: "minor",
        status: localizedFields.length > 0 ? "pass" : "fail",
        evidence: { summary: `${localizedFields.length} fields are marked localized` },
        fixHint: "Mark translatable fields as localized rather than configuring locales without using them.",
      },
    ];
  },
};
