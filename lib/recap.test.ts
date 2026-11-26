import { describe, expect, it } from "vitest";
import { recap, recapMap } from "./recap";
import type { Trip } from "./types";
import type { Leg } from "./walkLegs";

const trip: Trip = {
  id: "t", name: "London", stage: "memory", startDate: "2026-11-19", endDate: "2026-11-20", timezone: "Europe/London",
  currency: "GBP", people: ["Kirill"], bookings: [], spare: [],
  budget: [{ category: "food", label: "Food", planned: 100 }],
  expenses: [
    { id: "e1", amount: 30, currency: "GBP", category: "food", spentAt: "2026-11-19T12:00:00Z" },
    { id: "e2", amount: 12.5, currency: "GBP", category: "transport", spentAt: "2026-11-20T09:00:00Z" },
  ],
  notes: [
    { id: "n2", body: "Second", createdAt: "2026-11-20T10:00:00Z" },
    { id: "n1", body: "First", createdAt: "2026-11-19T10:00:00Z" },
  ],
  days: [
    {
      id: "d1", date: "2026-11-19", title: "Arrive", city: "london", place: "London", rain: [],
      stops: [
        { id: "a", time: "08:00", name: "Gatwick", kind: "fixed", lat: 51.15, lng: -0.18, doneAt: "2026-11-19T08:05:00Z" },
        { id: "b", time: "09:00", name: "Train", kind: "fixed", journey: "train", offMap: true, doneAt: "2026-11-19T09:00:00Z" },
        { id: "c", time: "10:00", name: "Hotel", kind: "normal", lat: 51.5, lng: -0.07, go: { mode: "walk", min: 10 }, doneAt: "2026-11-19T10:10:00Z" },
        { id: "d", time: "12:00", name: "Market", kind: "normal", lat: 51.505, lng: -0.09, go: { mode: "walk", min: 20 }, doneAt: "2026-11-19T12:30:00Z" },
        { id: "e", time: "15:00", name: "Museum", kind: "optional", lat: 51.52, lng: -0.11 },
      ],
    },
    {
      id: "d2", date: "2026-11-20", title: "Glasgow", city: "glasgow", place: "Glasgow", rain: [],
      stops: [{ id: "f", time: "10:00", name: "Necropolis", kind: "normal", lat: 55.86, lng: -4.23 }],
    },
  ],
};

const legs = new Map<string, Leg>([["d", { points: [[51.5, -0.07], [51.505, -0.09]], min: 18, meters: 1450 }]]);

describe("recap", () => {
  it("counts what happened from the ticks: places, walking, cities, spend", () => {
    const r = recap(trip, legs);
    expect(r.recordedDays).toBe(1);
    expect(r.fromPlan).toBe(1);
    // Day 1: Gatwick, Hotel, Market ticked (the train is a journey, not a place). Day 2 wasn't
    // ticked at all, so its plan stands and Necropolis counts.
    expect(r.visited).toBe(4);
    expect(r.planned).toBe(5);
    expect(r.walkedKm).toBe(1.5); // only routed walks into places you reached
    expect(r.cities).toBe(2);
    expect(r.spent).toBe(42.5);
    expect(r.plannedSpend).toBe(100);
  });

  it("lists the places you didn't reach, only on days someone was ticking", () => {
    expect(recap(trip, legs).missed.map((m) => [m.day.id, m.stops.map((s) => s.name)])).toEqual([["d1", ["Museum"]]]);
  });

  it("reads the notes as a journal, oldest first", () => {
    expect(recap(trip, legs).journal.map((n) => n.body)).toEqual(["First", "Second"]);
  });

  it("when nothing was ticked, the plan stands in for what happened and nothing is 'missed'", () => {
    const untouched = { ...trip, days: trip.days.map((d) => ({ ...d, stops: d.stops.map((s) => ({ ...s, doneAt: null })) })) };
    const r = recap(untouched, legs);
    expect(r.recordedDays).toBe(0);
    expect(r.visited).toBe(5);
    expect(r.missed).toEqual([]);
  });
});

describe("recapMap", () => {
  it("draws each day through the places reached, with one pin per day at its first place", () => {
    const { pins, routes } = recapMap(trip, legs);
    expect(pins.map((p) => [p.id, p.label])).toEqual([["d1", "1"], ["d2", "2"]]); // day 2 from its plan
    expect(routes.map((r) => [r.id, r.style, r.points.length])).toEqual([
      ["d1-c", "dashed", 2], // across the train
      ["d1-d", "path", 2],
    ]);
  });
});
