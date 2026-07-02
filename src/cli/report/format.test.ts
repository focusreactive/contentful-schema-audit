import { chip, distribution, gauge, renderTable, typeChips, type Column } from "./format.js";

describe("gauge", () => {
  it("renders empty, partial, and full 10-char gauges", () => {
    expect(gauge(0, 10)).toBe("░░░░░░░░░░");
    expect(gauge(40, 10)).toBe("████░░░░░░");
    expect(gauge(80, 10)).toBe("████████░░");
    expect(gauge(100, 10)).toBe("██████████");
  });

  it("rounds to the nearest cell on a 20-char gauge", () => {
    expect(gauge(42, 20)).toBe("████████░░░░░░░░░░░░");
  });
});

describe("distribution", () => {
  it("renders one block per unit and empty string for zero", () => {
    expect(distribution(3)).toBe("███");
    expect(distribution(0)).toBe("");
  });
});

describe("chip", () => {
  it("wraps text in a code span", () => {
    expect(chip("Poor")).toBe("`Poor`");
  });
});

describe("typeChips", () => {
  it("renders all chips when at or under the cap", () => {
    expect(typeChips(["aboutUs", "homePage"])).toBe("`aboutUs` `homePage`");
  });

  it("truncates to 8 chips plus a +N more suffix", () => {
    const types = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9", "t10", "t11"];
    expect(typeChips(types)).toBe("`t1` `t2` `t3` `t4` `t5` `t6` `t7` `t8` +3 more");
  });
});

describe("renderTable", () => {
  it("pads cells to the widest column entry and emits alignment markers", () => {
    const columns: Column[] = [
      { header: "Check", align: "none" },
      { header: "#", align: "right" },
      { header: "Band", align: "left" },
    ];
    const rows = [
      ["Canonical URL field present", "1", "`Poor`"],
      ["Slug", "12", "`Good`"],
    ];
    expect(renderTable(columns, rows)).toBe(
      [
        "| Check                       |   # | Band   |",
        "| --------------------------- | --: | :----- |",
        "| Canonical URL field present |   1 | `Poor` |",
        "| Slug                        |  12 | `Good` |",
      ].join("\n"),
    );
  });

  it("supports empty headers and empty cells with a minimum column width of 3", () => {
    const columns: Column[] = [
      { header: "Score", align: "none" },
      { header: "", align: "left" },
    ];
    const rows = [["—", ""]];
    expect(renderTable(columns, rows)).toBe(
      ["| Score |     |", "| ----- | :-- |", "| —     |     |"].join("\n"),
    );
  });

  it("right-aligns headers of right-aligned columns", () => {
    const columns: Column[] = [{ header: "#", align: "right" }];
    expect(renderTable(columns, [["1"]])).toBe(["|   # |", "| --: |", "|   1 |"].join("\n"));
  });
});
