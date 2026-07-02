import { describe, expect, it, vi } from "vitest";
import { fetchedPage, stubAdapter } from "../../test/fixtures/cli.js";
import { acquireModel } from "./acquire.js";

describe("acquireModel", () => {
  it("throws when no url and no space-id are given", async () => {
    const deps = { fetchPage: async () => fetchedPage, adapter: stubAdapter() };

    await expect(acquireModel({}, deps)).rejects.toThrow(/url or --space-id/i);
  });

  it("throws when the site does not match and no space-id is given", async () => {
    const adapter = stubAdapter({ detect: () => ({ isMatch: false, signals: [] }) });
    const deps = { fetchPage: async () => fetchedPage, adapter };

    await expect(acquireModel({ url: "https://site.com" }, deps)).rejects.toThrow(/No Contentful detected/);
  });

  it("skips page fetching in direct mode and passes the provided space id", async () => {
    const fetchPage = vi.fn(async () => fetchedPage);
    const adapter = stubAdapter();
    const acquireAccess = vi.spyOn(adapter, "acquireAccess");

    await acquireModel({ spaceId: "space1", token: "tok" }, { fetchPage, adapter });

    expect(fetchPage).not.toHaveBeenCalled();
    expect(acquireAccess).toHaveBeenCalledWith(
      expect.objectContaining({ isMatch: true, spaceId: "space1" }),
      expect.objectContaining({ providedSpaceId: "space1", providedToken: "tok" }),
    );
  });

  it("returns access and the fetched model on the happy path", async () => {
    const deps = { fetchPage: async () => fetchedPage, adapter: stubAdapter() };

    const { access, fetched } = await acquireModel({ url: "https://site.com" }, deps);

    expect(access).toMatchObject({ spaceId: "space1", environment: "master" });
    expect(fetched.model.contentTypes.map((t) => t.id)).toEqual(["article"]);
  });
});
