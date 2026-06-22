import type { DetectResult, FetchedPage } from "../../core/adapter.js";

const ASSET_HOST_RE = /(?:images|assets|downloads|videos)(\.eu)?(?:\.secure)?\.ctfassets\.net\/([a-z0-9]+)\//i;

export function detectContentful(page: FetchedPage): DetectResult {
  const haystack = [page.html, ...page.scripts, ...page.requests.map((r) => r.url)].join("\n");

  const match = ASSET_HOST_RE.exec(haystack);
  if (!match) {
    return {
      isMatch: false,
      signals: [],
    };
  }

  return {
    isMatch: true,
    spaceId: match[2],
    region: match[1] ? "eu" : "global",
    signals: [`Found Contentful asset host: ${match[0]}`],
  };
}
