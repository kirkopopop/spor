import { describe, expect, it } from "vitest";
import { datesBetween, lostSummary, patchToRow, planDates, stageAfterDates } from "./tripEdit";
import { dayMonth } from "./format";
import type { Day } from "./types";

const day = (date: string, stops = 0): Day => ({
  id: `d-${date}`,
  date,
  title: "",
  city: "",
  place: "",
  rain: [],
  stops: Array.from({ length: stops }, (_, i) => ({ id: `${date}-${i}`, time: "10:00", name: `S${i}`, kind: "normal" as const })),
});

describe("datesBetween", () => {
  it("is inclusive and crosses months", () => {
    expect(datesBetween("2026-11-30", "2026-12-02")).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
  });
  it("is empty without both dates or when reversed", () => {
    expect(datesBetween("", "")).toEqual([]);
    expect(datesBetween("2026-12-02", "2026-12-01")).toEqual([]);
  });
});

describe("planDates", () => {
  const trip = { days: [day("2026-11-27"), day("2026-11-28", 2), day("2026-11-29", 1)] };

  it("adds days when extending", () => {
    const p = planDates(trip, "2026-11-26", "2026-11-29");
    expect(p.add).toEqual(["2026-11-26"]);
    expect(p.drop).toEqual([]);
  });

  it("drops empty days silently but reports days with stops", () => {
    const p = planDates(trip, "2026-11-28", "2026-11-28");
    expect(p.drop.map((d) => d.date)).toEqual(["2026-11-27", "2026-11-29"]);
    expect(p.lost.map((d) => d.date)).toEqual(["2026-11-29"]);
    expect(p.add).toEqual([]);
  });

  it("moving the whole trip drops every old day", () => {
    const p = planDates(trip, "2027-01-01", "2027-01-02");
    expect(p.add).toEqual(["2027-01-01", "2027-01-02"]);
    expect(p.lost).toHaveLength(2);
  });
});

describe("lostSummary", () => {
  it("names the days and counts the stops", () => {
    expect(lostSummary([day("2026-11-28", 1)])).toBe("Sat 28 Nov has 1 stop");
    expect(lostSummary([day("2026-11-28", 2), day("2026-11-29", 3)])).toBe("Sat 28 Nov and Sun 29 Nov have 5 stops");
    expect(lostSummary([day("2026-11-27", 1), day("2026-11-28", 1), day("2026-11-29", 1)])).toBe(
      "Fri 27 Nov, Sat 28 Nov and Sun 29 Nov have 3 stops",
    );
  });
});

describe("stage and row", () => {
  it("an idea with dates becomes planning", () => {
    expect(stageAfterDates("idea", "2026-12-01")).toBe("planning");
    expect(stageAfterDates("idea", "")).toBe("idea");
    expect(stageAfterDates("memory", "2026-12-01")).toBe("memory");
  });
  it("maps a patch to columns, clearing empty dates", () => {
    expect(patchToRow({ name: "X", startDate: "", endDate: "2026-12-01", currency: "DKK" })).toEqual({
      name: "X",
      start_date: null,
      end_date: "2026-12-01",
      currency: "DKK",
    });
  });
  it("formats a day with its month", () => {
    expect(dayMonth("2026-11-27")).toBe("Fri 27 Nov");
  });
});
