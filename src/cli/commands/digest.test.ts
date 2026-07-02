import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fetchedPage, stubAdapter } from "../../../test/fixtures/cli.js";
import { readStateFile } from "../../core/artifacts/state.js";
import { runDigest } from "./digest.js";

const deps = { fetchPage: async () => fetchedPage, adapter: stubAdapter() };

describe("runDigest", () => {
  it("creates a work dir, persists state, and returns the brief", async () => {
    const { workDir, brief } = await runDigest({ spaceId: "space1", token: "secret-token" }, deps);

    const state = await readStateFile(workDir);
    expect(state.source).toMatchObject({ spaceId: "space1", cms: "contentful", acquisition: "provided" });
    expect(state.digest.types.map((t) => t.id)).toEqual(["article"]);
    expect(JSON.stringify(state)).not.toContain("secret-token");

    expect(brief).toContain(join(workDir, "semantic.json"));
    await expect(readFile(join(workDir, "brief-semantic.md"), "utf8")).resolves.toBe(brief);
  });

  it("uses a provided work dir", async () => {
    const dir = await mkdtemp(join(tmpdir(), "digest-test-"));

    const { workDir } = await runDigest({ spaceId: "space1", token: "secret-token", workDir: dir }, deps);

    expect(workDir).toBe(dir);
    await expect(readStateFile(dir)).resolves.toBeDefined();
  });
});
