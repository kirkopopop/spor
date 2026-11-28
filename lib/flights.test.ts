import { describe, expect, it } from "vitest";
import {
  connections,
  distanceKm,
  duration,
  estimatedMinutes,
  flightPlaces,
  homeCountry,
  parseAirTime,
  searchAirports,
  travelStats,
  airlineCounts,
  travelYears,
  type Airport,
  type Flight,
} from "./flights";
import type { Trip } from "./types";

const f = (id: string, date: string, from: string, to: string, fromCountry: string, toCountry: string, km: number, minutes?: number): Flight => ({
  id, userId: "k", date, from, to, fromCountry, toCountry, km, minutes,
});

// Copenhagen → London and back in 2026; Copenhagen → New York via Frankfurt in 2025.
const flights = [
  f("1", "2026-11-19", "CPH", "LHR", "DK", "GB", 955, 115),
  f("2", "2026-11-22", "EDI", "CPH", "GB", "DK", 860),
  f("3", "2025-06-01", "CPH", "FRA", "DK", "DE", 677),
  f("4", "2025-06-01", "FRA", "JFK", "DE", "US", 6204, 520),
  f("5", "2025-06-10", "JFK", "CPH", "US", "DK", 6190, 470),
];

const trip = (name: string, start: string, end: string, people: string[], lat: number, lng: number): Trip => ({
  id: name, name, stage: "memory", startDate: start, endDate: end, timezone: "Europe/Berlin", currency: "EUR", people,
  bookings: [], budget: [], spare: [],
  days: [{ id: `${name}-d`, date: start, title: "", city: name.toLowerCase(), place: name, rain: [], stops: [{ id: `${name}-s`, time: "10:00", name: "x", kind: "normal", lat, lng }] }],
});
const munich = trip("Munich", "2026-03-01", "2026-03-04", ["Kirill"], 48.14, 11.58);

describe("distance and time", () => {
  it("measures the great circle between two airports", () => {
    expect(distanceKm([55.618, 12.656], [51.471, -0.46])).toBe(979); // CPH → LHR, about 980 km
    expect(distanceKm([1, 1], [1, 1])).toBe(0);
  });

  it("estimates air time from distance, to five minutes", () => {
    expect(estimatedMinutes(955)).toBe(100);
    expect(estimatedMinutes(0)).toBe(30);
  });

  it("writes durations short", () => {
    expect(duration(115)).toBe("1h 55m");
    expect(duration(45)).toBe("45m");
    expect(duration(120)).toBe("2h");
    expect(duration(18_725)).toBe("312h");
  });

  it("reads air time as h:mm or minutes", () => {
    expect(parseAirTime("1:55")).toBe(115);
    expect(parseAirTime("1h 55")).toBe(115);
    expect(parseAirTime("95")).toBe(95);
    expect(parseAirTime("1:75")).toBeUndefined();
    expect(parseAirTime("")).toBeUndefined();
  });
});

describe("where a person went", () => {
  it("treats a flight flown on from within a day as a connection", () => {
    expect([...connections(flights)]).toEqual(["3"]);
  });

  it("keeps connections apart per person", () => {
    const tanya = { ...flights[3], id: "t", userId: "t" };
    expect(connections([flights[2], tanya]).size).toBe(0);
  });

  it("counts the countries flown to, not through", () => {
    expect(flightPlaces(flights).map((p) => p.country)).toEqual(["GB", "DK", "US"]);
  });

  it("finds home as where most flights leave from", () => {
    expect(homeCountry(flights)).toBe("DK");
    expect(homeCountry([])).toBeUndefined();
  });
});

describe("travelStats", () => {
  const base = { flights, trips: [munich], today: "2026-11-28", personName: "Kirill", beenCountries: new Set(["DK", "GB", "US", "DE", "FR"]) };

  it("overall: every country been, every flight", () => {
    const s = travelStats(base);
    expect(s).toMatchObject({ countries: 5, flights: 5, km: 14_886, estimated: true });
    expect(s.minutes).toBe(115 + estimatedMinutes(860) + estimatedMinutes(677) + 520 + 470);
    expect(s.longest?.id).toBe("4");
  });

  it("a year: trips that year and countries flown to, without home or connections", () => {
    expect(travelStats({ ...base, year: "2026" })).toMatchObject({ countries: 2, flights: 2, km: 1815 }); // GB, DE (Munich)
    expect(travelStats({ ...base, year: "2025" })).toMatchObject({ countries: 1, flights: 3, estimated: true }); // US only: FRA was a connection
  });

  it("a year with nothing", () => {
    expect(travelStats({ ...base, year: "2019" })).toMatchObject({ countries: 0, flights: 0, km: 0, minutes: 0, estimated: false, longest: undefined });
  });

  it("lists years with flights or ended trips, newest first", () => {
    expect(travelYears(flights, [munich], "2026-11-28", "Kirill")).toEqual(["2026", "2025"]);
    expect(travelYears([], [munich], "2026-11-28", "Tanya")).toEqual([]);
  });
});

describe("searchAirports", () => {
  const all: Airport[] = [
    ["CPH", "Copenhagen Kastrup Airport", "Copenhagen", "DK", 55.6, 12.6],
    ["LHR", "London Heathrow Airport", "London", "GB", 51.5, -0.5],
    ["LGW", "London Gatwick Airport", "London", "GB", 51.1, -0.2],
    ["CGN", "Cologne Bonn Airport", "Cologne", "DE", 50.9, 7.1],
  ];
  it("finds by code first, then city, then name", () => {
    expect(searchAirports(all, "lhr").map((a) => a[0])).toEqual(["LHR"]);
    expect(searchAirports(all, "lon").map((a) => a[0])).toEqual(["LHR", "LGW"]);
    expect(searchAirports(all, "kastrup").map((a) => a[0])).toEqual(["CPH"]);
    expect(searchAirports(all, " ")).toEqual([]);
  });
});

describe("airlineCounts", () => {
  const f = (id: string, airline?: string) => ({ id, date: "2026-01-01", from: "CPH", to: "LHR", fromCountry: "DK", toCountry: "GB", km: 960, airline });
  it("groups ignoring case, keeps the usual spelling, most flown first, skips blanks", () => {
    expect(airlineCounts([f("1", "SAS"), f("2", "sas"), f("3", "SAS"), f("4", "Norwegian"), f("5"), f("6", " ")])).toEqual([
      ["SAS", 3],
      ["Norwegian", 1],
    ]);
  });
});
