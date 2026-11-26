import { describe, expect, it } from "vitest";
import { beenBy, beenShading, tripPlaces, type Place } from "./places";
import type { Trip } from "./types";

const trip = (name: string, end: string, people: string[], days: [string, number?, number?][]): Trip => ({
  id: name, name, stage: "planning", startDate: "2026-01-01", endDate: end, timezone: "Europe/London", currency: "GBP",
  people, bookings: [], budget: [], spare: [],
  days: days.map(([city, lat, lng], i) => ({
    id: `${name}-${i}`, date: "2026-01-01", title: "", city, place: city, rain: [],
    stops: lat != null ? [{ id: `${name}-s${i}`, time: "10:00", name: "x", kind: "normal", lat, lng }] : [],
  })),
});

const uk = trip("London, Glasgow & Edinburgh", "2026-11-22", ["Kirill", "Dima"], [["london", 51.5, -0.12], ["edinburgh", 55.95, -3.19], ["glasgow"], ["glasgow"]]);
const munich = trip("Munich", "2026-12-25", ["Kirill", "Tanya"], [["munich", 48.14, 11.58]]);

describe("tripPlaces", () => {
  it("counts a trip once it has ended: its country and each city it stayed in", () => {
    const p = tripPlaces([uk, munich], "2026-11-26", "Kirill");
    expect(p.filter((x) => x.kind === "country").map((x) => x.country)).toEqual(["GB"]);
    expect(p.filter((x) => x.kind === "city").map((x) => [x.name, x.lat])).toEqual([
      ["London", 51.5],
      ["Edinburgh", 55.95],
      ["Glasgow", undefined], // no stop with a place that day: counted, no dot
    ]);
    expect(p.every((x) => x.fromTrip)).toBe(true);
  });

  it("counts a trip only for the people on it", () => {
    expect(tripPlaces([uk], "2026-11-26", "Tanya")).toEqual([]);
    expect(tripPlaces([uk], "2026-11-26", "kirill").length).toBeGreaterThan(0); // first names, any case
  });

  it("doesn't count a trip that hasn't ended", () => {
    expect(tripPlaces([munich], "2026-11-26", "Kirill")).toEqual([]);
  });
});

describe("beenBy", () => {
  const logged: Place[] = [
    { id: "1", userId: "k", kind: "country", country: "PT", name: "Portugal" },
    { id: "2", userId: "k", kind: "city", country: "PT", name: "Porto", lat: 41.15, lng: -8.61 },
    { id: "3", userId: "k", kind: "city", country: "GB", name: "London" }, // also from a trip: kept once, the logged copy first
    { id: "4", userId: "t", kind: "country", country: "FR", name: "France" },
  ];

  it("joins what someone logged with their ended trips, once each", () => {
    const b = beenBy("k", logged, tripPlaces([uk], "2026-11-26", "Kirill"));
    expect([...b.countries].sort()).toEqual(["GB", "PT"]);
    expect(b.cities.map((c) => c.name).sort()).toEqual(["Edinburgh", "Glasgow", "London", "Porto"]);
  });

  it("a city's country counts even if the country itself wasn't logged", () => {
    const b = beenBy("k", [{ userId: "k", kind: "city", country: "JP", name: "Kyoto" }], []);
    expect([...b.countries]).toEqual(["JP"]);
  });

  it("keeps each person's places to themselves", () => {
    expect([...beenBy("t", logged, []).countries]).toEqual(["FR"]);
  });
});

describe("beenShading", () => {
  it("shades a country by how many of the people shown have been", () => {
    const a = { countries: new Set(["GB", "PT"]), cities: [] };
    const b = { countries: new Set(["GB", "FR"]), cities: [] };
    expect(beenShading([a, b])).toEqual({ GB: 2, PT: 1, FR: 1 });
  });
});
