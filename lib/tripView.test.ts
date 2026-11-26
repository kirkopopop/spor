import { describe, expect, it } from "vitest";
import { dayPins, groupTrips, legInto, tripRoutes } from "./tripView";
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

describe("legInto", () => {
  it("joins a stop to the previous one on the map, skipping journeys", () => {
    expect(legInto(day, "c")).toEqual([[48.1, 11.5], [48.13, 11.58]]);
    expect(legInto(day, "a")).toEqual([]); // first on the map
    expect(legInto(day, undefined)).toEqual([]);
  });
});

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
