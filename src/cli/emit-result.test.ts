import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ValidationResult } from "../core/result.js";
import { emitResult } from "./emit-result.js";

const result: ValidationResult = {
  source: { url: "https://site.com", cms: "contentful", spaceId: "sp", environment: "master", acquisition: "sniffed" },
  overall: { score: 64, band: "warn", scoredCount: 1, notAssessableCount: 0, notApplicableCount: 0 },
  dimensions: [],
  generatedAt: "2026-07-02T00:00:00Z",
};

function captureStdout(): string[] {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  return chunks;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("emitResult", () => {
  it("prints JSON only under --json, without the hint", async () => {
    const chunks = captureStdout();

    await emitResult(result, { json: true }, { aiHint: true });

    const output = chunks.join("");
    expect(JSON.parse(output)).toMatchObject({ overall: { score: 64 } });
    expect(output).not.toContain("/validate-cms");
  });

  it("prints pretty with hint plus JSON echo by default", async () => {
    const chunks = captureStdout();

    await emitResult(result, { json: false }, { aiHint: true });

    const output = chunks.join("");
    expect(output).toContain("CMS Schema Health");
    expect(output).toContain("run /validate-cms inside Claude Code");
    expect(output).toContain('"generatedAt"');
  });

  it("writes --out and suppresses the JSON echo", async () => {
    const chunks = captureStdout();
    const out = join(await mkdtemp(join(tmpdir(), "emit-test-")), "result.json");

    await emitResult(result, { json: false, out }, { aiHint: false });

    const output = chunks.join("");
    expect(output).toContain("CMS Schema Health");
    expect(output).not.toContain('"generatedAt"');
    expect(JSON.parse(await readFile(out, "utf8"))).toMatchObject({ overall: { band: "warn" } });
  });
});
