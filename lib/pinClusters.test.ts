import { describe, expect, it } from "vitest";
import { clusterPins, rangeLabel } from "./pinClusters";

describe("rangeLabel", () => {
  it("names a consecutive run as a range, anything else by its first number", () => {
    expect(rangeLabel(["4"])).toBe("4");
    expect(rangeLabel(["2", "3", "4"])).toBe("2–4");
    expect(rangeLabel(["7", "2", "3"])).toBe("2+");
  });
});

describe("clusterPins", () => {
  const p = (id: string, label: string, x: number, y: number) => ({ id, label, x, y });

  it("merges pins closer than the radius and keeps far ones apart", () => {
    const groups = clusterPins([p("a", "1", 0, 0), p("b", "2", 10, 4), p("c", "3", 200, 0)], 28);
    expect(groups.map((g) => [g.ids, g.label])).toEqual([
      [["a", "b"], "1–2"],
      [["c"], "3"],
    ]);
  });

  it("never swallows the selected pin", () => {
    const groups = clusterPins([p("a", "1", 0, 0), p("b", "2", 5, 5), p("c", "3", 8, 2)], 28, "b");
    expect(groups.map((g) => g.ids)).toEqual([["a", "c"], ["b"]]);
  });

  it("places a group at the average of its members", () => {
    const [g] = clusterPins([p("a", "1", 0, 0), p("b", "2", 10, 20)], 28);
    expect([g.x, g.y]).toEqual([5, 10]);
  });
});
