import { describe, expect, it } from "vitest";
import { applyOps, type Op } from "./ops";
import type { Trip } from "./types";

const trip: Trip = {
  id: "t",
  name: "T",
  stage: "planning",
  startDate: "2026-12-21",
  endDate: "2026-12-21",
  timezone: "Europe/Berlin",
  currency: "EUR",
  people: [],
  bookings: [],
  budget: [],
  spare: [],
  days: [
    {
      id: "d",
      date: "2026-12-21",
      title: "",
      city: "munich",
      place: "Munich",
      rain: [],
      stops: [
        { id: "a", time: "10:00", name: "A", kind: "normal" },
        { id: "b", time: "12:00", name: "B", kind: "normal", pickOne: true, options: [{ id: "o1", name: "X" }] },
      ],
    },
  ],
};

const op = (p: Partial<Op> & Pick<Op, "stopId" | "patch">): Op => ({ id: crypto.randomUUID(), tripId: "t", at: 1, ...p }) as Op;

describe("applyOps", () => {
  it("patches stops by id and leaves the snapshot untouched", () => {
    const out = applyOps(trip, [op({ stopId: "a", patch: { time: "10:15" } }), op({ stopId: "b", patch: { pickedOptionId: "o1" } })]);
    expect(out.days[0].stops[0].time).toBe("10:15");
    expect(out.days[0].stops[1].pickedOptionId).toBe("o1");
    expect(trip.days[0].stops[0].time).toBe("10:00");
  });

  it("applies later edits over earlier ones", () => {
    const out = applyOps(trip, [
      op({ stopId: "a", patch: { time: "10:15" }, at: 1 }),
      op({ stopId: "a", patch: { time: "10:30" }, at: 2 }),
    ]);
    expect(out.days[0].stops[0].time).toBe("10:30");
  });

  it("ignores edits to stops that no longer exist", () => {
    const out = applyOps(trip, [op({ stopId: "gone", patch: { time: "09:00" } })]);
    expect(out.days[0].stops.map((s) => s.time)).toEqual(["10:00", "12:00"]);
  });

  it("keeps the day in time order after a move", () => {
    const out = applyOps(trip, [op({ stopId: "a", patch: { time: "13:00" } })]);
    expect(out.days[0].stops.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("keeps a stop moved past midnight at the end of the day", () => {
    const out = applyOps(trip, [op({ stopId: "a", patch: { time: "00:30" } })]);
    expect(out.days[0].stops.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("only applies ops for this trip", () => {
    const out = applyOps(trip, [op({ tripId: "other", stopId: "a", patch: { time: "11:00" } })]);
    expect(out.days[0].stops[0].time).toBe("10:00");
  });
});
