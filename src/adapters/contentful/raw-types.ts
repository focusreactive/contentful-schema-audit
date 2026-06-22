import { z } from "zod";

const validationSchema = z.record(z.string(), z.unknown());

const rawItemsSchema = z.object({
  type: z.string(),
  linkType: z.string().optional(),
  validations: z.array(validationSchema).optional(),
});

const rawFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  linkType: z.string().optional(),
  localized: z.boolean().default(false),
  required: z.boolean().default(false),
  disabled: z.boolean().default(false),
  omitted: z.boolean().default(false),
  validations: z.array(validationSchema).optional(),
  items: rawItemsSchema.optional(),
});

export const rawContentTypeSchema = z.object({
  sys: z.object({ id: z.string(), createdAt: z.string().optional(), updatedAt: z.string().optional() }),
  name: z.string(),
  description: z.string().optional(),
  displayField: z.string().nullable().optional(),
  fields: z.array(rawFieldSchema),
});

export const rawLocaleSchema = z.object({
  code: z.string(),
  name: z.string().optional(),
  default: z.boolean(),
  fallbackCode: z.string().nullable(),
});

export const contentTypesResponseSchema = z.object({ items: z.array(rawContentTypeSchema) });
export const localesResponseSchema = z.object({ items: z.array(rawLocaleSchema) });

export type RawContentType = z.infer<typeof rawContentTypeSchema>;
export type RawField = z.infer<typeof rawFieldSchema>;
export type RawLocale = z.infer<typeof rawLocaleSchema>;
