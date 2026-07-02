import { readFileSync } from "node:fs";
import { renderReport } from "./index.js";
import type { ValidationResult } from "../../core/result.js";

const fixturesDir = new URL("../../../test/fixtures/", import.meta.url);

it("reproduces the approved design byte-for-byte for the handgadvocates fixture", () => {
  const result = JSON.parse(
    readFileSync(new URL("handgadvocates.json", fixturesDir), "utf8"),
  ) as ValidationResult;
  const golden = readFileSync(new URL("handgadvocates-report.golden.md", fixturesDir), "utf8");
  expect(renderReport(result)).toBe(golden);
});
