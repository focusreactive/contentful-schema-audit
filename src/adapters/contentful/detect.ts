import type { DetectResult, FetchedPage } from "../../core/adapter.js";

const ASSET_HOST_RE = /(?:images|assets|downloads|videos)(\.eu)?(?:\.secure)?\.ctfassets\.net\/([a-z0-9]+)\//i;
const API_HOST_RE = /(?:cdn|preview)\.contentful\.com\/spaces\/([a-z0-9]+)\//i;

export function detectContentful(page: FetchedPage): DetectResult {
  const haystack = [page.html, ...page.scripts, ...page.requests.map((r) => r.url)].join("\n");

  const assetMatch = ASSET_HOST_RE.exec(haystack);
  if (assetMatch) {
    return {
      isMatch: true,
      spaceId: assetMatch[2],
      region: assetMatch[1] ? "eu" : "global",
      signals: [`Found Contentful asset host: ${assetMatch[0]}`],
    };
  }

  const apiMatch = API_HOST_RE.exec(haystack);
  if (apiMatch) {
    return {
      isMatch: true,
      spaceId: apiMatch[1],
      region: "global",
      signals: [`Found Contentful API host: ${apiMatch[0]}`],
    };
  }

  return {
    isMatch: false,
    signals: [],
  };
}
