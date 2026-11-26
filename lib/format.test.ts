import { describe, expect, it } from "vitest";
import { clockTime, daysUntil, leaveBy, LEAVE_SLACK_MIN, money, setClockFormat, shiftTime, todayIn } from "./format";
import type { Stop } from "./types";

const stop = (p: Partial<Stop>): Stop => ({ id: "s", time: "19:30", name: "x", kind: "normal", ...p });

describe("leaveBy", () => {
  it("keeps 15 minutes of slack before a fixed stop", () => {
    expect(LEAVE_SLACK_MIN).toBe(15);
    // Heard, Fri 17:15, 5 min walk → leave 16:55, not 17:10.
    expect(leaveBy(stop({ time: "17:15", kind: "fixed", go: { mode: "walk", min: 5 } }))).toBe("16:55");
  });

  it("uses the plan's own leave time when it has one", () => {
    expect(leaveBy(stop({ time: "06:30", kind: "fixed", go: { mode: "walk", min: 5, leave: "06:05" } }))).toBe("06:05");
  });

  it("adds no slack before a normal stop", () => {
    expect(leaveBy(stop({ time: "13:30", go: { mode: "walk", min: 20 } }))).toBe("13:10");
  });

  it("is undefined without travel", () => {
    expect(leaveBy(stop({ kind: "fixed" }))).toBeUndefined();
  });

  it("wraps past midnight", () => {
    expect(leaveBy(stop({ time: "00:10", kind: "fixed", go: { mode: "taxi", min: 20 } }))).toBe("23:35");
  });
});

describe("money", () => {
  it("keeps cents only when there are some", () => {
    expect(money(1450, "EUR")).toBe("€1,450");
    expect(money(12.5, "GBP")).toBe("£12.50");
    expect(money(0, "EUR")).toBe("€0");
  });
});

describe("clockTime", () => {
  it("follows the 12-hour preference and leaves stored times alone", () => {
    setClockFormat("12h");
    expect(clockTime("00:30")).toBe("12:30 am");
    expect(clockTime("12:05")).toBe("12:05 pm");
    expect(clockTime("18:30")).toBe("6:30 pm");
    setClockFormat("24h");
    expect(clockTime("18:30")).toBe("18:30");
  });
});

describe("shiftTime", () => {
  it("moves by minutes and wraps the clock", () => {
    expect(shiftTime("23:50", 15)).toBe("00:05");
    expect(shiftTime("08:00", -15)).toBe("07:45");
  });
});

describe("todayIn", () => {
  it("uses the trip's timezone, not UTC", () => {
    // 23:30 UTC on 21 Dec is already 22 Dec in Munich.
    expect(todayIn("Europe/Berlin", new Date("2026-12-21T23:30:00Z"))).toBe("2026-12-22");
    expect(todayIn("Europe/London", new Date("2026-12-21T23:30:00Z"))).toBe("2026-12-21");
  });
});

describe("daysUntil", () => {
  it("counts calendar days in the trip's timezone", () => {
    const now = new Date("2026-11-25T10:00:00Z");
    expect(daysUntil("2026-12-21", "Europe/Berlin", now)).toBe(26);
    expect(daysUntil("2026-11-25", "Europe/Berlin", now)).toBe(0);
  });
});
