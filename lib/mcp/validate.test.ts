import { describe, expect, it } from "vitest";
import { DAY_TITLE_MAX, validateDays, validateStops, type TripContext } from "./validate";

const ctx: TripContext = {
  tripId: "t1",
  startDate: "2026-12-21",
  endDate: "2026-12-25",
  days: new Map([
    ["2026-12-21", "d21"],
    ["2026-12-22", "d22"],
  ]),
  bookingIds: new Set(["b1"]),
  stopIds: new Set(["s-existing"]),
};

describe("validateStops", () => {
  it("turns a valid stop into a row on the right day, with option ids", () => {
    const { rows, errors } = validateStops(
      [{ date: "2026-12-21", time: "10:15", name: "Land at MUC", kind: "fixed", booking_id: "b1", pick_one: true,
         options: [{ name: "S-Bahn" }, { name: "Taxi" }] }],
      ctx,
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ trip_id: "t1", day_id: "d21", time: "10:15", kind: "fixed", booking_id: "b1", pick_one: true });
    expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(rows[0].options.map((o) => o.id)).toHaveLength(2);
    expect(new Set(rows[0].options.map((o) => o.id)).size).toBe(2);
  });

  it("keeps the id of a stop being updated", () => {
    const { rows, errors } = validateStops([{ id: "s-existing", date: "2026-12-22", time: "09:00", name: "Breakfast" }], ctx);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ id: "s-existing", day_id: "d22" });
  });

  it("rejects what would break the plan, naming the stop", () => {
    const { errors } = validateStops(
      [
        { date: "2026-12-26", time: "10:00", name: "After the trip" },
        { date: "2026-12-21", time: "25:00", name: "Bad time" },
        { date: "2026-12-21", time: "11:00", name: "Ghost booking", booking_id: "nope" },
        { id: "other-trip-stop", date: "2026-12-21", time: "12:00", name: "Hijack" },
        { date: "2026-12-21", time: "13:00", name: "Lonely pick", pick_one: true, options: [{ name: "Only one" }] },
        { date: "2026-12-21", time: "14:00", name: "Teleport", go: { mode: "walk", min: 0 } },
      ],
      ctx,
    );
    expect(errors).toEqual([
      expect.stringContaining('"After the trip": no day 2026-12-26'),
      expect.stringContaining('"Bad time": time must be HH:MM'),
      expect.stringContaining('"Ghost booking": booking nope is not in this trip'),
      expect.stringContaining('"Hijack": stop other-trip-stop is not in this trip'),
      expect.stringContaining('"Lonely pick": "pick one" needs at least 2 options'),
      expect.stringContaining('"Teleport": travel minutes must be 1 or more'),
    ]);
  });
});

describe("validateDays", () => {
  it("accepts days inside the trip and keeps existing day ids", () => {
    const { rows, errors } = validateDays([{ date: "2026-12-22", title: "City", rain: ["Deutsches Museum"] }], ctx);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ id: "d22", trip_id: "t1", date: "2026-12-22", title: "City", rain: ["Deutsches Museum"] });
  });

  it("rejects days outside the trip and long titles", () => {
    const { errors } = validateDays(
      [{ date: "2026-12-20", title: "Too early" }, { date: "2026-12-23", title: "x".repeat(DAY_TITLE_MAX + 1) }],
      ctx,
    );
    expect(errors).toEqual([
      expect.stringContaining("2026-12-20 is outside the trip (2026-12-21 to 2026-12-25)"),
      expect.stringContaining(`title is over ${DAY_TITLE_MAX} characters`),
    ]);
  });
});
