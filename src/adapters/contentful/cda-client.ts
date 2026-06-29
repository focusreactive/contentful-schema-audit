import type { Access } from "../../core/adapter.js";
import { contentTypesResponseSchema, localesResponseSchema } from "./raw-types.js";
import type { RawContentType, RawLocale } from "./raw-types.js";

export const PAGE_LIMIT = 100;
const HOST_BY_REGION = {
  global: "cdn.contentful.com",
  eu: "cdn.eu.contentful.com",
} as const;

export interface CdaDeps {
  fetch: typeof fetch;
}

export class CdaError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
  ) {
    super(`Contentful CDA request to ${endpoint} failed with status ${status}`);
    this.name = "CdaError";
  }
}

function baseUrl(access: Access): string {
  return `https://${HOST_BY_REGION[access.region]}/spaces/${access.spaceId}/environments/${access.environment}`;
}

async function getJson(url: string, token: string, deps: CdaDeps): Promise<unknown> {
  const separator = url.includes("?") ? "&" : "?";
  const response = await deps.fetch(`${url}${separator}access_token=${token}`);
  if (!response.ok) throw new CdaError(response.status, url);

  return response.json();
}

export async function fetchContentTypes(access: Access, deps: CdaDeps = { fetch }): Promise<RawContentType[]> {
  const items: RawContentType[] = [];
  let skip = 0;

  for (;;) {
    const url = `${baseUrl(access)}/content_types?limit=${PAGE_LIMIT}&skip=${skip}`;
    const parsed = contentTypesResponseSchema.parse(await getJson(url, access.deliveryToken, deps));

    items.push(...parsed.items);
    if (parsed.items.length < PAGE_LIMIT) return items;
    skip += PAGE_LIMIT;
  }
}

export async function fetchLocales(access: Access, deps: CdaDeps = { fetch }): Promise<RawLocale[]> {
  const url = `${baseUrl(access)}/locales`;

  return localesResponseSchema.parse(await getJson(url, access.deliveryToken, deps)).items;
}

export async function validateDeliveryToken(
  spaceId: string,
  region: "global" | "eu",
  token: string,
  deps: CdaDeps = { fetch },
): Promise<boolean> {
  const response = await deps.fetch(`https://${HOST_BY_REGION[region]}/spaces/${spaceId}?access_token=${token}`);

  return response.ok;
}
