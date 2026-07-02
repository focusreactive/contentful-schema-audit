import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { AiInputError } from "../../cli/exit-codes.js";
import { semanticOutputSchema } from "../semantic/schema.js";
import type { JudgmentKind } from "../semantic/types.js";
import type { SemanticDigest } from "../semantic/digest.js";
import { didYouMean, zodIssues } from "./issues.js";

export const SEMANTIC_FILE = "semantic.json";

export const semanticFileSchema = semanticOutputSchema.extend({ model: z.string().min(1) });
export type SemanticFile = z.infer<typeof semanticFileSchema>;

function referentialIssues(file: SemanticFile, digest: SemanticDigest): string[] {
  const issues: string[] = [];
  const typeIds = digest.types.map((t) => t.id);
  const fieldsByType = new Map(digest.types.map((t) => [t.id, t.fields.map((f) => f.id)]));

  file.typeRoles.forEach((entry, i) => {
    if (!fieldsByType.has(entry.typeId)) {
      issues.push(`typeRoles[${i}]: typeId "${entry.typeId}" not in digest${didYouMean(entry.typeId, typeIds)}`);
    }
  });

  file.fieldRoles.forEach((entry, i) => {
    const fields = fieldsByType.get(entry.typeId);
    if (!fields) {
      issues.push(`fieldRoles[${i}]: typeId "${entry.typeId}" not in digest${didYouMean(entry.typeId, typeIds)}`);
    } else if (!fields.includes(entry.fieldId)) {
      issues.push(
        `fieldRoles[${i}]: fieldId "${entry.fieldId}" not on type "${entry.typeId}"${didYouMean(entry.fieldId, fields)}`,
      );
    }
  });

  return issues;
}

function judgmentIssues(file: SemanticFile, digest: SemanticDigest): string[] {
  const issues: string[] = [];
  const expected: { kind: JudgmentKind; subject: string }[] = [
    ...digest.orphanCandidates.map((id) => ({ kind: "orphanIsDebt" as const, subject: id })),
    ...digest.godTypeCandidates.map((id) => ({ kind: "godTypeIsProblem" as const, subject: id })),
    { kind: "namingIsCryptic", subject: "_dimension" },
    { kind: "redirectsAreMissing", subject: "_dimension" },
  ];

  const key = (kind: string, subject: string): string => `${kind} ${subject}`;
  const expectedKeys = new Set(expected.map((e) => key(e.kind, e.subject)));
  const seen = new Set<string>();

  for (const judgment of file.judgments) {
    const judgmentKey = key(judgment.kind, judgment.subject);
    if (!expectedKeys.has(judgmentKey)) {
      issues.push(`unexpected judgment ${judgment.kind} for subject "${judgment.subject}"`);
    } else if (seen.has(judgmentKey)) {
      issues.push(`duplicate judgment ${judgment.kind} for subject "${judgment.subject}"`);
    }
    seen.add(judgmentKey);
  }

  for (const expectation of expected) {
    if (!seen.has(key(expectation.kind, expectation.subject))) {
      issues.push(`missing judgment ${expectation.kind} for subject "${expectation.subject}"`);
    }
  }

  return issues;
}

export function validateSemanticData(data: unknown, digest: SemanticDigest): { file?: SemanticFile; issues: string[] } {
  const parsed = semanticFileSchema.safeParse(data);
  if (!parsed.success) return { issues: zodIssues(parsed.error) };

  const issues = [...referentialIssues(parsed.data, digest), ...judgmentIssues(parsed.data, digest)];

  return issues.length > 0 ? { issues } : { file: parsed.data, issues: [] };
}

export async function readSemanticFile(workDir: string, digest: SemanticDigest): Promise<SemanticFile> {
  const path = join(workDir, SEMANTIC_FILE);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new AiInputError(SEMANTIC_FILE, [
      `expected file at ${path} — write it as instructed in ${join(workDir, "brief-semantic.md")}`,
    ]);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new AiInputError(SEMANTIC_FILE, [
      `file is not valid JSON (${detail}) — write raw JSON with no markdown fences or comments`,
    ]);
  }

  const { file, issues } = validateSemanticData(data, digest);
  if (!file) throw new AiInputError(SEMANTIC_FILE, issues);

  return file;
}
