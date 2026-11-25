import { describe, expect, it } from "vitest";
import { rowsToTrip, type TripRow } from "./db";

const row: TripRow = {
  id: "t1",
  household_id: "h",
  name: "Munich",
  stage: "planning",
  start_date: "2026-12-21",
  end_date: "2026-12-22",
  timezone: "Europe/Berlin",
  currency: "EUR",
  people: ["Kirill", "Tanya"],
  summary: null,
  days: [
    { id: "d2", trip_id: "t1", date: "2026-12-22", title: "City", city: "munich", place: "Munich", intro: null, rain: [] },
    { id: "d1", trip_id: "t1", date: "2026-12-21", title: "Arrive", city: "munich", place: "Munich", intro: "Hi", rain: ["Museum"] },
  ],
  stops: [
    { id: "s2", trip_id: "t1", day_id: "d1", time: "00:30", approx: true, name: "Late", kind: "optional", body: null, more: null,
      lat: null, lng: null, maps_query: null, go: null, journey: null, off_map: false, who: null, fee: null, booking_id: null,
      options: [], pick_one: false, picked_option_id: null, done_at: null, sort: 2 },
    { id: "s1", trip_id: "t1", day_id: "d1", time: "10:15", approx: false, name: "Land", kind: "fixed", body: "SAS", more: null,
      lat: 48.35, lng: 11.78, maps_query: "MUC", go: { mode: "plane", min: 90 }, journey: "plane", off_map: true, who: null,
      fee: { label: "paid", paid: true }, booking_id: "b1", options: [{ id: "o1", name: "A" }], pick_one: true,
      picked_option_id: "o1", done_at: "2026-12-21T10:20:00Z", sort: 1 },
  ],
  bookings: [{ id: "b1", trip_id: "t1", title: "Flights", note: null, status: "booked", est_cost: "380.00", sort: 0 }],
  budget_lines: [{ id: "x", trip_id: "t1", category: "stay", label: "Stay", planned: "720.00" }],
  spare_ideas: [{ id: "i1", trip_id: "t1", name: "Deutsches Museum", city: "munich", area: null, note: null, indoor: true,
    minutes: 120, lat: null, lng: null, maps_query: null }],
};

describe("rowsToTrip", () => {
  const trip = rowsToTrip(row);

  it("orders days by date and stops by time within the day, late night last", () => {
    expect(trip.days.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(trip.days[0].stops.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(trip.days[1].stops).toEqual([]);
  });

  it("maps columns to the app's names and drops nulls", () => {
    const s = trip.days[0].stops[0];
    expect(s).toEqual({
      id: "s1", time: "10:15", name: "Land", kind: "fixed", body: "SAS", lat: 48.35, lng: 11.78, mapsQuery: "MUC",
      go: { mode: "plane", min: 90 }, journey: "plane", offMap: true, fee: { label: "paid", paid: true },
      bookingId: "b1", options: [{ id: "o1", name: "A" }], pickOne: true, pickedOptionId: "o1", doneAt: "2026-12-21T10:20:00Z",
    });
    expect(trip.days[0].stops[1]).toMatchObject({ approx: true, kind: "optional" });
    expect(trip.days[0].stops[1]).not.toHaveProperty("options");
    expect(trip.days[1]).not.toHaveProperty("intro");
  });

  it("turns Postgres numerics into numbers", () => {
    expect(trip.bookings[0]).toEqual({ id: "b1", title: "Flights", status: "booked", estCost: 380 });
    expect(trip.budget[0].planned).toBe(720);
  });

  it("carries the trip fields", () => {
    expect(trip).toMatchObject({ id: "t1", name: "Munich", stage: "planning", startDate: "2026-12-21", timezone: "Europe/Berlin" });
    expect(trip.spare[0]).toMatchObject({ name: "Deutsches Museum", indoor: true, minutes: 120 });
  });

  it("carries the revision, notes (newest first) and expenses", () => {
    const t = rowsToTrip({
      ...row,
      revision: 7,
      notes: [
        { id: "n1", trip_id: "t1", stop_id: null, day_id: "d1", author: "u1", body: "Older", created_at: "2026-12-01T10:00:00Z" },
        { id: "n2", trip_id: "t1", stop_id: "s1", day_id: null, author: "u2", body: "Newer", created_at: "2026-12-02T10:00:00Z" },
      ],
      expenses: [
        { id: "e1", trip_id: "t1", amount: "12.50", currency: "EUR", category: "food", paid_by: "u1", stop_id: null, note: null, spent_at: "2026-12-21T12:00:00Z" },
      ],
    });
    expect(t.revision).toBe(7);
    expect(t.notes).toEqual([
      { id: "n2", body: "Newer", authorId: "u2", stopId: "s1", createdAt: "2026-12-02T10:00:00Z" },
      { id: "n1", body: "Older", authorId: "u1", dayId: "d1", createdAt: "2026-12-01T10:00:00Z" },
    ]);
    expect(t.expenses).toEqual([
      { id: "e1", amount: 12.5, currency: "EUR", category: "food", paidBy: "u1", spentAt: "2026-12-21T12:00:00Z" },
    ]);
  });

  it("keeps an explicit false, e.g. an outdoor idea", () => {
    const outdoor = rowsToTrip({ ...row, spare_ideas: [{ ...row.spare_ideas[0], indoor: false }] });
    expect(outdoor.spare[0].indoor).toBe(false);
  });
});
