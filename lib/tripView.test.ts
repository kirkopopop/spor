import { describe, expect, it } from "vitest";
import { dayPins, groupTrips, tripCardChips, tripRoutes, tripStage } from "./tripView";
import type { Day, Trip } from "./types";

const day: Day = {
  id: "d", date: "2026-12-22", title: "", city: "munich", place: "Munich", rain: [],
  stops: [
    { id: "a", time: "08:00", name: "Hotel", kind: "normal", lat: 48.1, lng: 11.5 },
    { id: "b", time: "09:00", name: "Train", kind: "fixed", journey: "train", offMap: true },
    { id: "c", time: "10:00", name: "Museum", kind: "fixed", lat: 48.13, lng: 11.58 },
    { id: "d", time: "12:00", name: "Lunch", kind: "normal", lat: 48.14, lng: 11.57, doneAt: "2026-12-22T12:30:00Z" },
  ],
};

describe("dayPins", () => {
  it("numbers stops in list order, skipping unmapped ones in the pins but not in the numbering", () => {
    const { pins, numbers } = dayPins(day);
    expect(numbers.get("b")).toBe(2);
    expect(pins.map((p) => [p.id, p.label, p.tone])).toEqual([
      ["a", "1", "default"],
      ["c", "3", "fixed"],
      ["d", "4", "done"],
    ]);
  });

  it("marks the next stop", () => {
    expect(dayPins(day, "c").pins.find((p) => p.id === "c")?.tone).toBe("next");
  });
});

const trip = (id: string, stage: Trip["stage"], start: string, end: string): Trip =>
  ({ id, name: id, stage, startDate: start, endDate: end, timezone: "Europe/Berlin", currency: "EUR", people: [], days: [day], bookings: [], budget: [], spare: [] }) as Trip;

describe("groupTrips", () => {
  it("sorts trips into now, upcoming, ideas and past by stage and date", () => {
    const g = groupTrips(
      [trip("past", "memory", "2026-11-19", "2026-11-22"), trip("munich", "planning", "2026-12-21", "2026-12-25"),
       trip("idea", "idea", "", ""), trip("later", "planning", "2027-07-01", "2027-07-10"), trip("now", "planning", "2026-12-20", "2026-12-27")],
      "2026-12-22",
    );
    expect(g.now.map((t) => t.id)).toEqual(["now", "munich"]); // by start date
    expect(g.upcoming.map((t) => t.id)).toEqual(["later"]);
    expect(g.ideas.map((t) => t.id)).toEqual(["idea"]);
    expect(g.past.map((t) => t.id)).toEqual(["past"]);
  });

  it("a planning trip whose dates have passed counts as past", () => {
    expect(groupTrips([trip("old", "planning", "2026-01-01", "2026-01-03")], "2026-12-22").past).toHaveLength(1);
  });
});

describe("tripRoutes", () => {
  it("draws one line per trip through its mapped stops, past trips muted", () => {
    const routes = tripRoutes([trip("past", "memory", "2026-11-19", "2026-11-22"), trip("munich", "planning", "2026-12-21", "2026-12-25")], "2026-12-01");
    expect(routes.map((r) => [r.id, r.points.length, r.tone])).toEqual([
      ["past", 3, "past"],
      ["munich", 3, "accent"],
    ]);
  });
});

describe("tripStage", () => {
  const t = (stage: Trip["stage"], startDate: string, endDate: string) => ({ stage, startDate, endDate });
  it("moves a planned trip on with the calendar", () => {
    expect(tripStage(t("planning", "2026-12-21", "2026-12-25"), "2026-11-28")).toBe("planning");
    expect(tripStage(t("planning", "2026-11-27", "2026-11-30"), "2026-11-28")).toBe("live");
    expect(tripStage(t("planning", "2026-11-19", "2026-11-22"), "2026-11-28")).toBe("memory");
  });
  it("keeps ideas and set stages", () => {
    expect(tripStage(t("idea", "", ""), "2026-11-28")).toBe("idea");
    expect(tripStage(t("planning", "", ""), "2026-11-28")).toBe("idea");
    expect(tripStage(t("live", "2026-12-21", "2026-12-25"), "2026-11-28")).toBe("live");
    expect(tripStage(t("memory", "2026-12-21", "2026-12-25"), "2026-11-28")).toBe("memory");
  });
});

describe("tripCardChips", () => {
  const base: Trip = {
    id: "t", name: "T", stage: "planning", startDate: "2026-11-27", endDate: "2026-11-28", timezone: "Europe/Copenhagen",
    currency: "EUR", people: [], bookings: [], budget: [], spare: [], days: [day],
  };
  it("says All booked only when there are bookings and all are booked", () => {
    expect(tripCardChips(base, "planning", "2026-11-28").map((c) => c.text)).not.toContain("All booked");
    const booked = { ...base, bookings: [{ id: "b", title: "Hotel", status: "booked" as const }] };
    expect(tripCardChips(booked, "planning", "2026-11-28")).toEqual([{ text: "All booked", tone: "ok" }]);
  });
  it("counts what's left to book", () => {
    const toBook = { ...base, bookings: [1, 2, 3].map((i) => ({ id: `${i}`, title: "x", status: "to_book" as const })) };
    expect(tripCardChips(toBook, "planning", "2026-11-28")).toEqual([{ text: "3 to book", tone: "fixed" }]);
  });
  it("with nothing else to say, gives today's stops on a live trip or the plan's size", () => {
    expect(tripCardChips(base, "live", "2026-12-22")).toEqual([{ text: "Today: 4 stops" }]);
    expect(tripCardChips(base, "live", "2026-11-28")).toEqual([{ text: "Nothing planned today" }]);
    expect(tripCardChips(base, "planning", "2026-11-28")).toEqual([{ text: "4 stops planned" }]);
  });
});
