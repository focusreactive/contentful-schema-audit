import type { FetchedPage } from "../../core/adapter.js";

const CONTENTFUL_API_HOST_RE = /(?:cdn|graphql)(\.eu)?\.contentful\.com/i;
const CONTENTFUL_EU_HOST_RE = /\.eu\.contentful\.com/i;
const ACCESS_TOKEN_PARAM_RE = /[?&]access_token=([A-Za-z0-9_-]{10,})/;
const BEARER_RE = /Bearer\s+([A-Za-z0-9_-]{10,})/i;

export type TokenSource = "query-param" | "bearer-header" | "page-body";

export interface SniffResult {
  token?: string;
  region: "global" | "eu";
  source?: TokenSource;
}

function isApiRequest(url: string): boolean {
  return CONTENTFUL_API_HOST_RE.test(url);
}

export function sniffToken(page: FetchedPage): SniffResult {
  for (const request of page.requests) {
    if (!isApiRequest(request.url)) continue;

    const region = CONTENTFUL_EU_HOST_RE.test(request.url) ? "eu" : "global";
    const paramMatch = ACCESS_TOKEN_PARAM_RE.exec(request.url);

    if (paramMatch) {
      return {
        token: paramMatch[1],
        region,
        source: "query-param",
      };
    }

    const authHeader = request.headers.authorization ?? request.headers.Authorization;
    const bearerMatch = authHeader ? BEARER_RE.exec(authHeader) : null;

    if (bearerMatch) {
      return {
        token: bearerMatch[1],
        region,
        source: "bearer-header",
      };
    }
  }

  const body = [page.html, ...page.scripts].join("\n");
  const paramInBody = ACCESS_TOKEN_PARAM_RE.exec(body);

  if (paramInBody) {
    return {
      token: paramInBody[1],
      region: "global",
      source: "page-body",
    };
  }

  return { region: "global" };
}
