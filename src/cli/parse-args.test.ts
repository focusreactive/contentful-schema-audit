import { describe, expect, it } from "vitest";
import { parseArgs } from "./parse-args.js";

describe("parseArgs bare mode", () => {
  it("parses a url with defaults (json off, environment master)", () => {
    const parsed = parseArgs(["node", "cli", "https://site.com"]);

    expect(parsed.command).toBe("bare");
    if (parsed.command !== "bare") throw new Error("expected bare");
    expect(parsed.args).toMatchObject({ url: "https://site.com", json: false, environment: "master" });
  });

  it("rejects the removed --no-ai flag", () => {
    expect(() => parseArgs(["node", "cli", "https://site.com", "--no-ai"])).toThrow();
  });

  it("maps --json, --token, --space-id", () => {
    const parsed = parseArgs(["node", "cli", "--json", "--token", "tok", "--space-id", "sp"]);

    if (parsed.command !== "bare") throw new Error("expected bare");
    expect(parsed.args).toMatchObject({ json: true, token: "tok", spaceId: "sp" });
  });

  it("parses --report and leaves it undefined when absent", () => {
    const withReport = parseArgs(["node", "cli", "https://site.com", "--report", "out.md"]);
    if (withReport.command !== "bare") throw new Error("expected bare");
    expect(withReport.args.report).toBe("out.md");

    const without = parseArgs(["node", "cli", "https://site.com"]);
    if (without.command !== "bare") throw new Error("expected bare");
    expect(without.args.report).toBeUndefined();
  });

  it("captures optional file names for --json and --report", () => {
    const parsed = parseArgs(["node", "cli", "https://site.com", "--json", "raw", "--report", "health"]);

    if (parsed.command !== "bare") throw new Error("expected bare");
    expect(parsed.args).toMatchObject({ json: "raw", report: "health" });
  });

  it("accepts bare --report and bare --json as value-less toggles", () => {
    const parsed = parseArgs(["node", "cli", "https://site.com", "--json", "--report"]);

    if (parsed.command !== "bare") throw new Error("expected bare");
    expect(parsed.args).toMatchObject({ json: true, report: true });
  });

  it("maps --out to the output folder", () => {
    const parsed = parseArgs(["node", "cli", "https://site.com", "--out", "audits"]);

    if (parsed.command !== "bare") throw new Error("expected bare");
    expect(parsed.args.out).toBe("audits");
  });

  it("defaults debug and includeRawSchema to false and enables them via flags", () => {
    const parsed = parseArgs(["node", "cli", "https://site.com", "--debug", "--include-raw-schema"]);

    if (parsed.command !== "bare") throw new Error("expected bare");
    expect(parsed.args).toMatchObject({ debug: true, includeRawSchema: true });
  });
});

describe("parseArgs subcommands", () => {
  it("parses digest with acquisition flags and work dir", () => {
    const parsed = parseArgs(["node", "cli", "digest", "--space-id", "s1", "--token", "t", "--work-dir", "/tmp/wd"]);

    expect(parsed).toMatchObject({ command: "digest", args: { spaceId: "s1", token: "t", workDir: "/tmp/wd" } });
  });

  it("parses digest with a url argument", () => {
    const parsed = parseArgs(["node", "cli", "digest", "https://site.com"]);

    expect(parsed).toMatchObject({ command: "digest", args: { url: "https://site.com" } });
  });

  it("parses score with --no-semantic", () => {
    const parsed = parseArgs(["node", "cli", "score", "--work-dir", "/tmp/wd", "--no-semantic"]);

    expect(parsed).toMatchObject({ command: "score", args: { workDir: "/tmp/wd", semantic: false } });
  });

  it("defaults score to semantic on and requires --work-dir", () => {
    const parsed = parseArgs(["node", "cli", "score", "--work-dir", "/tmp/wd"]);

    expect(parsed).toMatchObject({ command: "score", args: { semantic: true } });
    expect(() => parseArgs(["node", "cli", "score"])).toThrow();
  });

  it("parses finalize with presentation flags", () => {
    const parsed = parseArgs([
      "node",
      "cli",
      "finalize",
      "--work-dir",
      "/tmp/wd",
      "--no-narration",
      "--json",
      "--include-model",
    ]);

    expect(parsed).toMatchObject({
      command: "finalize",
      args: { workDir: "/tmp/wd", narration: false, json: true, includeModel: true },
    });
  });

  it("rejects presentation flags on digest", () => {
    expect(() => parseArgs(["node", "cli", "digest", "--space-id", "s1", "--json"])).toThrow();
  });

  it("rejects acquisition flags on finalize", () => {
    expect(() => parseArgs(["node", "cli", "finalize", "--work-dir", "/tmp/wd", "--space-id", "s1"])).toThrow();
  });
});
