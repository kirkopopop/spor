import { describe, expect, it } from "vitest";
import { applyLegs, legFromOsrm, legKey, walkRequests, type Leg } from "./walkLegs";
import { dayRoutes } from "./tripView";
import type { Day } from "./types";

const day: Day = {
  id: "d", date: "2026-12-22", title: "", city: "munich", place: "Munich", rain: [],
  stops: [
    { id: "a", time: "08:00", name: "Hotel", kind: "normal", lat: 48.1, lng: 11.5 },
    { id: "b", time: "09:00", name: "Bakery", kind: "normal", lat: 48.11, lng: 11.51, go: { mode: "walk", min: 10, est: true } },
    { id: "c", time: "10:00", name: "Train", kind: "fixed", journey: "train", offMap: true, go: { mode: "walk", min: 5 } },
    { id: "d", time: "12:00", name: "Museum", kind: "fixed", lat: 48.13, lng: 11.58, go: { mode: "walk", min: 15 } },
    { id: "e", time: "14:00", name: "Lunch", kind: "normal", lat: 48.14, lng: 11.57, go: { mode: "tube", min: 12 } },
  ],
};

const leg: Leg = { points: [[48.1, 11.5], [48.105, 11.506], [48.11, 11.51]], min: 7, meters: 520 };

describe("walkRequests", () => {
  it("routes only walking legs between two stops that are both on the map, in order", () => {
    const reqs = walkRequests(day);
    // b: walk from a. c: off the map. d: the stop before it (the train) has no place. e: tube.
    expect(reqs.map((r) => r.stopId)).toEqual(["b"]);
    expect(reqs[0]).toMatchObject({ from: [48.1, 11.5], to: [48.11, 11.51] });
  });

  it("keys a leg by its two ends, so the same walk is fetched once", () => {
    expect(legKey([48.1, 11.5], [48.11, 11.51])).toBe(legKey([48.100001, 11.5], [48.11, 11.510002]));
    expect(legKey([48.1, 11.5], [48.11, 11.51])).not.toBe(legKey([48.11, 11.51], [48.1, 11.5]));
  });
});

describe("applyLegs", () => {
  it("replaces Claude's estimate with the routed minutes and drops the ~", () => {
    const out = applyLegs(day, new Map([["b", leg]]));
    expect(out.stops[1].go).toEqual({ mode: "walk", min: 7, est: false });
    expect(out.stops[3].go?.min).toBe(15); // untouched
  });

  it("returns the same day when nothing was routed, so memoised views stay put", () => {
    expect(applyLegs(day, new Map())).toBe(day);
  });
});

describe("legFromOsrm", () => {
  it("reads geometry as lat,lng and rounds the walk to whole minutes", () => {
    const res = { code: "Ok", routes: [{ duration: 317.3, distance: 394.1, geometry: { coordinates: [[11.5, 48.1], [11.51, 48.11]] as [number, number][] } }] };
    expect(legFromOsrm(res)).toEqual({ points: [[48.1, 11.5], [48.11, 11.51]], min: 5, meters: 394 });
  });

  it("gives nothing for an unroutable answer", () => {
    expect(legFromOsrm({ code: "NoRoute", routes: [] })).toBeUndefined();
  });
});

describe("dayRoutes with walking legs", () => {
  it("draws a routed walk along its path, other legs as order dashes, the active leg solid", () => {
    const routes = dayRoutes(day, "e", new Map([["b", leg]]));
    expect(routes.map((r) => [r.id, r.style, r.points.length])).toEqual([
      ["d-b", "path", 3],
      ["d-d", "dashed", 2], // b → d across the train
      ["d-e", "solid", 2],
    ]);
  });

  it("without legs, every connection is a dash", () => {
    expect(dayRoutes(day).every((r) => r.style === "dashed")).toBe(true);
  });
});
