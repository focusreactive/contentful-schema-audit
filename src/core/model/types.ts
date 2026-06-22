export type CmsId = "contentful" | "sanity";

export type FieldType =
  | "text"
  | "longText"
  | "richText"
  | "number"
  | "integer"
  | "boolean"
  | "date"
  | "location"
  | "json"
  | "link"
  | "array"
  | "unknown";

export type LinkTarget = "entry" | "asset" | "unknown";

export type ValidationKind =
  | "unique"
  | "regexp"
  | "size"
  | "range"
  | "in"
  | "linkContentType"
  | "linkMimetypeGroup"
  | "assetFileSize"
  | "assetImageDimensions"
  | "other";

export interface ValidationRule {
  kind: ValidationKind;
  params?: Record<string, unknown>;
}

export interface FieldItems {
  type: FieldType;
  linkTarget?: LinkTarget;
  allowedLinkTypes?: string[];
  validations: ValidationRule[];
}

export interface NormalizedField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  localized?: boolean;
  editorState?: {
    hidden?: boolean;
    readOnly?: boolean;
  };
  validations: ValidationRule[];
  linkTarget?: LinkTarget;
  allowedLinkTypes?: string[];
  items?: FieldItems;
}

export interface NormalizedContentType {
  id: string;
  name: string;
  description?: string;
  displayField?: string;
  fields: NormalizedField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NormalizedLocale {
  code: string;
  name?: string;
  default: boolean;
  fallbackCode: string | null;
  supportsFallback: boolean;
}

export interface ReferenceEdge {
  fromType: string;
  fromField: string;
  toTypes: string[];
  viaArray: boolean;
}

export interface ReferenceGraph {
  typeIds: string[];
  edges: ReferenceEdge[];
}

export interface NormalizedModel {
  cms: CmsId;
  spaceId: string;
  environment: string;
  contentTypes: NormalizedContentType[];
  locales: NormalizedLocale[];
  referenceGraph: ReferenceGraph;
  meta: {
    fetchedAt: string;
    contentTypeCount: number;
    localeCount: number;
  };
}
