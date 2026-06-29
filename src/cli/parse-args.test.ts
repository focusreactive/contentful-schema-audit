import { parseArgs } from "./parse-args.js";

describe("parseArgs", () => {
  it("defaults ai on, json off, environment master", () => {
    const args = parseArgs(["node", "cli", "https://site.com"]);
    expect(args).toMatchObject({ url: "https://site.com", ai: true, json: false });
  });

  it("maps --no-ai, --json, --token, --space-id", () => {
    const args = parseArgs(["node", "cli", "--no-ai", "--json", "--token", "tok", "--space-id", "sp"]);
    expect(args).toMatchObject({ ai: false, json: true, token: "tok", spaceId: "sp" });
  });

  it("parses --report into the report path", () => {
    const args = parseArgs(["node", "cli", "https://site.com", "--report", "out.md"]);
    expect(args.report).toBe("out.md");
  });

  it("leaves report undefined when --report is absent", () => {
    const args = parseArgs(["node", "cli", "https://site.com"]);
    expect(args.report).toBeUndefined();
  });

  it("defaults debug to false and enables it with --debug", () => {
    expect(parseArgs(["node", "cli", "https://site.com"]).debug).toBe(false);
    expect(parseArgs(["node", "cli", "https://site.com", "--debug"]).debug).toBe(true);
  });
});
