import { describe, expect, it } from "vitest";
import { byContinent, continentOf } from "./continents";
import { highlights, latitude, population, type CityRef } from "./highlights";

const refs: CityRef[] = [
  ["København", "DK", 55.68, 12.56, 1085000, 1, "Kobenhavn|Copenhagen"],
  ["Århus", "DK", 56.16, 10.21, 237551, 0, "Aarhus|Arhus"],
  ["Istanbul", "TR", 41.11, 29.01, 10061000, 0, ""],
  ["London", "GB", 51.5, -0.12, 8567000, 1, ""],
  ["London", "CA", 42.97, -81.25, 346765, 0, ""],
  ["Svendborg", "DK", 55.07, 10.62, 29180, 0, ""],
];
const home: [number, number] = [55.62, 12.65]; // CPH

describe("highlights", () => {
  it("finds the extremes among the cities matched by name, in any spelling, in their country", () => {
    const h = highlights(
      [
        { name: "Copenhagen", country: "DK" },
        { name: "Aarhus", country: "DK" },
        { name: "Istanbul", country: "TR" },
        { name: "London", country: "GB" },
      ],
      refs,
      home,
    );
    expect(h).toEqual([
      { kind: "north", city: "Aarhus", country: "DK", lat: 56.16 },
      { kind: "south", city: "Istanbul", country: "TR", lat: 41.11 },
      { kind: "biggest", city: "Istanbul", country: "TR", population: 10061000 },
      { kind: "smallest", city: "Aarhus", country: "DK", population: 237551 },
      { kind: "farthest", city: "Istanbul", country: "TR", km: 2005 },
      { kind: "capitals", count: 2, names: ["Copenhagen", "London"] },
    ]);
  });

  it("uses a city's own dot, and leaves out what it can't size or place", () => {
    const h = highlights(
      [
        { name: "Maranello", country: "IT", lat: 44.53, lng: 10.86 }, // not in the reference: placed, not sized
        { name: "Svendborg", country: "DK" },
      ],
      refs,
    );
    expect(h.map((x) => x.kind)).toEqual(["north", "south"]); // one sized city is no biggest/smallest; no home, no farthest
    expect(h[1]).toMatchObject({ city: "Maranello", lat: 44.53 });
  });

  it("doesn't take a namesake from another country, or count a capital twice", () => {
    const h = highlights(
      [
        { name: "London", country: "CA" },
        { name: "Copenhagen", country: "DK" },
        { name: "København", country: "DK" },
      ],
      refs,
    );
    expect(h.find((x) => x.kind === "smallest")).toMatchObject({ city: "London", population: 346765 });
    expect(h.find((x) => x.kind === "capitals")).toEqual({ kind: "capitals", count: 1, names: ["Copenhagen"] });
  });

  it("says nothing for a single city", () => {
    expect(highlights([{ name: "Copenhagen", country: "DK" }], refs, home).map((x) => x.kind)).toEqual(["capitals"]);
  });
});

describe("formatting", () => {
  it("reads populations and latitudes", () => {
    expect([population(8567000), population(35676000), population(237551), population(2500)]).toEqual(["8.6 million", "36 million", "238,000", "2,500"]);
    expect([latitude(55.68), latitude(-54.93)]).toEqual(["55.7° N", "54.9° S"]);
  });
});

describe("continents", () => {
  it("groups countries by continent, in a fixed order", () => {
    expect(continentOf("DK")).toBe("Europe");
    expect(continentOf("TR")).toBe("Asia");
    expect(continentOf("MU")).toBe("Africa"); // an island Natural Earth files under the open ocean
    expect(byContinent(["JP", "DK", "BR", "GB"])).toEqual([
      { continent: "Europe", countries: ["DK", "GB"] },
      { continent: "Asia", countries: ["JP"] },
      { continent: "South America", countries: ["BR"] },
    ]);
  });
});
