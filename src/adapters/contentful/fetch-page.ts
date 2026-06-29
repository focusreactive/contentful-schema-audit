import { chromium } from "playwright";
import type { BrowserContext, Page } from "playwright";
import type { FetchedPage, ObservedRequest } from "../../core/adapter.js";

const NAVIGATION_TIMEOUT_MS = 30_000;
const SETTLE_TIMEOUT_MS = 8_000;
const SCRIPT_HOST_RE = /\.contentful\.com|\.ctfassets\.net/i;
const RESPONSE_BODY_MAX_BYTES = 512 * 1024;
const SNIFFABLE_CONTENT_TYPE_RE = /application\/json|text\//i;

interface StorageLike {
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
}

export function isSniffableResponse(resourceType: string, contentType: string | undefined): boolean {
  if (resourceType !== "xhr" && resourceType !== "fetch") return false;
  if (!contentType) return false;

  return SNIFFABLE_CONTENT_TYPE_RE.test(contentType);
}

export async function collectFetchedPage(
  url: string,
  page: Pick<Page, "url" | "content">,
  requests: ObservedRequest[],
  scripts: string[],
  responseBodies: string[],
  cookies: {
    name: string;
    value: string;
  }[],
  storage: {
    local: Record<string, string>;
    session: Record<string, string>;
  },
): Promise<FetchedPage> {
  return {
    url,
    finalUrl: page.url(),
    html: await page.content(),
    scripts,
    requests,
    responseBodies,
    cookies,
    storage,
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
    const responseBodies: string[] = [];

    page.on("request", (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData() ?? undefined,
      });
    });

    page.on("response", async (response) => {
      if (SCRIPT_HOST_RE.test(response.url())) return;
      const resourceType = response.request().resourceType();

      if (resourceType === "script") {
        try {
          scripts.push(await response.text());
        } catch {
          // Non-text or already-consumed bodies are skipped; the regex sniff still covers inline HTML.
        }

        return;
      }

      if (isSniffableResponse(resourceType, response.headers()["content-type"])) {
        try {
          const text = await response.text();
          if (text.length <= RESPONSE_BODY_MAX_BYTES) responseBodies.push(text);
        } catch {
          // Non-text or already-consumed bodies are skipped.
        }
      }
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });

    await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS }).catch(() => {});

    const cookies = (await context.cookies()).map((cookie) => ({ name: cookie.name, value: cookie.value }));

    const storage = await page.evaluate(() => {
      const root = globalThis as unknown as {
        localStorage?: StorageLike;
        sessionStorage?: StorageLike;
      };

      const result: { local: Record<string, string>; session: Record<string, string> } = {
        local: {},
        session: {},
      };

      try {
        for (const [target, store] of [
          ["local", root.localStorage],
          ["session", root.sessionStorage],
        ] as const) {
          if (!store) continue;

          for (let i = 0; i < store.length; i++) {
            const key = store.key(i);
            if (key !== null) result[target][key] = store.getItem(key) ?? "";
          }
        }
      } catch {
        return {
          local: {},
          session: {},
        };
      }

      return result;
    });

    const fetchedPage = await collectFetchedPage(url, page, requests, scripts, responseBodies, cookies, storage);

    return fetchedPage;
  } finally {
    await context?.close();
    await browser.close();
  }
}
