import { describe, expect, it } from "vitest";
import { z } from "zod";
import { semanticFileSchema, validateSemanticData } from "../artifacts/semantic-file.js";
import type { SemanticDigest } from "../semantic/digest.js";
import { EXAMPLE_DIGEST, EXAMPLE_OUTPUT, renderSemanticBrief } from "./semantic-brief.js";

const digest: SemanticDigest = {
  types: [
    {
      id: "article",
      name: "Article",
      fieldCount: 1,
      inDegree: 0,
      outDegree: 0,
      fields: [
        { id: "headline", name: "Headline", type: "text", required: true, localized: false, validationKinds: [] },
      ],
    },
  ],
  orphanCandidates: [],
  godTypeCandidates: [],
};

describe("renderSemanticBrief", () => {
  const brief = renderSemanticBrief({ digest, workDir: "/tmp/wd-123" });

  it("embeds the output schema generated from the validator schema", () => {
    expect(brief).toContain(JSON.stringify(z.toJSONSchema(semanticFileSchema), null, 2));
  });

  it("embeds the digest data", () => {
    expect(brief).toContain('"article"');
    expect(brief).toContain('"headline"');
  });

  it("names the exact output file and next command", () => {
    expect(brief).toContain("/tmp/wd-123/semantic.json");
    expect(brief).toContain("cms-validate score --work-dir /tmp/wd-123");
    expect(brief).toContain("--no-semantic");
  });

  it("states the confidence threshold and judgment arithmetic", () => {
    expect(brief).toContain("0.6");
    expect(brief).toContain("namingIsCryptic");
    expect(brief).toContain("redirectsAreMissing");
  });
});

describe("worked example", () => {
  it("is valid against the real validator", () => {
    const { issues } = validateSemanticData(EXAMPLE_OUTPUT, EXAMPLE_DIGEST);

    expect(issues).toEqual([]);
  });
});
