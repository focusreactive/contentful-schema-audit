import { i18nDimension } from "./i18n.js";
import { field, type, model } from "../../../test/fixtures/models/factories.js";

const multiLocale = [
  { code: "en-US", default: true, fallbackCode: null, supportsFallback: true },
  { code: "de-DE", default: false, fallbackCode: "en-US", supportsFallback: true },
];

describe("i18nDimension", () => {
  it("is not applicable for a single-locale space", () => {
    expect(i18nDimension.isApplicable?.({ model: model({}) })).toBe(false);
  });

  it("fails fallbackChain when a non-default locale has no fallback (CMS supports fallback)", () => {
    const locales = [
      { code: "en-US", default: true, fallbackCode: null, supportsFallback: true },
      { code: "fr", default: false, fallbackCode: null, supportsFallback: true },
    ];
    const c = i18nDimension.evaluate({ model: model({ locales }) }).find((x) => x.id === "i18n.fallbackChain");
    expect(c?.status).toBe("fail");
  });

  it("skips fallbackChain when CMS does not support fallback chains", () => {
    const locales = [
      { code: "en-US", default: true, fallbackCode: null, supportsFallback: false },
      { code: "fr", default: false, fallbackCode: null, supportsFallback: false },
    ];
    const checks = i18nDimension.evaluate({ model: model({ locales }) });
    expect(checks.find((x) => x.id === "i18n.fallbackChain")).toBeUndefined();
  });

  it("passes when fallbacks set and a field is localized", () => {
    const t = type({ id: "article", fields: [field({ id: "title", localized: true })] });
    const checks = i18nDimension.evaluate({ model: model({ locales: multiLocale, contentTypes: [t] }) });
    expect(checks.every((c) => c.status === "pass")).toBe(true);
  });
});
