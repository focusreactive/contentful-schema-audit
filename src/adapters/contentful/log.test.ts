import { logDetection } from "./log.js";

describe("logDetection", () => {
  it("writes one line in the canonical format to stderr when debug is on", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logDetection(true, "spaceId", "abc123", "asset-host");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=spaceId value=abc123 source=asset-host\n");
    spy.mockRestore();
  });

  it("renders <none> when the value is missing", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logDetection(true, "token", undefined, "not-found");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=<none> source=not-found\n");
    spy.mockRestore();
  });

  it("renders <none> when the value is an empty string", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logDetection(true, "token", "", "not-found");
    expect(spy).toHaveBeenCalledWith("[contentful] detect field=token value=<none> source=not-found\n");
    spy.mockRestore();
  });

  it("writes nothing when debug is off", () => {
    const spy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    logDetection(false, "spaceId", "abc123", "asset-host");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
