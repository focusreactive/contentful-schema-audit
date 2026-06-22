import type {
  FieldType,
  LinkTarget,
  NormalizedContentType,
  NormalizedField,
  NormalizedLocale,
  NormalizedModel,
  ValidationKind,
  ValidationRule,
} from "../../core/model/index.js";
import { buildReferenceGraph } from "../../core/model/index.js";
import type { RawContentType, RawField, RawLocale } from "./raw-types.js";

const FIELD_TYPE_MAP: Record<string, FieldType> = {
  Symbol: "text",
  Text: "longText",
  RichText: "richText",
  Integer: "integer",
  Number: "number",
  Boolean: "boolean",
  Date: "date",
  Location: "location",
  Object: "json",
  Link: "link",
  Array: "array",
};

const VALIDATION_KIND_MAP: Record<string, ValidationKind> = {
  unique: "unique",
  regexp: "regexp",
  size: "size",
  range: "range",
  in: "in",
  linkContentType: "linkContentType",
  linkMimetypeGroup: "linkMimetypeGroup",
  assetFileSize: "assetFileSize",
  assetImageDimensions: "assetImageDimensions",
};

function mapFieldType(rawType: string): FieldType {
  return FIELD_TYPE_MAP[rawType] ?? "unknown";
}

function mapLinkTarget(linkType: string | undefined): LinkTarget {
  if (linkType === "Entry") return "entry";
  if (linkType === "Asset") return "asset";

  return "unknown";
}

function mapValidations(raw: Array<Record<string, unknown>> | undefined): ValidationRule[] {
  if (!raw) return [];
  return raw.flatMap((entry) => {
    const key = Object.keys(entry)[0];
    if (!key) return [];
    return [{ kind: VALIDATION_KIND_MAP[key] ?? "other", params: { [key]: entry[key] } }];
  });
}

function allowedLinkTypes(validations: Array<Record<string, unknown>> | undefined): string[] | undefined {
  const rule = validations?.find((v) => "linkContentType" in v);
  return rule ? (rule.linkContentType as string[]) : undefined;
}

function mapField(raw: RawField): NormalizedField {
  const type = mapFieldType(raw.type);
  const field: NormalizedField = {
    id: raw.id,
    name: raw.name,
    type,
    required: raw.required,
    localized: raw.localized,
    editorState: {
      hidden: raw.disabled,
      readOnly: raw.omitted,
    },
    validations: mapValidations(raw.validations),
  };

  if (type === "link") {
    field.linkTarget = mapLinkTarget(raw.linkType);
    field.allowedLinkTypes = allowedLinkTypes(raw.validations);
  }

  if (type === "array" && raw.items) {
    field.items = {
      type: mapFieldType(raw.items.type),
      linkTarget: raw.items.linkType ? mapLinkTarget(raw.items.linkType) : undefined,
      allowedLinkTypes: allowedLinkTypes(raw.items.validations),
      validations: mapValidations(raw.items.validations),
    };
  }

  return field;
}

function mapContentType(raw: RawContentType): NormalizedContentType {
  return {
    id: raw.sys.id,
    name: raw.name,
    description: raw.description ?? undefined,
    displayField: raw.displayField ?? undefined,
    createdAt: raw.sys.createdAt,
    updatedAt: raw.sys.updatedAt,
    fields: raw.fields.map(mapField),
  };
}

function mapLocale(raw: RawLocale): NormalizedLocale {
  return {
    code: raw.code,
    name: raw.name,
    default: raw.default,
    fallbackCode: raw.fallbackCode,
    supportsFallback: true,
  };
}

export function normalize(raw: {
  contentTypes: RawContentType[];
  locales: RawLocale[];
  spaceId: string;
  environment: string;
  fetchedAt: string;
}): NormalizedModel {
  const contentTypes = raw.contentTypes.map(mapContentType);
  const locales = raw.locales.map(mapLocale);

  return {
    cms: "contentful",
    spaceId: raw.spaceId,
    environment: raw.environment,
    contentTypes,
    locales,
    referenceGraph: buildReferenceGraph(contentTypes),
    meta: {
      fetchedAt: raw.fetchedAt,
      contentTypeCount: contentTypes.length,
      localeCount: locales.length,
    },
  };
}
