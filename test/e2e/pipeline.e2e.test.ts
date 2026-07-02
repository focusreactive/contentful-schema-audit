import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Access, CmsAdapter, FetchedPage } from "../../src/core/adapter.js";
import type { NarrationInput } from "../../src/core/narration/narrator.js";
import type { SemanticDigest } from "../../src/core/semantic/digest.js";
import { contentfulAdapter } from "../../src/adapters/contentful/index.js";
import { fetchContentTypes, fetchLocales } from "../../src/adapters/contentful/cda-client.js";
import { normalize } from "../../src/adapters/contentful/normalize.js";
import { AiInputError } from "../../src/cli/exit-codes.js";
import { runDigest } from "../../src/cli/commands/digest.js";
import { runScore } from "../../src/cli/commands/score.js";
import { runFinalize } from "../../src/cli/commands/finalize.js";
import { readScoredFile } from "../../src/core/artifacts/scored-file.js";
import { readStateFile } from "../../src/core/artifacts/state.js";

const FIXED_NOW = "2026-07-02T00:00:00.000Z";
const FIXTURES = new URL("../fixtures/contentful/", import.meta.url);

const contentTypesFixture = JSON.parse(await readFile(new URL("cfexampleapi.content_types.json", FIXTURES), "utf8"));
const localesFixture = JSON.parse(await readFile(new URL("cfexampleapi.locales.json", FIXTURES), "utf8"));

const stubFetch: typeof fetch = async (input) => {
  const url = String(input);
  if (url.includes("/content_types")) return new Response(JSON.stringify(contentTypesFixture));
  if (url.includes("/locales")) return new Response(JSON.stringify(localesFixture));
  throw new Error(`unexpected fetch: ${url}`);
};

const fixtureAdapter: CmsAdapter = {
  ...contentfulAdapter,
  async fetchModel(access: Access) {
    const [contentTypes, locales] = await Promise.all([
      fetchContentTypes(access, { fetch: stubFetch }),
      fetchLocales(access, { fetch: stubFetch }),
    ]);
    return {
      model: normalize({
        contentTypes,
        locales,
        spaceId: access.spaceId,
        environment: access.environment,
        fetchedAt: FIXED_NOW,
      }),
      rawSchema: { contentTypes, locales },
    };
  },
};

const deps = {
  adapter: fixtureAdapter,
  fetchPage: (): Promise<FetchedPage> => {
    throw new Error("fetchPage must not be called in direct mode");
  },
};

function buildSemanticFixture(digest: SemanticDigest): unknown {
  return {
    typeRoles: digest.types.map((t) => ({ typeId: t.id, role: "page", confidence: 0.7 })),
    fieldRoles: [],
    judgments: [
      ...digest.orphanCandidates.map((id) => ({
        kind: "orphanIsDebt",
        subject: id,
        verdict: "refuted",
        confidence: 0.8,
        rationale: "Deliberate entry point.",
      })),
      ...digest.godTypeCandidates.map((id) => ({
        kind: "godTypeIsProblem",
        subject: id,
        verdict: "uncertain",
        confidence: 0.5,
        rationale: "Cannot tell.",
      })),
      { kind: "namingIsCryptic", subject: "_dimension", verdict: "refuted", confidence: 0.9, rationale: "Names are clear." },
      { kind: "redirectsAreMissing", subject: "_dimension", verdict: "uncertain", confidence: 0.5, rationale: "Unknown." },
    ],
    model: "e2e-fixture-model",
  };
}

function buildNarrationFixture(input: NarrationInput): unknown {
  return {
    overall: "End-to-end fixture narration.",
    dimensions: input.dimensions.map((d) => ({ id: d.id, narration: `About ${d.title}.` })),
    findings: input.dimensions.flatMap((d) => d.failedChecks.map((c) => ({ id: c.id, impact: "Impact.", fix: "Fix." }))),
    model: "e2e-fixture-model",
  };
}

async function seedDigest(): Promise<string> {
  const { workDir } = await runDigest({ spaceId: "cfexampleapi", token: "fixture-token" }, deps);
  return workDir;
}

describe("pipeline e2e (recorded cfexampleapi fixtures)", () => {
  it("digest → semantic → score → narration → finalize produces a complete result", async () => {
    const { workDir, brief } = await runDigest({ spaceId: "cfexampleapi", token: "fixture-token" }, deps);
    expect(brief).toContain("## Next");

    const state = await readStateFile(workDir);
    await writeFile(join(workDir, "semantic.json"), JSON.stringify(buildSemanticFixture(state.digest)), "utf8");

    const { brief: narrationBrief } = await runScore({ workDir, semantic: true });
    expect(narrationBrief).toContain(join(workDir, "narration.json"));

    const { narrationInput } = await readScoredFile(workDir);
    await writeFile(join(workDir, "narration.json"), JSON.stringify(buildNarrationFixture(narrationInput)), "utf8");

    const result = await runFinalize(
      { workDir, narration: true, includeModel: true, includeRawSchema: true },
      { now: () => FIXED_NOW },
    );

    expect(result.source).toEqual({
      url: undefined,
      cms: "contentful",
      spaceId: "cfexampleapi",
      environment: "master",
      acquisition: "provided",
    });
    expect(result.overall.score).not.toBeNull();
    expect(result.narration?.overall).toBe("End-to-end fixture narration.");
    expect(result.model?.contentTypes.length).toBeGreaterThan(0);
    expect(result.rawSchema).toBeDefined();
    expect(result.generatedAt).toBe(FIXED_NOW);
    expect(result).toMatchSnapshot();
  });

  it("rejects an invalid semantic.json with an exit-2 error, then succeeds after a fix", async () => {
    const workDir = await seedDigest();
    await writeFile(join(workDir, "semantic.json"), JSON.stringify({ typeRoles: "wrong" }), "utf8");

    await expect(runScore({ workDir, semantic: true })).rejects.toBeInstanceOf(AiInputError);

    const state = await readStateFile(workDir);
    await writeFile(join(workDir, "semantic.json"), JSON.stringify(buildSemanticFixture(state.digest)), "utf8");
    await expect(runScore({ workDir, semantic: true })).resolves.toBeDefined();
  });

  it("falls back cleanly with --no-semantic and --no-narration", async () => {
    const workDir = await seedDigest();

    await runScore({ workDir, semantic: false });
    const result = await runFinalize(
      { workDir, narration: false, includeModel: false, includeRawSchema: false },
      { now: () => FIXED_NOW },
    );

    expect(result.narration).toBeUndefined();
    expect(result.dimensions.some((d) => d.state === "not_assessable")).toBe(true);
  });
});
