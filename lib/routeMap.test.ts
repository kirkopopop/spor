import { describe, expect, it } from "vitest";
import { projectRoutes } from "./routeMap";
import type { Trip } from "./types";

const trip = (id: string, pts: [number, number][]): Trip =>
  ({
    id,
    days: [{ id: "d", date: "2026-01-01", title: "", city: "", place: "", rain: [], stops: pts.map(([lat, lng], i) => ({ id: `${id}${i}`, time: "10:00", name: "x", kind: "normal", lat, lng })) }],
  }) as unknown as Trip;

describe("projectRoutes", () => {
  it("fits every mapped stop inside the box, north up", () => {
    const { routes } = projectRoutes([trip("uk", [[51.5, -0.1], [55.95, -3.19]]), trip("de", [[48.14, 11.58]])], 350, 170, 20);
    const all = routes.flatMap((r) => r.points);
    for (const [x, y] of all) {
      expect(x).toBeGreaterThanOrEqual(20);
      expect(x).toBeLessThanOrEqual(330);
      expect(y).toBeGreaterThanOrEqual(20);
      expect(y).toBeLessThanOrEqual(150);
    }
    const [london, edinburgh] = routes[0].points;
    expect(edinburgh[1]).toBeLessThan(london[1]); // further north is higher up
    expect(routes[1].points[0][0]).toBeGreaterThan(london[0]); // Munich is east of London
  });

  it("skips trips and stops without coordinates", () => {
    const empty = { ...trip("x", []), days: [{ id: "d", date: "", title: "", city: "", place: "", rain: [], stops: [{ id: "s", time: "10:00", name: "x", kind: "normal" }] }] } as Trip;
    expect(projectRoutes([empty], 350, 170, 20).routes).toEqual([]);
  });
});
