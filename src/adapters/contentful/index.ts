import type { CmsAdapter, Access, AcquireOpts, DetectResult, FetchedPage } from "../../core/adapter.js";
import type { CapabilityManifest, Signal } from "../../core/signals/index.js";
import type { NormalizedModel } from "../../core/model/index.js";
import { detectContentful } from "./detect.js";
import { sniffToken } from "./sniff-token.js";
import { fetchContentTypes, fetchLocales } from "./cda-client.js";
import { normalize } from "./normalize.js";

const DEFAULT_ENVIRONMENT = "master";

const PROVIDED_SIGNALS: Signal[] = [
  "contentType.fields",
  "contentType.displayField",
  "contentType.description",
  "contentType.timestamps",
  "field.type",
  "field.required",
  "field.localized",
  "field.validations",
  "field.editorState",
  "field.linkTarget",
  "field.allowedLinkTypes",
  "locales",
  "locales.fallbackCode",
  "locales.fallbackSupported",
  "referenceGraph",
];

const COMPOSABLE_NOTE =
  "Editor-interface UX (widgets, sidebar, appearance) requires a management token and is not assessable from a public URL; only the content modeling is scored.";

export class AccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessError";
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export const contentfulAdapter: CmsAdapter = {
  id: "contentful",

  detect(page: FetchedPage): DetectResult {
    return detectContentful(page);
  },

  async acquireAccess(detect: DetectResult, opts: AcquireOpts): Promise<Access> {
    const spaceId = opts.providedSpaceId ?? detect.spaceId;
    if (!spaceId) throw new AccessError("No Contentful space id detected. Pass --space-id.");

    const environment = opts.environment ?? DEFAULT_ENVIRONMENT;

    if (opts.providedToken) {
      return {
        spaceId,
        environment,
        deliveryToken: opts.providedToken,
        region: opts.region ?? detect.region ?? "global",
        acquisition: "provided",
      };
    }

    const sniffed = sniffToken(opts.page);
    if (sniffed.token) {
      return {
        spaceId,
        environment,
        deliveryToken: sniffed.token,
        region: opts.region ?? detect.region ?? sniffed.region,
        acquisition: "sniffed",
      };
    }

    throw new AccessError(
      "Could not find a Contentful delivery token on the site. Pass --token with a read-only delivery token.",
    );
  },

  async fetchModel(access: Access): Promise<NormalizedModel> {
    const [contentTypes, locales] = await Promise.all([fetchContentTypes(access), fetchLocales(access)]);

    return normalize({
      contentTypes,
      locales,
      spaceId: access.spaceId,
      environment: access.environment,
      fetchedAt: nowIso(),
    });
  },

  capabilities(): CapabilityManifest {
    return {
      cms: "contentful",
      providedSignals: PROVIDED_SIGNALS,
      notes: { composable: COMPOSABLE_NOTE },
    };
  },
};
