import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { field, model, type } from "../../../test/fixtures/models/factories.js";
import { buildSemanticDigest } from "../semantic/digest.js";
import { createWorkDir, readStateFile, STATE_SCHEMA_VERSION, writeStateFile, type StateFile } from "./state.js";

function buildState(): StateFile {
  const testModel = model({
    contentTypes: [type({ id: "page", fields: [field({ id: "title" })] })],
  });
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    source: {
      cms: "contentful",
      spaceId: "space1",
      environment: "master",
      region: "global",
      acquisition: "provided",
    },
    model: testModel,
    rawSchema: { contentTypes: [], locales: [] },
    digest: buildSemanticDigest(testModel),
  };
}

describe("createWorkDir", () => {
  it("creates a fresh temp directory", async () => {
    const dir = await createWorkDir();
    expect(dir).toContain("cms-validate-");
  });
});

describe("state file round-trip", () => {
  it("writes and reads back the same state", async () => {
    const workDir = await createWorkDir();
    const state = buildState();

    await writeStateFile(workDir, state);

    await expect(readStateFile(workDir)).resolves.toEqual(state);
  });

  it("fails with an actionable error when the file is missing", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "state-test-"));

    await expect(readStateFile(workDir)).rejects.toThrow('Run "cms-validate digest" first');
  });

  it("fails with an actionable error on corrupt JSON", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "state-test-"));
    await writeFile(join(workDir, "state.json"), "{not json", "utf8");

    await expect(readStateFile(workDir)).rejects.toThrow('Re-run "cms-validate digest"');
  });

  it("fails with an actionable error on schema version mismatch", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "state-test-"));
    await writeFile(join(workDir, "state.json"), JSON.stringify({ ...buildState(), schemaVersion: 999 }), "utf8");

    await expect(readStateFile(workDir)).rejects.toThrow(/version 999[\s\S]*Re-run "cms-validate digest"/);
  });
});
