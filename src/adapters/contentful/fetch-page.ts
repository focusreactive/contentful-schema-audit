import { chromium } from "playwright";
import type { BrowserContext, Page } from "playwright";
import type { FetchedPage, ObservedRequest } from "../../core/adapter.js";

const NAVIGATION_TIMEOUT_MS = 30_000;
const SETTLE_TIMEOUT_MS = 8_000;
const SCRIPT_HOST_RE = /\.contentful\.com|\.ctfassets\.net/i;

export async function collectFetchedPage(
  url: string,
  page: Pick<Page, "url" | "content">,
  requests: ObservedRequest[],
  scripts: string[],
): Promise<FetchedPage> {
  return {
    url,
    finalUrl: page.url(),
    html: await page.content(),
    scripts,
    requests,
  };
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const browser = await chromium.launch();
  let context: BrowserContext | undefined;

  try {
    context = await browser.newContext();
    const page = await context.newPage();

    const requests: ObservedRequest[] = [];
    const scripts: string[] = [];

    page.on("request", (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
      });
    });

    page.on("response", async (response) => {
      if (SCRIPT_HOST_RE.test(response.url())) return;
      if (response.request().resourceType() !== "script") return;

      try {
        scripts.push(await response.text());
      } catch {
        // Non-text or already-consumed bodies are skipped; the regex sniff still covers inline HTML.
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });

    await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => {});

    const fetchedPage = await collectFetchedPage(url, page, requests, scripts);

    return fetchedPage;
  } finally {
    await context?.close();
    await browser.close();
  }
}
