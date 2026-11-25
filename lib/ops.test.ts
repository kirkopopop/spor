import { describe, expect, it } from "vitest";
import { applyOps, opToRpc, type Op, type StopPatch } from "./ops";
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

const op = (p: { stopId: string; patch: StopPatch; tripId?: string; at?: number }): Op => ({
  id: crypto.randomUUID(),
  tripId: "t",
  at: 1,
  kind: "stop.patch",
  ...p,
});

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

  it("unticks with null, which survives being sent as JSON", () => {
    const ticked = applyOps(trip, [op({ stopId: "a", patch: { doneAt: "2026-12-21T10:00:00Z" }, at: 1 })]);
    const unticked = applyOps(ticked, [op({ stopId: "a", patch: { doneAt: null }, at: 2 })]);
    expect(unticked.days[0].stops[0].doneAt).toBeNull();
    expect(JSON.parse(JSON.stringify(opToRpc(op({ stopId: "a", patch: { doneAt: null } })))).p_payload).toEqual({ doneAt: null });
  });

  it("treats queued edits from before kinds existed as stop patches", () => {
    const legacy = { id: "x", tripId: "t", at: 1, stopId: "a", patch: { time: "10:45" } } as unknown as Op;
    expect(applyOps(trip, [legacy]).days[0].stops[0].time).toBe("10:45");
  });
});

const two: Trip = {
  ...trip,
  days: [
    trip.days[0],
    { id: "d2", date: "2026-12-22", title: "", city: "munich", place: "Munich", rain: [], stops: [] },
  ],
};
const base = (p: Record<string, unknown>) => ({ id: crypto.randomUUID(), tripId: "t", at: 1, ...p }) as Op;

describe("applyOps: stops added, edited and removed in the app", () => {
  it("adds a new stop to its day in time order", () => {
    const out = applyOps(two, [base({ kind: "stop.upsert", stop: { id: "n", dayId: "d", time: "11:00", name: "Coffee", kind: "optional" } })]);
    expect(out.days[0].stops.map((s) => s.id)).toEqual(["a", "n", "b"]);
    expect(out.days[0].stops[1]).toMatchObject({ name: "Coffee", kind: "optional" });
  });

  it("edits a stop in place and keeps the fields the form doesn't touch", () => {
    const out = applyOps(two, [base({ kind: "stop.upsert", stop: { id: "b", dayId: "d", time: "12:30", name: "Lunch", kind: "normal" } })]);
    expect(out.days[0].stops[1]).toMatchObject({ id: "b", time: "12:30", name: "Lunch", pickOne: true });
    expect(out.days[0].stops[1].options).toHaveLength(1);
  });

  it("moves a stop to another day", () => {
    const out = applyOps(two, [base({ kind: "stop.upsert", stop: { id: "a", dayId: "d2", time: "09:00", name: "A", kind: "normal" } })]);
    expect(out.days[0].stops.map((s) => s.id)).toEqual(["b"]);
    expect(out.days[1].stops.map((s) => s.id)).toEqual(["a"]);
  });

  it("removes a deleted stop", () => {
    const out = applyOps(two, [base({ kind: "stop.delete", stopId: "a" })]);
    expect(out.days[0].stops.map((s) => s.id)).toEqual(["b"]);
  });
});

describe("applyOps: notes and expenses", () => {
  const note = { id: "n1", body: "Skip the museum?", dayId: "d", createdAt: "2026-12-21T09:00:00Z" };
  const expense = { id: "e1", amount: 12.5, currency: "EUR", category: "food", spentAt: "2026-12-21T12:00:00Z" };

  it("adds notes and expenses once, even if the server already has them", () => {
    const withServer = { ...two, notes: [note] };
    const out = applyOps(withServer, [base({ kind: "note.add", note }), base({ kind: "expense.add", expense })]);
    expect(out.notes).toEqual([note]);
    expect(out.expenses).toEqual([expense]);
  });

  it("deletes notes and expenses", () => {
    const out = applyOps({ ...two, notes: [note], expenses: [expense] as Trip["expenses"] }, [
      base({ kind: "note.delete", noteId: "n1" }),
      base({ kind: "expense.delete", expenseId: "e1" }),
    ]);
    expect(out.notes).toEqual([]);
    expect(out.expenses).toEqual([]);
  });
});

describe("opToRpc", () => {
  it("maps each edit to the database's apply_op arguments", () => {
    const o = base({ kind: "stop.upsert", stop: { id: "s", dayId: "d", time: "10:00", name: "X", kind: "fixed" } });
    expect(opToRpc(o)).toEqual({
      p_op_id: o.id, p_trip_id: "t", p_kind: "stop.upsert", p_target: "s",
      p_payload: { dayId: "d", time: "10:00", name: "X", kind: "fixed" },
    });
    const p = op({ stopId: "a", patch: { doneAt: "2026-12-21T10:00:00Z" } });
    expect(opToRpc(p)).toMatchObject({ p_kind: "stop.patch", p_target: "a", p_payload: { doneAt: "2026-12-21T10:00:00Z" } });
  });
});
