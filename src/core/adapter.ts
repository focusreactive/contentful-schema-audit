import type { CmsId, NormalizedModel } from "./model/index.js";
import type { CapabilityManifest } from "./signals/index.js";

export interface ObservedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
}

export interface FetchedPage {
  url: string;
  finalUrl: string;
  html: string;
  scripts: string[];
  requests: ObservedRequest[];
  responseBodies: string[];
  cookies: {
    name: string;
    value: string;
  }[];
  storage: {
    local: Record<string, string>;
    session: Record<string, string>;
  };
}

export interface DetectResult {
  isMatch: boolean;
  spaceId?: string;
  spaceIdSource?: "asset-host" | "api-host";
  region?: "global" | "eu";
  signals: string[];
}

export interface Access {
  spaceId: string;
  environment: string;
  deliveryToken: string;
  region: "global" | "eu";
  acquisition: "sniffed" | "provided";
}

export interface RawSchema {
  contentTypes: unknown[];
  locales: unknown[];
}

export interface FetchedModel {
  model: NormalizedModel;
  rawSchema: RawSchema;
}

export interface AcquireOpts {
  page: FetchedPage;
  providedToken?: string;
  providedSpaceId?: string;
  environment?: string;
  region?: "global" | "eu";
  debug?: boolean;
}

export interface CmsAdapter {
  readonly id: CmsId;
  detect(page: FetchedPage): DetectResult;
  acquireAccess(detect: DetectResult, opts: AcquireOpts): Promise<Access>;
  fetchModel(access: Access): Promise<FetchedModel>;
  capabilities(): CapabilityManifest;
}
