import { z } from "zod";
import { FIELD_ROLES, JUDGMENT_KINDS, TYPE_ROLES, VERDICTS } from "./types.js";

const confidence = z.number().min(0).max(1);

export const semanticOutputSchema = z.object({
  typeRoles: z.array(z.object({ typeId: z.string(), role: z.enum(TYPE_ROLES), confidence })),
  fieldRoles: z.array(z.object({ typeId: z.string(), fieldId: z.string(), role: z.enum(FIELD_ROLES), confidence })),
  judgments: z.array(
    z.object({
      kind: z.enum(JUDGMENT_KINDS),
      subject: z.string(),
      verdict: z.enum(VERDICTS),
      confidence,
      rationale: z.string(),
    }),
  ),
});

export type SemanticOutput = z.infer<typeof semanticOutputSchema>;
