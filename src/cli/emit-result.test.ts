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
  it("always writes the Markdown report and prints only its path", async () => {
    const chunks = captureStdout();
    const out = await mkdtemp(join(tmpdir(), "emit-test-"));

    await emitResult(result, { json: false, out });

    const reportPath = join(out, "site.com.md");
    expect(await readFile(reportPath, "utf8")).toContain("# CMS Schema Health");
    expect(chunks.join("")).toBe(`Report written to ${reportPath}\n`);
  });

  it("also writes the JSON file under --json and prints both paths", async () => {
    const chunks = captureStdout();
    const out = await mkdtemp(join(tmpdir(), "emit-test-"));

    await emitResult(result, { json: true, out });

    expect(JSON.parse(await readFile(join(out, "site.com.json"), "utf8"))).toMatchObject({ overall: { band: "warn" } });
    expect(chunks.join("")).toBe(
      `Report written to ${join(out, "site.com.md")}\nJSON written to ${join(out, "site.com.json")}\n`,
    );
  });

  it("creates the output folder recursively and honors custom file names", async () => {
    captureStdout();
    const out = join(await mkdtemp(join(tmpdir(), "emit-test-")), "nested", "dir");

    await emitResult(result, { json: "raw", report: "health", out });

    expect(await readFile(join(out, "health.md"), "utf8")).toContain("# CMS Schema Health");
    expect(JSON.parse(await readFile(join(out, "raw.json"), "utf8"))).toMatchObject({ overall: { score: 64 } });
  });
});
