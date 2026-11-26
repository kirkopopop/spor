import { describe, expect, it } from "vitest";
import { destinationOf } from "./destination";
import type { Trip } from "./types";

const trip = (name: string, cities: string[] = [], timezone = "Europe/Copenhagen"): Trip => ({
  id: name, name, stage: "planning", startDate: "2026-12-21", endDate: "2026-12-25", timezone, currency: "EUR",
  people: [], bookings: [], budget: [], spare: [],
  days: cities.map((city, i) => ({ id: `${i}`, date: "2026-12-21", title: "", city, place: city, rain: [], stops: [] })),
});

describe("destinationOf", () => {
  it("reads the place from the trip's name first", () => {
    expect(destinationOf(trip("London, Glasgow & Edinburgh")).key).toBe("london");
    expect(destinationOf(trip("Munich")).key).toBe("munich");
    expect(destinationOf(trip("Christmas in München")).key).toBe("munich"); // accents and local names
    expect(destinationOf(trip("Weekend in Edinburgh")).key).toBe("scotland");
  });

  it("falls back to the days' cities when the name says nothing", () => {
    expect(destinationOf(trip("Autumn break", ["", "paris", "paris"])).key).toBe("paris");
  });

  it("uses the timezone only last, since new trips take the planner's own", () => {
    expect(destinationOf(trip("Long weekend", [], "Europe/London")).key).toBe("london");
    expect(destinationOf(trip("Long weekend", [], "Europe/Copenhagen")).key).toBe("copenhagen");
    expect(destinationOf(trip("Rome", [], "Europe/Copenhagen")).key).toBe("rome"); // the name wins
  });

  it("matches whole words, not fragments", () => {
    expect(destinationOf(trip("Romeo's birthday", [], "UTC")).key).toBe("trip"); // not Rome
    expect(destinationOf(trip("Skiing in the Alps")).key).toBe("mountains");
  });

  it("gives every trip something to show", () => {
    const d = destinationOf(trip("Somewhere new", [], "Pacific/Auckland"));
    expect(d.key).toBe("trip");
    expect(d.label).toBe("Trip");
  });

  it("carries a photo only where one exists", () => {
    expect(destinationOf(trip("Munich")).photo).toBe("munich");
    expect(destinationOf(trip("Paris")).photo).toBeUndefined();
  });
});
