import { describe, expect, it } from "vitest";
import { cityRank, cleanPlaceName, pickCities, type PhotonFeature } from "./countries";

// Photon's answers (place layers), trimmed to what pickCities reads.
const f = (name: string, type: string, tag: string, countrycode: string, state?: string): PhotonFeature => {
  const [osm_key, osm_value] = tag.split(":");
  return { geometry: { coordinates: [10, 50] }, properties: { name, type, osm_key, osm_value, countrycode, state, country: countrycode } };
};

describe("pickCities", () => {
  it("finds Istanbul, not its finance district or a Somali village", () => {
    const istanbul = [
      f("Finance Center", "city", "boundary:administrative", "TR", "Istanbul"),
      f("Istanboul", "city", "place:village", "SO", "Jubaland"),
      f("Istanbul", "district", "place:city", "TR", "Istanbul"),
      f("Istanbul", "state", "place:province", "TR"),
    ];
    const r = pickCities(istanbul, "Istanbul");
    expect(r[0]).toMatchObject({ name: "Istanbul", country: "TR" });
    expect(r.filter((c) => c.name === "Istanbul" && c.country === "TR")).toHaveLength(1); // the province is the same place
  });

  it("strips Municipality and keeps one Hvidovre", () => {
    const r = pickCities([f("Hvidovre", "district", "place:suburb", "DK"), f("Hvidovre Municipality", "city", "boundary:administrative", "DK")], "Hvidovre");
    expect(r.map((c) => c.name)).toEqual(["Hvidovre"]);
  });

  it("puts Tokyo (a prefecture-level city) before a town with a nearby name", () => {
    const r = pickCities([f("Tokyo", "city", "place:province", "JP"), f("Tokyo", "district", "place:hamlet", "PG"), f("Toyo", "city", "place:town", "JP")], "Tokyo");
    expect(r.map((c) => `${c.name} ${c.country}`)).toEqual(["Tokyo JP", "Tokyo PG", "Toyo JP"]);
  });

  it("ranks cities before villages and drops non-places", () => {
    const r = pickCities(
      [f("London", "city", "place:village", "US"), f("London", "other", "boundary:census", "US"), f("London", "city", "place:city", "GB"), f("London Drive", "street", "highway:residential", "AU")],
      "London",
    );
    expect(r.map((c) => c.country)).toEqual(["GB", "US"]);
  });
});

describe("cityRank", () => {
  it("leaves out regions, localities and states that aren't cities", () => {
    expect(cityRank({ osm_key: "place", osm_value: "region", type: "other" })).toBeUndefined();
    expect(cityRank({ osm_key: "place", osm_value: "locality", type: "locality" })).toBeUndefined();
    expect(cityRank({ osm_key: "place", osm_value: "state", type: "state" })).toBeUndefined();
  });
});

describe("cleanPlaceName", () => {
  it("removes administrative suffixes", () => {
    expect(cleanPlaceName("Hvidovre Municipality")).toBe("Hvidovre");
    expect(cleanPlaceName("Istanbul Metropolitan Municipality")).toBe("Istanbul");
    expect(cleanPlaceName("Paris Metropolitan Area")).toBe("Paris");
    expect(cleanPlaceName("Aarhus Kommune")).toBe("Aarhus");
    expect(cleanPlaceName("City of Edinburgh")).toBe("Edinburgh");
    expect(cleanPlaceName("Mexico City")).toBe("Mexico City");
  });
});
