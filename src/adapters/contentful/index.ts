import type { CmsAdapter, Access, AcquireOpts, DetectResult, FetchedPage, FetchedModel } from "../../core/adapter.js";
import type { CapabilityManifest, Signal } from "../../core/signals/index.js";
import { detectContentful } from "./detect.js";
import { collectTokenCandidates, MAX_CANDIDATES } from "./sniff-token.js";
import { logDetection } from "./log.js";
import { fetchContentTypes, fetchLocales, validateDeliveryToken } from "./cda-client.js";
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
    const debug = opts.debug ?? false;

    const spaceId = opts.providedSpaceId ?? detect.spaceId;
    logDetection(
      debug,
      "spaceId",
      spaceId,
      opts.providedSpaceId ? "provided-flag" : (detect.spaceIdSource ?? "not-found"),
    );
    if (!spaceId) throw new AccessError("No Contentful space id detected. Pass --space-id.");

    const environment = opts.environment ?? DEFAULT_ENVIRONMENT;

    if (opts.providedToken) {
      logDetection(debug, "token", opts.providedToken, "provided-flag");
      return {
        spaceId,
        environment,
        deliveryToken: opts.providedToken,
        region: opts.region ?? detect.region ?? "global",
        acquisition: "provided",
      };
    }

    const candidates = collectTokenCandidates(opts.page);
    const considered = candidates.slice(0, MAX_CANDIDATES);
    if (debug && candidates.length > considered.length) {
      process.stderr.write(
        `[contentful] token candidates truncated: ${candidates.length} found, trying first ${considered.length}\n`,
      );
    }

    for (const candidate of considered) {
      const probeRegion = opts.region ?? detect.region ?? candidate.region;
      const valid = await validateDeliveryToken(spaceId, probeRegion, candidate.token);

      if (debug) {
        process.stderr.write(
          `[contentful] token probe source=${candidate.source} result=${valid ? "valid" : "invalid"}\n`,
        );
      }

      if (valid) {
        logDetection(debug, "token", candidate.token, candidate.source);
        return {
          spaceId,
          environment,
          deliveryToken: candidate.token,
          region: probeRegion,
          acquisition: "sniffed",
        };
      }
    }

    logDetection(debug, "token", undefined, "not-found");
    throw new AccessError(
      `Could not find a valid Contentful delivery token on the site (tried ${considered.length} candidate(s)). Pass --token with a read-only delivery token.`,
    );
  },

  async fetchModel(access: Access): Promise<FetchedModel> {
    const [contentTypes, locales] = await Promise.all([fetchContentTypes(access), fetchLocales(access)]);

    const model = normalize({
      contentTypes,
      locales,
      spaceId: access.spaceId,
      environment: access.environment,
      fetchedAt: nowIso(),
    });

    return {
      model,
      rawSchema: {
        contentTypes,
        locales,
      },
    };
  },

  capabilities(): CapabilityManifest {
    return {
      cms: "contentful",
      providedSignals: PROVIDED_SIGNALS,
      notes: { composable: COMPOSABLE_NOTE },
    };
  },
};
