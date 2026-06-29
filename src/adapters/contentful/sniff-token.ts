import type { FetchedPage } from "../../core/adapter.js";

const CONTENTFUL_API_HOST_RE = /(?:cdn|graphql)(\.eu)?\.contentful\.com/i;
const CONTENTFUL_EU_HOST_RE = /\.eu\.contentful\.com/i;
const ACCESS_TOKEN_PARAM_RE = /[?&]access_token=([A-Za-z0-9_-]{10,})/;
const BEARER_RE = /Bearer\s+([A-Za-z0-9_-]{10,})/i;
const TOKEN_KV_RE =
  /(?:access[_-]?token|delivery[_-]?token|cda[_-]?token|contentful[_-]?token)["']?\s*[:=]\s*["']?([A-Za-z0-9_-]{10,})/gi;

export const MAX_CANDIDATES = 25;

export type TokenSource =
  | "query-param"
  | "bearer-header"
  | "post-body"
  | "response-body"
  | "local-storage"
  | "session-storage"
  | "cookie"
  | "page-body";

export interface TokenCandidate {
  token: string;
  source: TokenSource;
  region: "global" | "eu";
}

function isApiRequest(url: string): boolean {
  return CONTENTFUL_API_HOST_RE.test(url);
}

function regionOf(text: string): "global" | "eu" {
  return CONTENTFUL_EU_HOST_RE.test(text) ? "eu" : "global";
}

function* matchKvTokens(text: string): Generator<string> {
  const re = new RegExp(TOKEN_KV_RE.source, TOKEN_KV_RE.flags);
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    yield match[1]!;
  }
}

export function collectTokenCandidates(page: FetchedPage): TokenCandidate[] {
  const candidates: TokenCandidate[] = [];

  const push = (token: string, source: TokenSource, region: "global" | "eu"): void => {
    candidates.push({ token, source, region });
  };

  // 1 & 2: query param and Authorization header on Contentful API requests.
  for (const request of page.requests) {
    if (!isApiRequest(request.url)) continue;
    const region = regionOf(request.url);

    const paramMatch = ACCESS_TOKEN_PARAM_RE.exec(request.url);
    if (paramMatch) push(paramMatch[1]!, "query-param", region);

    const authHeader = request.headers.authorization ?? request.headers.Authorization;
    const bearerMatch = authHeader ? BEARER_RE.exec(authHeader) : null;
    if (bearerMatch) push(bearerMatch[1]!, "bearer-header", region);
  }

  // 3: POST bodies (any host — covers proxies too).
  for (const request of page.requests) {
    if (!request.postData) continue;

    const region = regionOf(request.url);
    const paramMatch = ACCESS_TOKEN_PARAM_RE.exec(request.postData);
    if (paramMatch) push(paramMatch[1]!, "post-body", region);

    for (const token of matchKvTokens(request.postData)) push(token, "post-body", region);
  }

  // 4: XHR/fetch response bodies.
  for (const body of page.responseBodies) {
    for (const token of matchKvTokens(body)) push(token, "response-body", "global");
  }

  // 5: localStorage / sessionStorage.
  for (const [key, value] of Object.entries(page.storage.local)) {
    for (const token of matchKvTokens(`${key}=${value}`)) push(token, "local-storage", "global");
  }
  for (const [key, value] of Object.entries(page.storage.session)) {
    for (const token of matchKvTokens(`${key}=${value}`)) push(token, "session-storage", "global");
  }

  // 6: cookies.
  for (const cookie of page.cookies) {
    for (const token of matchKvTokens(`${cookie.name}=${cookie.value}`)) push(token, "cookie", "global");
  }

  // 7: page body (inline html + scripts).
  const body = [page.html, ...page.scripts].join("\n");
  const paramInBody = ACCESS_TOKEN_PARAM_RE.exec(body);
  if (paramInBody) push(paramInBody[1]!, "page-body", "global");
  for (const token of matchKvTokens(body)) push(token, "page-body", "global");

  return dedupe(candidates);
}

function dedupe(candidates: TokenCandidate[]): TokenCandidate[] {
  const seen = new Set<string>();
  const unique: TokenCandidate[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.token)) continue;

    seen.add(candidate.token);
    unique.push(candidate);
  }

  return unique;
}
