import type { z } from "zod";

const CLOSEST_MATCH_MAX_DISTANCE = 3;

function editDistance(a: string, b: string): number {
  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow.push(
        Math.min((currentRow[j - 1] ?? 0) + 1, (previousRow[j] ?? 0) + 1, (previousRow[j - 1] ?? 0) + substitutionCost),
      );
    }
    previousRow = currentRow;
  }
  return previousRow[b.length] ?? 0;
}

export function didYouMean(input: string, candidates: string[]): string {
  let best: string | undefined;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = editDistance(input, candidate);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best !== undefined && bestDistance <= CLOSEST_MATCH_MAX_DISTANCE ? ` — did you mean "${best}"?` : "";
}

export function zodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path
      .map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`))
      .join("")
      .replace(/^\./, "");

    return `${path || "(root)"}: ${issue.message}`;
  });
}
