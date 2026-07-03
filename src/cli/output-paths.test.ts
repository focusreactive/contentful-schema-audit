import { describe, expect, it } from "vitest";
import { resolveOutputTargets } from "./output-paths.js";

const urlSource = { url: "https://www.viva-jets.com/about", spaceId: "sp1" };
const bareSource = { spaceId: "sp1" };

describe("resolveOutputTargets", () => {
  it("derives the default folder and report name from the url hostname minus www.", () => {
    const targets = resolveOutputTargets({ json: false }, urlSource);

    expect(targets).toEqual({ reportPath: "detected-schemas/viva-jets.com/viva-jets.com.md" });
  });

  it("keeps non-www subdomains and accepts urls without a protocol", () => {
    const targets = resolveOutputTargets({ json: false }, { url: "blog.example.co.uk/x", spaceId: "sp1" });

    expect(targets.reportPath).toBe("detected-schemas/blog.example.co.uk/blog.example.co.uk.md");
  });

  it("falls back to the space id when no url is present", () => {
    const targets = resolveOutputTargets({ json: true }, bareSource);

    expect(targets).toEqual({
      reportPath: "detected-schemas/sp1/sp1.md",
      jsonPath: "detected-schemas/sp1/sp1.json",
    });
  });

  it("omits jsonPath unless --json is set and names the json file from its value", () => {
    expect(resolveOutputTargets({ json: false }, urlSource).jsonPath).toBeUndefined();
    expect(resolveOutputTargets({ json: "raw" }, urlSource).jsonPath).toBe(
      "detected-schemas/viva-jets.com/raw.json",
    );
  });

  it("uses --out verbatim as the final folder", () => {
    const targets = resolveOutputTargets({ json: true, out: "audits" }, urlSource);

    expect(targets).toEqual({
      reportPath: "audits/viva-jets.com.md",
      jsonPath: "audits/viva-jets.com.json",
    });
  });

  it("renames the report via --report value and forces the .md suffix", () => {
    expect(resolveOutputTargets({ json: false, report: "health" }, urlSource).reportPath).toBe(
      "detected-schemas/viva-jets.com/health.md",
    );
    expect(resolveOutputTargets({ json: false, report: "notes.txt" }, urlSource).reportPath).toBe(
      "detected-schemas/viva-jets.com/notes.txt.md",
    );
    expect(resolveOutputTargets({ json: false, report: "health.md" }, urlSource).reportPath).toBe(
      "detected-schemas/viva-jets.com/health.md",
    );
  });

  it("treats a bare --report flag as a no-op", () => {
    const targets = resolveOutputTargets({ json: false, report: true }, urlSource);

    expect(targets.reportPath).toBe("detected-schemas/viva-jets.com/viva-jets.com.md");
  });

  it("rejects file names containing path separators", () => {
    expect(() => resolveOutputTargets({ json: false, report: "sub/name" }, urlSource)).toThrow(/--report/);
    expect(() => resolveOutputTargets({ json: "/abs/name" }, urlSource)).toThrow(/--json/);
  });
});
