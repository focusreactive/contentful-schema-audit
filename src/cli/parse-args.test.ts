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
});
